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
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router-dom'
import { LineChart } from '@mui/x-charts/LineChart'
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
  const [loading, setLoading] = useState(true)

  const [selectedSensor, setSelectedSensor] = useState('')
  const [selectedTime, setSelectedTime] = useState('1H')
  const [graphData, setGraphData] = useState([])
  const availableReadingColumns = {
    Temperature: 'temperature',
    'Soil Moisture': 'water_SOIL',
    'Soil Conductivity': 'conduct_SOIL',
    'Soil Temperature': 'temp_SOIL',
  }

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

  const timesOptions = ['1H', '24H', '7D', '14D', '30D', '6M', '1Y', 'ALL']

  const handleDeviceChange = useCallback(
    event => {
      const {
        target: { value },
      } = event
      if (value.length === 0) setSelectedSensor('')

      const newSelectedDevices = {}
      for (const key of value) {
        newSelectedDevices[key] = availableDevices[key].name
      }
      setSelectedDevices(newSelectedDevices)
    },
    [availableDevices],
  )

  const computeDeviceItemDisabled = key => {
    if (
      selectedSensor !== 'temperature' &&
      selectedSensor !== '' &&
      availableDevices[key].type === 'Temperature' &&
      Object.keys(selectedDevices).length === 0
    )
      return true
    else if (
      selectedSensor === 'temperature' &&
      selectedSensor !== '' &&
      availableDevices[key].type === 'Temperature' &&
      Object.keys(selectedDevices).length === 0
    )
      return false
    else if (
      selectedSensor !== 'temperature' &&
      selectedSensor !== '' &&
      availableDevices[key].type !== 'Temperature' &&
      Object.keys(selectedDevices).length === 0
    )
      return false
    else if (
      selectedSensor === 'temperature' &&
      selectedSensor !== '' &&
      availableDevices[key].type !== 'Temperature' &&
      Object.keys(selectedDevices).length === 0
    )
      return true
    if (Object.keys(selectedDevices).length === 0) return false
    for (const selectedDevice of Object.keys(selectedDevices)) {
      if (availableDevices[selectedDevice].type === availableDevices[key].type) return false
    }
    return true
  }

  const computeReadingItemDisabled = key => {
    if (selectedSensor === '' && Object.keys(selectedDevices).length === 0) return false
    for (const selectedDevice of Object.keys(selectedDevices)) {
      if (
        availableDevices[selectedDevice].type === 'Temperature' &&
        selectedSensor === key &&
        key === 'temperature'
      )
        return false
      if (availableDevices[selectedDevice].type !== 'Temperature' && key === 'Temperature')
        return true
      if (availableDevices[selectedDevice].type !== 'Temperature' && key !== 'Temperature')
        return false
      if (availableDevices[selectedDevice].type === 'Temperature' && key === 'Temperature') {
        return false
      }

      if (availableDevices[selectedDevice].type === 'Temperature' && key !== 'Temperature')
        return true
    }
    return true
  }

  const handleSensorChange = event => {
    setSelectedSensor(event.target.value)
  }

  const selectTime = time => {
    setSelectedTime(time)
  }

  useEffect(() => {
    const fetchDeviceType = devices => {
      fetch('http://localhost:5001/devices', {
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
              type: json.capabilities[deviceKey],
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
  }, [appId, dispatch])

  const fetchData = () => {
    fetch('http://localhost:5001/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sensor_ids: Object.keys(selectedDevices),
        payload_type: selectedSensor,
        period: selectedTime,
      }),
    })
      .then(response => response.json())
      .then(json => {
        const dataset = {}
        json.data.forEach(item => {
          const timestamp = new Date(item.timestamp).getTime()
          const sensorValue = parseFloat(item[selectedSensor]) || null

          if (!dataset[timestamp]) {
            dataset[timestamp] = { timestamp }
          }

          dataset[timestamp][item.dev_eui] = sensorValue

          for (const device of Object.keys(selectedDevices).filter(
            dev_eui => dev_eui !== item.dev_eui,
          )) {
            if (!dataset[timestamp][device]) dataset[timestamp][device] = null
          }
        })

        const datasetArray = Object.values(dataset).sort((a, b) => a.timestamp - b.timestamp)

        const series = Object.keys(selectedDevices).map(deviceEui => ({
          dataKey: deviceEui,
          label: selectedDevices[deviceEui] || deviceEui,
        }))
        setGraphData({ dataset: datasetArray, series })
      })
      .catch(error => console.error('Error fetching data:', error))
  }

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
        <div>
          <h3>Devices</h3>
          <FormControl sx={{ width: 300 }}>
            <InputLabel id="device-select-label">Selected Devices</InputLabel>
            <Select
              labelId="device-select-label"
              id="device-select"
              multiple
              value={Object.keys(selectedDevices)}
              onChange={handleDeviceChange}
              input={<OutlinedInput label="Selected Devices" />}
              renderValue={() => Object.values(selectedDevices).join(', ')}
              MenuProps={MenuProps}
            >
              {loading ? (
                <MenuItem disabled>
                  <h1>Loading</h1>
                </MenuItem>
              ) : (
                Object.keys(availableDevices).map(key => (
                  <MenuItem key={key} value={key} disabled={computeDeviceItemDisabled(key)}>
                    <Checkbox checked={Object.keys(selectedDevices).includes(key)} />
                    <ListItemText
                      primary={availableDevices[key].name}
                      secondary={availableDevices[key].type}
                    />
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </div>

        <div style={{}}>
          <h3>Sensor Readings</h3>
          <FormControl sx={{ width: 300 }}>
            <InputLabel id="sensor-select-label">Selected Reading</InputLabel>
            <Select
              labelId="sensor-select-label"
              id="sensor-select"
              value={selectedSensor}
              onChange={handleSensorChange}
              input={<OutlinedInput label="Selected Devices" />}
            >
              {Object.keys(availableReadingColumns).map(key => (
                <MenuItem
                  key={key}
                  value={availableReadingColumns[key]}
                  disabled={computeReadingItemDisabled(key)}
                >
                  {key}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <div style={{ margin: '20px 0px', display: 'flex', gap: '10px' }}>
          {timesOptions.map(time => (
            <Button
              key={time}
              message={time}
              className="small"
              onClick={() => selectTime(time)}
              primary={selectedTime === time}
            />
          ))}
          <SubmitButton isSubmitting={false} isValidating={false} onClick={fetchData}>
            Fetch Data
          </SubmitButton>
        </div>

        {graphData && graphData.dataset && graphData.dataset.length > 0 && (
          <LineChart
            dataset={graphData.dataset}
            xAxis={[
              {
                dataKey: 'timestamp',
                valueFormatter: value => new Date(value).toLocaleString(),
                scaleType: 'time',
              },
            ]}
            series={graphData.series.map(series => ({
              ...series,
              showMark: false,
              connectNulls: true,
            }))}
            width={800}
            height={400}
          />
        )}
      </div>
    </Require>
  )
}

export default ApplicationDataVisualization
