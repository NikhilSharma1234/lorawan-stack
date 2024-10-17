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

import React, { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { Select } from '@mui/material'
import OutlinedInput from '@mui/material/OutlinedInput'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import ListItemText from '@mui/material/ListItemText'
import Checkbox from '@mui/material/Checkbox'
import Paper from '@mui/material/Paper'
import { DataGrid } from '@mui/x-data-grid'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

import { useBreadcrumbs } from '@ttn-lw/components/breadcrumbs/context'
import Breadcrumb from '@ttn-lw/components/breadcrumbs/breadcrumb'
import SubmitButton from '@ttn-lw/components/submit-button'

import style from '@console/views/app/app.styl'

import attachPromise from '@ttn-lw/lib/store/actions/attach-promise'
import sharedMessages from '@ttn-lw/lib/shared-messages'
import useRootClass from '@ttn-lw/lib/hooks/use-root-class'

import { getDevicesList } from '@console/store/actions/devices'

import { selectSelectedApplicationId } from '@console/store/selectors/applications'

const ApplicationDataExport = () => {
  const appId = useSelector(selectSelectedApplicationId)
  const dispatch = useDispatch()
  const [selectedDevices, setSelectedDevices] = useState({})
  const [availableDevices, setAvailableDevices] = useState({})
  const [availableColumns, setAvailableColumns] = useState([
    'temperature',
    'temp_SOIL',
    'water_SOIL',
  ])
  const [selectedColumns, setSelectedColumns] = useState([])
  const [exportOption, setExportOption] = React.useState('CSV')
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
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
  const validColumns = {
    temperature: 'Temperature',
    temp_SOIL: 'Soil Temperature',
    water_SOIL: 'Soil Moisture',
    batteryCapacity: 'Battery Level',
    conduct_SOIL: 'Soil Conductivity',
    Temp_Red: 'Temperature Red',
    Temp_White: 'Temperature White',
    Temp_Black: 'Temperature Black',
  }
  const serverDeviceEndpoint = process.env.FLASK_DEVICE_ENDPOINT;
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

  const convertLocalToUTCStart = localTime => {
    // Create a Date object from the local timestamp
    const date = new Date(localTime)

    // Get the UTC time string
    setStartTime(date.toISOString()) // Returns in the format "YYYY-MM-DDTHH:mm:ss.sssZ"
  }

  const convertLocalToUTCEnd = localTime => {
    // Create a Date object from the local timestamp
    const date = new Date(localTime)

    // Get the UTC time string
    setEndTime(date.toISOString()) // Returns in the format "YYYY-MM-DDTHH:mm:ss.sssZ"
  }

  const fetchData = () => {
    const requestParams = {
      devices: Object.keys(selectedDevices),
      startTime,
      endTime,
    }

    const server = process.env.FLASK_EXPORT_ENDPOINT;

    fetch(server, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestParams),
    })
      .then(response => response.json())
      .then(json => {
        setData(json.data)
        const dataFromAPI = [...json.data]
        const availableColumns = []
        for (const object of dataFromAPI) {
          for (const key of Object.keys(object)) {
            if (
              Object.keys(validColumns).includes(key) &&
              !availableColumns.includes(key) &&
              object[key]
            ) {
              availableColumns.push(key)
            }
          }
        }
        setAvailableColumns(availableColumns)
        setSelectedColumns(availableColumns)
      })
      .catch(error => {
        console.error('Error fetching data:', error)
      })
  }

  const handleSelectedDeviceChange = useCallback(
    event => {
      const {
        target: { value },
      } = event

      if (Object.keys(selectedDevices).includes(value)) {
        const newSelectedDevices = { ...selectedDevices }
        delete newSelectedDevices[value]
        setSelectedDevices(newSelectedDevices)
      } else {
        const newSelectedDevices = {}
        for (const key of value) {
          newSelectedDevices[key] = availableDevices[key].name
        }
        setSelectedDevices(newSelectedDevices)
      }
    },
    [selectedDevices, availableDevices],
  )

  const handleSelectedColumnChange = useCallback(
    event => {
      const {
        target: { value },
      } = event

      if (selectedColumns.includes(value)) {
        const newSelectedColumns = [...selectedColumns]
        newSelectedColumns.pop(value)
        setSelectedColumns(newSelectedColumns)
      } else {
        const newSelectedColumns = []
        for (const key of value) {
          newSelectedColumns.push(key)
        }
        setSelectedColumns(newSelectedColumns)
      }
    },
    [selectedColumns],
  )

  const handleExportData = () => {
    const alwaysIncludedColumns = ['timestamp', 'dev_eui'] // Define columns to always include

    // Create newData with selected columns and always included columns
    const newData = data.map(row => {
      const filteredRow = {}

      // Add always included columns
      alwaysIncludedColumns.forEach(column => {
        if (row.hasOwnProperty(column)) {
          filteredRow[column] = row[column]
        }
      })

      // Add selected columns if they exist
      selectedColumns.forEach(column => {
        if (row.hasOwnProperty(column)) {
          filteredRow[column] = row[column]
        }
      })

      // Add device name based on dev_eui
      if (row.dev_eui && availableDevices[row.dev_eui]) {
        filteredRow.device_name = availableDevices[row.dev_eui].name
      }

      return filteredRow
    })
    if (exportOption === 'CSV') return downloadCSV(newData)
    downloadJSON(newData)
  }

  const convertJSONToCSV = newData => {
    let csv = ''

    const headers = Object.keys(newData[0])
    csv += `${headers.join(',')}\n`

    // Extract values with proper escaping
    newData.forEach(obj => {
      const values = headers.map(header => {
        const value = obj[header]
        // Check if the value is a string and contains a comma or quote
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          // Escape quotes and wrap in quotes
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      })
      csv += `${values.join(',')}\n`
    })

    return csv
  }

  // Function to initiate CSV download
  const downloadCSV = newData => {
    const csvData = convertJSONToCSV(newData)
    // Create CSV file and initiate download
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', 'product_data.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Function to initiate CSV download
  const downloadJSON = newData => {
    // Create CSV file and initiate download
    const blob = new Blob([JSON.stringify(newData)], { type: 'text/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', 'product_data.json')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useRootClass(style.stageFlex, 'stage')

  useBreadcrumbs(
    'apps.single.data',
    <Breadcrumb path={`/applications/${appId}/expdata`} content={sharedMessages.expData} />,
  )

  const columns = [
    {
      field: 'dev_eui',
      headerName: 'Device Name',
      description: 'Name of the device',
      width: 175,
      valueGetter: value => availableDevices[value].name,
    },
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      description: 'Timestamp from reading',
      type: 'dateTime',
      width: 250,
      valueGetter: value => value && new Date(value),
    },
    ...(availableColumns.includes('temperature')
      ? [
          {
            field: 'temperature',
            headerName: 'Temperature',
            description: 'Temperature reading from sensor',
            type: 'number',
            width: 90,
          },
        ]
      : []),
    ...(availableColumns.includes('Temp_Red')
      ? [
          {
            field: 'Temp_Red',
            headerName: 'Temperature Red',
            description: 'Temperature Red reading from sensor',
            type: 'number',
            width: 90,
          },
        ]
      : []),
    ...(availableColumns.includes('Temp_White')
      ? [
          {
            field: 'Temp_White',
            headerName: 'Temperature White',
            description: 'Temperature White reading from sensor',
            type: 'number',
            width: 90,
          },
        ]
      : []),
    ...(availableColumns.includes('Temp_Black')
      ? [
          {
            field: 'Temp_Black',
            headerName: 'Temperature Black',
            description: 'Temperature Black reading from sensor',
            type: 'number',
            width: 90,
          },
        ]
      : []),
    ...(availableColumns.includes('temp_SOIL')
      ? [
          {
            field: 'temp_SOIL',
            headerName: 'Soil Temperature',
            description: 'Soil temperature from sensor',
            type: 'number',
            width: 120,
          },
        ]
      : []),
    ...(availableColumns.includes('water_SOIL')
      ? [
          {
            field: 'water_SOIL',
            headerName: 'Soil Moisture',
            description: 'Soil moisture from sensor',
            type: 'number',
            width: 90,
          },
        ]
      : []),
    ...(availableColumns.includes('conduct_SOIL')
      ? [
          {
            field: 'conduct_SOIL',
            headerName: 'Soil Conductivity',
            description: 'Soil conductivity from sensor',
            type: 'number',
            width: 120,
          },
        ]
      : []),
    ...(availableColumns.includes('batteryCapacity')
      ? [
          {
            field: 'batteryCapacity',
            headerName: 'Battery Level',
            description: 'Battery level from sensor',
            sortable: false,
            width: 90,
          },
        ]
      : []),
  ]

  const paginationModel = { page: 0, pageSize: 10 }

  return (
    <div style={{ margin: '0px 30px' }}>
      <div style={{ display: 'flex' }}>
        <div style={{ margin: '0px 16px 0px 0px' }}>
          <h3>Select Time Range</h3>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div>
                <DateTimePicker label="Start Time" value={null} onChange={convertLocalToUTCStart} />
              </div>
              <div style={{ margin: '0 20px' }}> --------- </div>
              <div>
                <DateTimePicker label="End Time" value={null} onChange={convertLocalToUTCEnd} />
              </div>
            </div>
          </LocalizationProvider>
          <h3>Devices</h3>
          <div>
            <FormControl sx={{ width: 300 }}>
              <InputLabel id="demo-multiple-checkbox-label">Selected Devices</InputLabel>
              <Select
                labelId="demo-multiple-checkbox-label"
                id="demo-multiple-checkbox"
                multiple
                value={Object.keys(selectedDevices)}
                onChange={handleSelectedDeviceChange}
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
                    <MenuItem key={key} value={key}>
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '20px 0px',
            }}
          >
            <SubmitButton
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '20px 0px',
              }}
              isSubmitting={false}
              isValidating={false}
              onClick={fetchData}
            >
              Fetch Data
            </SubmitButton>
          </div>
        </div>
        {data ? (
          <div style={{ margin: '0px 32px', display: 'flex', flexDirection: 'column' }}>
            <h3>Export Data</h3>
            <FormControl sx={{ width: 300 }}>
              <InputLabel id="demo-multiple-checkbox-label">Selected Columns</InputLabel>
              <Select
                labelId="demo-multiple-checkbox-label"
                id="demo-multiple-checkbox"
                multiple
                value={selectedColumns}
                onChange={handleSelectedColumnChange}
                input={<OutlinedInput label="Selected Columns" />}
                renderValue={() => {
                  const toRender = []
                  for (const column of selectedColumns) {
                    toRender.push(validColumns[column])
                  }
                  return toRender.join(', ')
                }}
                MenuProps={MenuProps}
              >
                {availableColumns.map(key => (
                  <MenuItem key={validColumns[key]} value={key}>
                    <Checkbox checked={selectedColumns.includes(key)} />
                    <ListItemText primary={validColumns[key]} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <h3>Format</h3>
            <ToggleButtonGroup
              value={exportOption}
              exclusive
              onChange={(event, value) => setExportOption(value)}
              aria-label="Format Selection"
              size="large"
            >
              <ToggleButton value="CSV">CSV</ToggleButton>
              <ToggleButton value="JSON">JSON</ToggleButton>
            </ToggleButtonGroup>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '20px 0px',
              }}
            >
              <SubmitButton isSubmitting={false} isValidating={false} onClick={handleExportData}>
                Export Data
              </SubmitButton>
            </div>
          </div>
        ) : null}
      </div>
      {data ? (
        <Paper sx={{ height: 625, width: '100%' }}>
          <DataGrid
            getRowId={row => row.item_number}
            rows={data}
            columns={columns}
            initialState={{ pagination: { paginationModel } }}
            pageSizeOptions={[5, 10]}
            sx={{ border: 0 }}
          />
        </Paper>
      ) : null}
    </div>
  )
}

export default ApplicationDataExport
