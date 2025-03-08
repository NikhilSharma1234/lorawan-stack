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
import { Formik, Form } from 'formik'
import { useSelector, useDispatch } from 'react-redux'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { Select, Dialog, DialogContent, DialogTitle, Button } from '@mui/material'
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
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import ReactGA from 'react-ga4'

import videoFile from '@assets/videos/DataExport.mp4'

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
  const [loading, setLoading] = useState(true)
  const [tableColumns, setTableColumns] = useState([])
  const [openVideo, setOpenVideo] = useState(false)
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

  useEffect(() => {
    ReactGA.send({
      hitType: 'pageview',
      page: `/applications/${appId}/expdata`,
      title: 'Data Export',
    })
    ReactGA.event({
      category: 'Page View',
      action: 'User Clicked on Data Export',
      label: 'data-exp', // Optional
    })
  }, [appId])

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

          if (newItem.timestamp) {
            newItem.timestamp = formatTimestamp(newItem.timestamp)
          }

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

  const formatTimestamp = timestamp => {
    const date = new Date(timestamp)

    // Format the date as MM/DD/YYYY, hh:mm:ss AM/PM
    const options = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }

    const formattedDate = date.toLocaleString('en-US', options)
    return formattedDate.replace(',', '')
  }

  const convertJSONToCSV = newData => {
    let csv = ''

    const headers = Object.keys(newData[0])
    csv += `${headers.join(',')}\n`

    newData.forEach(obj => {
      const values = headers.map(header => {
        const value = obj[header]
        if (header === 'timestamp' && value) {
          return formatTimestamp(value) // Ensure timestamp is formatted
        }
        // Handle escaping for other fields as necessary
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
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

  const paginationModel = { page: 0, pageSize: 10 }

  return (
    <div style={{ margin: '0px 30px' }}>
      <div style={{ display: 'flex' }}>
        <div style={{ display: 'flex', position: 'absolute', right: '1px', margin: '4px 4px' }}>
          <Button
            variant="contained"
            onClick={() => setOpenVideo(true)}
            startIcon={<HelpOutlineIcon />}
            style={{ maxHeight: '36px' }}
          >
            <p>Help Video</p>
          </Button>
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
          <DialogTitle style={{ alignSelf: 'center' }}>Export Data Video Guide</DialogTitle>
          <DialogContent>
            <video controls style={{ width: '100%' }}>
              <source src={videoFile} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </DialogContent>
        </Dialog>
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
                          <MenuItem
                            key={key}
                            value={key}
                            disabled={availableDevices[key].type === 'Unknown, no data exists'}
                          >
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
