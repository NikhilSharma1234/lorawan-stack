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
import { Formik, Form } from 'formik'
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router-dom'
import { LineChart } from '@mui/x-charts/LineChart'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { axisClasses } from '@mui/x-charts'
import {
  Select,
  OutlinedInput,
  InputLabel,
  MenuItem,
  FormControl,
  Checkbox,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogContent,
  DialogTitle,
  Button as MUIButton,
} from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import ReactGA from 'react-ga4'

import videoFile from '@assets/videos/DataVisualization.mp4'

import Breadcrumb from '@ttn-lw/components/breadcrumbs/breadcrumb'
import { useBreadcrumbs } from '@ttn-lw/components/breadcrumbs/context'
import Button from '@ttn-lw/components/button'
import SubmitButton from '@ttn-lw/components/submit-button'

import Require from '@console/lib/components/require'

import style from '@console/views/app/app.styl'

import yup from '@ttn-lw/lib/yup'
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
  const [toggleView, setToggleView] = useState('dateTimePicker')
  const [selectedAggregation, setSelectedAggregation] = useState('')
  const [loading, setLoading] = useState(true)
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)
  const [openVideo, setOpenVideo] = useState(false)

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
  const serverDataButtonEndpoint = process.env.FLASK_DATA_BUTTON_ENDPOINT
  const serverDeviceEndpoint = process.env.FLASK_DEVICE_ENDPOINT
  const timesOptions = ['1H', '6H', '24H', '3D', '7D', '14D', '30D', '6M', '1Y', 'ALL']

  const aggregationOptionsMap = {
    '1H': ['None'],
    '6H': ['None', '1 Hour'],
    '24H': ['None', '1 Hour'],
    '3D': ['None', '1 Hour', '1 Day'],
    '7D': ['None', '1 Hour', '1 Day'],
    '14D': ['None', '1 Hour', '1 Day'],
    '30D': ['None', '1 Hour', '1 Day', '7 Days'],
    '6M': ['1 Day', '7 Days', '1 Month'],
    '1Y': ['1 Day', '7 Days', '1 Month'],
    ALL: ['1 Day', '7 Days', '1 Month', '6 Months'],
  }

  const defaultAggregationValues = {
    '1H': 'None',
    '6H': 'None',
    '24H': 'None',
    '3D': 'None',
    '7D': 'None',
    '14D': 'None',
    '30D': 'None',
    '6M': '1 Day',
    '1Y': '1 Day',
    ALL: '1 Day',
  }

  const validationSchema = yup.object().shape({
    selectedDevices: yup.array().min(1, 'Select at least one device').required(),
    selectedReadings: yup.array().when('selectedDevices', {
      is: selectedDevices => selectedDevices.length > 0,
      then: schema => schema.min(1, 'Select at least one reading').required(),
    }),
  })

  useEffect(() => {
    ReactGA.send({
      hitType: 'pageview',
      page: `/applications/${appId}/datavis`,
      title: 'Data Visualization',
    })
    ReactGA.event({
      category: 'Page View',
      action: 'User Clicked on Data Visualization',
      label: 'data-vis', // Optional
    })
  }, [appId])

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

  const selectTime = time => {
    setSelectedTime(time)
    setSelectedAggregation(defaultAggregationValues[time] || '')
  }

  useEffect(() => {
    setAggregationOptions(aggregationOptionsMap[selectedTime] || [])
    setSelectedAggregation(defaultAggregationValues[selectedTime] || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTime])

  const handleAggregationChange = event => {
    setSelectedAggregation(event.target.value)
  }

  const handleToggleChange = (event, newView) => {
    if (newView) setToggleView(newView)
  }

  const getClosestTimeRange = (startTime, endTime) => {
    const timeDifference = endTime - startTime; // Difference in milliseconds
    const timeDifferenceInHours = timeDifference / (1000 * 60 * 60); // Convert to hours
  
    const timeRanges = {
      '1H': 1,
      '6H': 6,
      '24H': 24,
      '3D': 72, // 3 days = 72 hours
      '7D': 168, // 7 days = 168 hours
      '14D': 336, // 14 days = 336 hours
      '30D': 720, // 30 days = 720 hours
      '6M': 4320, // 6 months = 4320 hours (approximation)
      '1Y': 8760, // 1 year = 8760 hours (approximation)
      ALL: Infinity, // All time
    };
  
    let closestRange = '1H';
    let closestDifference = Infinity;
  
    for (const [range, hours] of Object.entries(timeRanges)) {
      const difference = Math.abs(timeDifferenceInHours - hours);
      if (difference < closestDifference) {
        closestDifference = difference;
        closestRange = range;
      }
    }
  
    return closestRange;
  };

  const convertLocalToUTCStart = localTime => {
    const date = new Date(localTime);
    setStartTime(date.toISOString());

    if (endTime) {
      const closestRange = getClosestTimeRange(date, new Date(endTime));
      setAggregationOptions(aggregationOptionsMap[closestRange] || []);
      setSelectedAggregation(defaultAggregationValues[closestRange] || '');
    }
  };

  const convertLocalToUTCEnd = localTime => {
    const date = new Date(localTime);
    setEndTime(date.toISOString());

    if (startTime) {
      const closestRange = getClosestTimeRange(new Date(startTime), date);
      setAggregationOptions(aggregationOptionsMap[closestRange] || []);
      setSelectedAggregation(defaultAggregationValues[closestRange] || '');
    }
  };

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
            if (!json.capabilities[deviceKey]) {
              devicesWithType[deviceKey] = {
                name: devices[deviceKey],
                type: 'Unknown, no data exists',
                readings: null,
              }
            } else {
              devicesWithType[deviceKey] = {
                name: devices[deviceKey],
                type: json.capabilities[deviceKey].type,
                readings: json.capabilities[deviceKey].readings,
              }
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
  
    const body = {
      data: mappedData,
    };
  
    if (toggleView === 'dateTimePicker') {
      if (startTime && endTime) {
        body.start_time = startTime;
        body.end_time = endTime;
        body.aggregation = selectedAggregation; 
      }
    } else if (toggleView === 'timeButtons') {
      body.period = selectedTime;
      body.aggregation = selectedAggregation;
    }
  
    const sensorIds = Object.keys(mappedData);
    const payloadTypes = Object.values(mappedData).flat();
  
    body.sensor_ids = sensorIds;
    body.payload_types = payloadTypes;
  
    const endpoint = toggleView === 'dateTimePicker' ? serverDataEndpoint : serverDataButtonEndpoint;
  
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(response => response.json())
      .then(json => {
        if (json && json.data) {
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
        } else {
          console.error('No data field in response:', json);
        }
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
        <div style={{ display: 'flex', position: 'absolute', right: '1px', margin: '4px 4px' }}>
          <MUIButton
            variant="contained"
            onClick={() => setOpenVideo(true)}
            startIcon={<HelpOutlineIcon />}
            style={{ maxHeight: '36px' }}
          >
            <p>Help Video</p>
          </MUIButton>
        </div>

        <Dialog
          open={openVideo}
          onClose={() => setOpenVideo(false)}
          maxWidth="md"
          style={{ zIndex: '2001' }}
          PaperProps={{
            style: {
              borderRadius: '6px',
            },
          }}
        >
          <DialogTitle style={{ alignSelf: 'center' }}>Data Visualization Video Guide</DialogTitle>
          <DialogContent>
            <video controls style={{ width: '100%' }}>
              <source src={videoFile} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </DialogContent>
        </Dialog>
        <Formik
          initialValues={{
            selectedDevices: Object.keys(selectedDevices),
            selectedReadings,
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
                      const newReadings = values.selectedReadings.filter(reading =>
                        value.includes(reading.split('-')[0]),
                      )
                      setFieldValue('selectedReadings', newReadings)
                    }}
                    input={<OutlinedInput label="Selected Devices" />}
                    renderValue={() =>
                      values.selectedDevices.map(devId => availableDevices[devId]?.name).join(', ')
                    }
                    MenuProps={MenuProps}
                  >
                    {loading ? (
                      <MenuItem disabled>
                        <h1>Loading</h1>
                      </MenuItem>
                    ) : (
                      Object.keys(availableDevices).map(key => (
                        <MenuItem
                          key={key}
                          value={key}
                          disabled={availableDevices[key].type === 'Unknown, no data exists'}
                        >
                          <Checkbox checked={values.selectedDevices.includes(key)} />
                          <ListItemText
                            primary={availableDevices[key].name}
                            secondary={availableDevices[key].type}
                          />
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
                {errors.selectedDevices && touched.selectedDevices && (
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
                        <MenuItem
                          key={`${dev_eui}-${index}`}
                          value={`${dev_eui}-${item.payload_value}`}
                        >
                          <Checkbox
                            checked={values.selectedReadings.includes(
                              `${dev_eui}-${item.payload_value}`,
                            )}
                          />
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

              <div style={{ marginTop: '25px' }}>
                <ToggleButtonGroup
                  value={toggleView}
                  exclusive
                  color="primary"
                  onChange={handleToggleChange}
                  aria-label="View Toggle"
                >
                  <ToggleButton value="dateTimePicker">Date Time Picker</ToggleButton>
                  <ToggleButton value="timeButtons">Time Button</ToggleButton>
                </ToggleButtonGroup>
              </div>

              <div style={{ margin: '20px 0px', display: 'flex', gap: '10px' }}>
              {toggleView === 'dateTimePicker' && (
                <div>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div>
                        <DateTimePicker
                          label="Start Time"
                          value={null}
                          onChange={convertLocalToUTCStart}
                        />
                      </div>

                      <div style={{ margin: '0 10px' }}> --------- </div>

                      <div>
                        <DateTimePicker
                          label="End Time"
                          value={null}
                          onChange={convertLocalToUTCEnd}
                        />
                      </div>

                      {startTime && endTime && (
                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '10px' }}>
                          <FormControl sx={{ width: 175 }}> 
                            <InputLabel id="aggregation-label">Aggregate By</InputLabel>
                            <Select
                              labelId="aggregation-label"
                              value={selectedAggregation}
                              onChange={handleAggregationChange}
                              displayEmpty
                              renderValue={selected => selected || 'Select Aggregation'}
                              label="Aggregate By" 
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
                  </LocalizationProvider>

                  <div style={{ margin: '15px 0px' }}>
                    <SubmitButton>Fetch Data</SubmitButton>
                  </div>
                </div>
              )}
                {toggleView === 'timeButtons' && (
                  <div style={{ margin: '5px 0px', display: 'flex', gap: '10px' }}>
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
                    <SubmitButton>Fetch Data</SubmitButton>
                    {selectedTime !== '1H' && (
                      <div style={{ marginLeft: '25px', marginTop: '-20px' }}>
                        <FormControl sx={{ width: 175 }}>
                        <InputLabel id="aggregation-label">Aggregate By</InputLabel>
                          <Select
                            value={selectedAggregation}
                            onChange={handleAggregationChange}
                            displayEmpty
                            renderValue={selected => selected || 'Select Aggregation'}
                            label="Aggregate By" 
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
                )}
              </div>
            </Form>
          )}
        </Formik>
        <div style={{ paddingRight: '50px', paddingTop: '25px' }}>
          {graphData && graphData.dataset && graphData.dataset.length > 0 && (
            <LineChart
              dataset={graphData.dataset}
              xAxis={[
                {
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
                },
              ]}
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
