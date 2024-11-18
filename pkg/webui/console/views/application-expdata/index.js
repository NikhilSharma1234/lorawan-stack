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

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Formik, Form } from 'formik'
import { useSelector, useDispatch } from 'react-redux'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { ButtonGroup, Select, IconButton } from '@mui/material'
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
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'

import { useBreadcrumbs } from '@ttn-lw/components/breadcrumbs/context'
import Breadcrumb from '@ttn-lw/components/breadcrumbs/breadcrumb'
import SubmitButton from '@ttn-lw/components/submit-button'

import style from '@console/views/app/app.styl'

import yup from '@ttn-lw/lib/yup'
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
  const [availableColumns, setAvailableColumns] = useState([])
  const [selectedColumns, setSelectedColumns] = useState([])
  const [exportOption, setExportOption] = React.useState('CSV')
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)
  const [data, setData] = useState(null)
  const [, set] = useState(false)
  const [clicks, setClicks] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tableColumns, setTableColumns] = useState([])
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
  const serverDeviceEndpoint = process.env.FLASK_DEVICE_ENDPOINT

  const validationSchema = yup.object().shape({
    selectedDevices: yup.array().min(1).required(),
  })

  const [timer, setTimer] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  // Const validationSchemaExport = yup.object().shape({
  //   selectedColumns: yup.array().min(1, 'Select at least one export column').required(),
  //   exportOption: yup.array()
  //     .when('selectedColumns', {
  //       is: selectedColumns => selectedColumns.length > 0,
  //       then: schema => schema.min(1, 'Select at least one export format').required(),
  //     }),
  // })

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
    set(true)
    const requestParams = {
      devices: Object.keys(selectedDevices),
      startTime,
      endTime,
    }

    const server = process.env.FLASK_EXPORT_ENDPOINT

    fetch(server, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestParams),
    })
      .then(response => response.json())
      .then(json => {
        // Default columns
        let columns = [
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
        ]

        // Create a reverse mapping from display names to keys
        const displayNameToKeys = {}

        for (const key in json.mapping) {
          const displayName = json.mapping[key].display_name
          if (!displayNameToKeys[displayName]) {
            displayNameToKeys[displayName] = []
          }
          displayNameToKeys[displayName].push(key)
        }

        // Merge values for keys with the same display name in json.data
        const mergedData = json.data.map(item => {
          const newItem = { ...item } // Copy the original item

          for (const [displayName, keys] of Object.entries(displayNameToKeys)) {
            // Check if any of the keys exist in the current item
            const valuesToSum = keys.map(key => item[key]).filter(value => value !== undefined)

            if (valuesToSum.length > 0) {
              newItem[displayName] = valuesToSum.reduce((sum, value) => sum + (value || 0), 0)
              keys.forEach(key => delete newItem[key]) // Remove original keys
            }
          }

          return newItem
        })

        // Add additional columns from mapping information
        const dataKeys = mergedData.reduce((keys, item) => {
          Object.keys(item).forEach(key => keys.add(key))
          return keys
        }, new Set())

        // Track added display names to avoid duplicates
        const addedDisplayNames = new Set()

        for (const key of dataKeys) {
          if (key !== 'dev_eui' && key !== 'timestamp') {
            const mappingInfo = json.mapping[displayNameToKeys[key]]
            if (mappingInfo) {
              // Check if the display name has already been added
              if (!addedDisplayNames.has(mappingInfo.display_name)) {
                columns.push({
                  field: key,
                  headerName: mappingInfo.display_name,
                  description: mappingInfo.description || '',
                  sortable: mappingInfo.sortable || false,
                  type: 'number', // Adjust type based on unit
                  width: mappingInfo.width || 100,
                })

                // Mark the display name as added
                addedDisplayNames.add(mappingInfo.display_name)
              }
            } else {
              // Fallback for keys without mapping information
              columns.push({
                field: key,
                headerName: key,
                description: '',
                sortable: false,
                type: 'string',
                width: 100,
              })
            }
          }
        }

        columns = columns.filter(value => value.field !== 'item_number')

        const filteredAvailableColumns = columns
          .map(a => a.headerName)
          .filter(value => !['Device Name', 'Timestamp'].includes(value))
        // Set the table columns and data
        setTableColumns(columns)
        setAvailableColumns(filteredAvailableColumns) // List of available columns
        setSelectedColumns(filteredAvailableColumns) // Initially selecting all columns
        setData(mergedData) // Use the merged data
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
        } else {
          filteredRow[column] = null
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

  const increment = () => {
    setClicks(clicks + 1)
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

  const handleStart = () => {
    if (isRunning) return
    setIsRunning(true)
    startTimeTimer.current = Date.now() - timer
    timeInterval.current = setInterval(() => {
      setTimer(Date.now() - startTimeTimer.current)
    }, 10)
  }

  const handlePause = () => {
    if (!isRunning) return
    setIsRunning(false)
    clearInterval(timeInterval.current)
  }

  const handleReset = () => {
    clearInterval(timeInterval.current)
    timeInterval.current = null
    setIsRunning(false)
    setTimer(0)
  }

  const formatTime = timer => {
    const minutes = Math.floor(timer / 60000)
      .toString()
      .padStart(2, '0') // Convert to two-digit string
    const seconds = Math.floor((timer / 1000) % 60)
      .toString()
      .padStart(2, '0') // Convert to two-digit string
    const milliseconds = (timer % 10000).toString().padStart(2, '0') // Convert to two-digit string (hundredths)

    return { minutes, seconds, milliseconds }
  }

  const { minutes, seconds, milliseconds } = formatTime(timer)

  const timeInterval = useRef(null)
  const startTimeTimer = useRef(null)

  useRootClass(style.stageFlex, 'stage')

  useBreadcrumbs(
    'apps.single.data',
    <Breadcrumb path={`/applications/${appId}/expdata`} content={sharedMessages.expData} />,
  )

  const paginationModel = { page: 0, pageSize: 10 }

  return (
    <div style={{ margin: '0px 30px' }} onMouseDown={() => increment()}>
      <div>
        <div style={{ margin: '0px 16px 0px 0px', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h3>Select Time Range</h3>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div>
                    <DateTimePicker
                      label="Start Time"
                      value={null}
                      onChange={convertLocalToUTCStart}
                    />
                  </div>
                  <div style={{ margin: '0 20px' }}> --------- </div>
                  <div>
                    <DateTimePicker label="End Time" value={null} onChange={convertLocalToUTCEnd} />
                  </div>
                </div>
              </LocalizationProvider>
            </div>
            <div>
              <ButtonGroup variant="contained" aria-label="Basic button group">
                <IconButton disabled={isRunning} onClick={() => handleStart()}>
                  <PlayArrowIcon />
                </IconButton>
                <IconButton disabled={!isRunning} onClick={() => handlePause()}>
                  <PauseIcon />
                </IconButton>
                <IconButton disabled={isRunning} onClick={() => handleReset()}>
                  <StopIcon />
                </IconButton>
              </ButtonGroup>
              <div
                style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
              >
                <h3>
                  {minutes} {seconds} {milliseconds}
                </h3>
                <h2>{clicks}</h2>
              </div>
            </div>
          </div>

          <Formik
            initialValues={{
              selectedDevices: Object.keys(selectedDevices),
            }}
            validationSchema={validationSchema}
            onSubmit={fetchData}
          >
            {({ setFieldValue, values, errors, touched }) => (
              <Form>
                <h3>Devices</h3>
                <div>
                  <FormControl sx={{ width: 300 }}>
                    <InputLabel id="demo-multiple-checkbox-label">Selected Devices</InputLabel>
                    <Select
                      labelId="demo-multiple-checkbox-label"
                      id="demo-multiple-checkbox"
                      multiple
                      value={values.selectedDevices}
                      onChange={event => {
                        const { value } = event.target
                        setFieldValue('selectedDevices', value)
                        handleSelectedDeviceChange(event)
                      }}
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
                  {errors.selectedDevices &&
                    touched.selectedDevices &&
                    (!startTime || !endTime) && (
                      <div style={{ color: 'red' }}>
                        Select a start/end time with at least one device
                      </div>
                    )}
                  {errors.selectedDevices && touched.selectedDevices && startTime && endTime && (
                    <div style={{ color: 'red' }}>Select at least one device</div>
                  )}
                  {values.selectedDevices.length > 0 && (!startTime || !endTime) && (
                    <div style={{ color: 'red' }}>Select a start/end time</div>
                  )}
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
              </Form>
            )}
          </Formik>
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
                    toRender.push(column)
                  }
                  return toRender.join(', ')
                }}
                MenuProps={MenuProps}
              >
                {availableColumns.map(key => (
                  <MenuItem key={key} value={key}>
                    <Checkbox checked={selectedColumns.includes(key)} />
                    <ListItemText primary={key} />
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
            columns={tableColumns}
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
