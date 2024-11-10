// Copyright © 2023 The Things Network Foundation, The Things Industries B.V.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useState, useCallback, useEffect } from 'react'
import yup from '@ttn-lw/lib/yup'
import { Formik, Form, Field } from 'formik' 
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router-dom'
import { LineChart } from '@mui/x-charts/LineChart'
import { axisClasses } from '@mui/x-charts'
import {
  Select,
  OutlinedInput,
  InputLabel,
  MenuItem,
  FormControl,
  Checkbox,
  ListItemText,
} from '@mui/material'

import Breadcrumb from '@ttn-lw/components/breadcrumbs/breadcrumb'
import { useBreadcrumbs } from '@ttn-lw/components/breadcrumbs/context'
import Button from '@ttn-lw/components/button'
import SubmitButton from '@ttn-lw/components/submit-button'

import Require from '@console/lib/components/require'

import style from '@console/views/app/app.styl'

import attachPromise from '@ttn-lw/lib/store/actions/attach-promise'
import useRootClass from '@ttn-lw/lib/hooks/use-root-class'
import sharedMessages from '@ttn-lw/lib/shared-messages'

import { mayViewApplicationEvents } from '@console/lib/feature-checks'

import { getDevicesList } from '@console/store/actions/devices'

const ApplicationDataVisualization = () => {
  const { appId } = useParams()
  const dispatch = useDispatch()
  const [selectedDevices, setSelectedDevices] = useState({})
  const [availableDevices, setAvailableDevices] = useState({})
  const [aggregationOptions, setAggregationOptions] = useState([])
  const [selectedAggregation, setSelectedAggregation] = useState('')
  const [loading, setLoading] = useState(true)

  // ['dev_eui-readingType', '123-temperature']
  const [selectedReadings, setSelectedReadings] = useState([])
  const [selectedTime, setSelectedTime] = useState('1H')
  const [graphData, setGraphData] = useState([])
  const [availableReadingColumns, setAvailableReadingColumns] = useState({})
  const ITEM_HEIGHT = 48
  const ITEM_PADDING_TOP = 8
  const MenuProps = {
    PaperProps: {
      style: {
        maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
        width: 250,
      },
    },
  }
  const serverDataEndpoint = process.env.FLASK_DATA_ENDPOINT
  const serverDeviceEndpoint = process.env.FLASK_DEVICE_ENDPOINT
  const timesOptions = ['1H', '24H', '7D', '14D', '30D', '6M', '1Y', 'ALL']

  const aggregationOptionsMap = {
    '1H': ['None'],
    '24H': ['None', '1 Hour'],
    '7D': ['None', '1 Hour', '1 Day'],
    '14D': ['None', '1 Hour', '1 Day'],
    '30D': ['None', '1 Hour', '1 Day', '7 Days'],
    '6M': ['1 Day', '7 Days', '1 Month'],
    '1Y': ['1 Day', '7 Days', '1 Month'],
    'ALL': ['1 Day', '7 Days', '1 Month', '6 Months'],
  }

  const defaultAggregationValues = {
    '1H': 'None',
    '24H': 'None',
    '7D': 'None',
    '14D': 'None',
    '30D': 'None',
    '6M': '1 Day',
    '1Y': '1 Day',
    'ALL': '1 Day'
  }

  const validationSchema = yup.object().shape({
    selectedDevices: yup.array().min(1, 'Select at least one device').required(),
    selectedReadings: yup.array()
      .when('selectedDevices', {
        is: selectedDevices => selectedDevices.length > 0,
        then: schema => schema.min(1, 'Select at least one reading').required(),
      }),
  })

  const handleDeviceChange = useCallback(
    event => {
      const {
        target: { value },
      } = event
      if (value.length === 0) setSelectedReadings('')
      const newSelectedDevices = {}
      const newAvailableColumns = {}
      for (const key of value) {
        newSelectedDevices[key] = availableDevices[key].name
        newAvailableColumns[key] = []
        for (const reading of availableDevices[key].readings) {
          newAvailableColumns[key].push({
            payload_value: reading.payload_value,
            display_name: reading.display_name,
          })
        }
      }
      setSelectedDevices(newSelectedDevices)
      setAvailableReadingColumns(newAvailableColumns)
    },
    [availableDevices],
  )

  const handleSelectedReadingChange = useCallback(event => {
    const {
      target: { value },
    } = event
    setSelectedReadings(value)
  }, [])

  const selectTime = (time) => {
    setSelectedTime(time)
    setSelectedAggregation(defaultAggregationValues[time] || '')
  }

  useEffect(() => {
    setAggregationOptions(aggregationOptionsMap[selectedTime] || [])
    setSelectedAggregation(defaultAggregationValues[selectedTime] || '') 
  }, [selectedTime])

  const handleAggregationChange = (event) => {
    setSelectedAggregation(event.target.value)
  }

  useEffect(() => {
    const fetchDeviceType = devices => {
      fetch(serverDeviceEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensor_ids: Object.keys(devices),
        }),
      })
        .then(response => response.json())
        .then(json => {
          const devicesWithType = {}
          for (const deviceKey of Object.keys(devices)) {
            devicesWithType[deviceKey] = {
              name: devices[deviceKey],
              type: json.capabilities[deviceKey].type,
              readings: json.capabilities[deviceKey].readings,
            }
          }
          setAvailableDevices(devicesWithType)
          setLoading(false)
        })
        .catch(error => console.error('Error fetching data:', error))
    }
    const fetchDevices = async () => {
      const devicesNew = await dispatch(
        attachPromise(
          getDevicesList(appId, { page: 1, limit: 100 }, [
            'name',
            'application_server_address',
            'network_server_address',
            'join_server_address',
          ]),
        ),
      )
      const devices = {}
      for (const device of devicesNew.entities) {
        devices[device.ids.dev_eui] = device.ids.device_id
      }
      fetchDeviceType(devices)
    }
    fetchDevices()
  }, [appId, dispatch, serverDeviceEndpoint])

  const fetchData = () => {
    const mappedData = selectedReadings.reduce((acc, column) => {
      const [devEui, attribute] = column.split('-');
  
      if (!acc[devEui]) {
        acc[devEui] = [];
      }
  
      acc[devEui].push(attribute);
  
      return acc;
    }, {});
  
    fetch(serverDataEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: mappedData,
        period: selectedTime,
        aggregation: selectedAggregation // Add selected aggregation option here
      }),
    })
      .then(response => response.json())
      .then(json => {
        // Handle response as before
        const dataset = {};
        json.data.forEach(item => {
          const timestamp = new Date(item.timestamp).getTime();
          const sensorValue = parseFloat(item.value) || null;
  
          if (!dataset[timestamp]) {
            dataset[timestamp] = { timestamp };
          }
  
          dataset[timestamp][`${item.dev_eui}-${item.payload_type}`] = sensorValue;
  
          for (const device of Object.keys(selectedDevices).filter(
            dev_eui => dev_eui !== item.dev_eui,
          )) {
            if (!dataset[timestamp][`${device}-${item.payload_type}`])
              dataset[timestamp][`${device}-${item.payload_type}`] = null;
          }
        });
  
        const datasetArray = Object.values(dataset).sort((a, b) => a.timestamp - b.timestamp);
  
        const series = Object.keys(mappedData).flatMap(deviceId =>
          mappedData[deviceId].map(payloadValue => {
            const column = availableReadingColumns[deviceId].find(
              item => item.payload_value === payloadValue,
            );
            const displayName = column ? column.display_name : payloadValue;
  
            return {
              dataKey: `${deviceId}-${payloadValue}`,
              label: `${selectedDevices[deviceId]} ${displayName}`,
            };
          }),
        );
        setGraphData({ dataset: datasetArray, series });
      })
      .catch(error => console.error('Error fetching data:', error));
  };

  useRootClass(style.stageFlex, 'stage')

  useBreadcrumbs(
    'apps.single.data',
    <Breadcrumb path={`/applications/${appId}/datavis`} content={sharedMessages.dataVis} />,
  )

  return (
    <Require
      featureCheck={mayViewApplicationEvents}
      otherwise={{ redirect: `/applications/${appId}` }}
    >
      <div style={{ marginLeft: '30px' }}>
        <Formik
          initialValues={{
            selectedDevices: Object.keys(selectedDevices),
            selectedReadings: selectedReadings,
          }}
          validationSchema={validationSchema}
          onSubmit={fetchData} 
        >
          {({ setFieldValue, values, errors, touched }) => (
            <Form>
              <div>
                <h3>Devices</h3>
                <FormControl sx={{ width: 300 }}>
                  <InputLabel id="device-select-label">Selected Devices</InputLabel>
                  <Select
                    labelId="device-select-label"
                    id="device-select"
                    multiple
                    value={values.selectedDevices}
                    onChange={event => {
                      const { value } = event.target
                      setFieldValue('selectedDevices', value)
                      handleDeviceChange(event)
                    }}
                    input={<OutlinedInput label="Selected Devices" />}
                    renderValue={() => values.selectedDevices.map(devId => availableDevices[devId]?.name).join(', ')}
                    MenuProps={MenuProps}
                  >
                    {loading ? (
                      <MenuItem disabled>
                        <h1>Loading</h1>
                      </MenuItem>
                    ) : (
                      Object.keys(availableDevices).map(key => (
                        <MenuItem key={key} value={key}>
                          <Checkbox checked={values.selectedDevices.includes(key)} />
                          <ListItemText primary={availableDevices[key].name} secondary={availableDevices[key].type} />
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
                {errors.selectedDevices && touched.selectedDevices &&(
                  <div style={{ color: 'red' }}>{errors.selectedDevices}</div>
                )}
              </div>
  
              <div>
                <h3>Sensor Readings</h3>
                <FormControl sx={{ width: 300 }}>
                  <InputLabel id="sensor-select-label">Selected Reading</InputLabel>
                  <Select
                    labelId="sensor-select-label"
                    id="sensor-select"
                    value={values.selectedReadings}
                    onChange={event => {
                      const { value } = event.target
                      setFieldValue('selectedReadings', value)
                      handleSelectedReadingChange(event) // Keep the current reading change logic
                    }}
                    input={<OutlinedInput label="Selected Devices" />}
                    multiple
                    renderValue={() =>
                      values.selectedReadings
                        .map(payloadValue => {
                          const [, attribute] = payloadValue.split('-')
                          for (const dev_eui in availableReadingColumns) {
                            const reading = availableReadingColumns[dev_eui].find(
                              item => item.payload_value === attribute,
                            )
                            if (reading) return reading.display_name
                          }
                          return attribute
                        })
                        .join(', ')
                    }
                  >
                    {Object.keys(availableReadingColumns).map(dev_eui =>
                      availableReadingColumns[dev_eui].map((item, index) => (
                        <MenuItem key={`${dev_eui}-${index}`} value={`${dev_eui}-${item.payload_value}`}>
                          <Checkbox checked={values.selectedReadings.includes(`${dev_eui}-${item.payload_value}`)} />
                          <ListItemText
                            primary={item.display_name}
                            secondary={availableDevices[dev_eui]?.name}
                          />
                        </MenuItem>
                      )),
                    )}
                  </Select>
                </FormControl>
                {errors.selectedReadings && touched.selectedReadings && (
                  <div style={{ color: 'red' }}>{errors.selectedReadings}</div>
                )}
              </div>
  
              <div style={{ margin: '20px 0px', display: 'flex', gap: '10px' }}>
                {timesOptions.map(time => (
                  <Button
                    key={time}
                    type="button"
                    message={time}
                    className="small"
                    onClick={() => selectTime(time)}
                    primary={selectedTime === time}
                  />
                ))}
              <SubmitButton>
                Fetch Data
              </SubmitButton>
              {selectedTime !== '1H' && (
                <div style={{ marginLeft: '25px', marginTop: '-84px'}}>
                  <h3>Aggregate By</h3>
                  <FormControl sx={{ width: 175 }}>
                    <Select
                      value={selectedAggregation}
                      onChange={handleAggregationChange}
                      displayEmpty
                      renderValue={(selected) => selected || "Select Aggregation"}
                    >
                      {aggregationOptions.map(option => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              )}
              </div>
              </Form>
          )}
        </Formik>
              <div style={{ paddingRight: '50px', paddingTop: '25px' }}>
                {graphData && graphData.dataset && graphData.dataset.length > 0 && (
                  <LineChart
                    dataset={graphData.dataset}
                    xAxis={[{
                      dataKey: 'timestamp',
                      valueFormatter: value => {
                        const date = new Date(value).toLocaleDateString()
                        const time = new Date(value).toLocaleTimeString()
                        return `${date}\n${time}`
                      },
                      scaleType: 'time',
                      label: 'Time',
                      labelStyle: {
                        transform: 'translateY(30px)',
                      },
                    }]}
                    series={graphData.series.map(series => ({
                      ...series,
                      showMark: false,
                      connectNulls: true,
                    }))}
                    width={850}
                    height={450}
                    sx={{
                      [`.${axisClasses.left} .${axisClasses.label}`]: {
                        transform: 'translateX(-30px)',
                      },
                    }}
                  />
                )}
              </div>
      </div>
    </Require>
  )  
}

export default ApplicationDataVisualization