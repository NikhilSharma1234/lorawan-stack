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

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Formik, Form } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
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
  ButtonGroup,
  IconButton,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'

import Modal from '@ttn-lw/components/modal'
import Breadcrumb from '@ttn-lw/components/breadcrumbs/breadcrumb'
import { useBreadcrumbs } from '@ttn-lw/components/breadcrumbs/context'
import Button from '@ttn-lw/components/button'
import SubmitButton from '@ttn-lw/components/submit-button'

import style from '@console/views/app/app.styl'

import yup from '@ttn-lw/lib/yup'
import attachPromise from '@ttn-lw/lib/store/actions/attach-promise'
import useRootClass from '@ttn-lw/lib/hooks/use-root-class'
import sharedMessages from '@ttn-lw/lib/shared-messages'

import { getDevicesList } from '@console/store/actions/devices'

import sendUserEvent from '@console/store/reducers/sendUserEvent'

import { selectUserId } from '@account/store/selectors/user'

const ApplicationDataVisualization = () => {
  const userId = useSelector(selectUserId)
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
  const [messages, setMessages] = useState([])
  const [AILoading, setAILoading] = useState(true)
  const [fetchDataLoading, setFetchDataLoading] = useState(false)
  const [firstTime, setFirstTime] = useState(true)
  const [AITextBox, setAITextBox] = useState('')

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
  const timesOptions = ['1H', '24H', '7D', '14D', '30D', '6M', '1Y', 'ALL']
  const [timer, setTimer] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [clicks, setClicks] = useState(0)
  const [csvURL, setCsvURL] = useState(null)
  const [AIModal, setAIModal] = useState(false)

  const aggregationOptionsMap = {
    '1H': ['None'],
    '24H': ['None', '1 Hour'],
    '7D': ['None', '1 Hour', '1 Day'],
    '14D': ['None', '1 Hour', '1 Day'],
    '30D': ['None', '1 Hour', '1 Day', '7 Days'],
    '6M': ['1 Day', '7 Days', '1 Month'],
    '1Y': ['1 Day', '7 Days', '1 Month'],
    ALL: ['1 Day', '7 Days', '1 Month', '6 Months'],
  }

  const defaultAggregationValues = {
    '1H': 'None',
    '24H': 'None',
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

  useEffect(() => {
    sendUserEvent(
      userId,
      'Navigation',
      `Navigated to the Data Visualization Page.`,
      null,
      'expdata',
      appId,
    )
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
          setMessages([
            {
              role: 'user',
              displayContent:
                'Tell me interesting details about the data. Summarize the data for me',
              content: `No visuals. This data represents enviornmental monitoring sensors deployed in a particular location. Only use the display names to refer to a column and don't mention dev_eui. Each unique dev_eui represents a unique sensor. Here is the mapping for payload_type and it's display name and dev_eui's. ${JSON.stringify(devicesWithType)}. Imagine that I was looking at a graph of this data and now summarize the graph for me in a simple way as if you provided the graph already and mention any cool trends. Also tell me the time period for which this data represents in a simple fashion.`,
            },
          ])
          console.log(JSON.stringify(devicesWithType))
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
  }, [appId, dispatch, serverDeviceEndpoint, userId])

  const fetchData = () => {
    setFetchDataLoading(true)
    setFirstTime(true)
    setAILoading(true)
    setAITextBox('')
    const mappedData = selectedReadings.reduce((acc, column) => {
      const [devEui, attribute] = column.split('-')

      if (!acc[devEui]) {
        acc[devEui] = []
      }

      acc[devEui].push(attribute)

      return acc
    }, {})

    sendUserEvent(
      userId,
      'FetchData',
      `Fetch Data clicked on the data visualization page with the period: ${selectedTime} and selected readings: ${JSON.stringify(mappedData)}`,
      JSON.stringify({
        selectedTimeFrame: selectedTime,
        readings: mappedData,
        aggregation: selectedAggregation,
        devices: availableDevices,
      }),
      'datavis',
      appId,
    )

    fetch(serverDataButtonEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: mappedData,
        period: selectedTime,
        aggregation: selectedAggregation, // Add selected aggregation option here
      }),
    })
      .then(response => response.json())
      .then(json => {
        // Handle response as before
        const dataset = {}
        json.data.forEach(item => {
          const timestamp = new Date(item.timestamp).getTime()
          const sensorValue = parseFloat(item.value) || null

          if (!dataset[timestamp]) {
            dataset[timestamp] = { timestamp }
          }

          dataset[timestamp][`${item.dev_eui}-${item.payload_type}`] = sensorValue

          for (const device of Object.keys(selectedDevices).filter(
            dev_eui => dev_eui !== item.dev_eui,
          )) {
            if (!dataset[timestamp][`${device}-${item.payload_type}`])
              dataset[timestamp][`${device}-${item.payload_type}`] = null
          }
        })

        const datasetArray = Object.values(dataset).sort((a, b) => a.timestamp - b.timestamp)

        const series = Object.keys(mappedData).flatMap(deviceId =>
          mappedData[deviceId].map(payloadValue => {
            const column = availableReadingColumns[deviceId].find(
              item => item.payload_value === payloadValue,
            )
            const displayName = column ? column.display_name : payloadValue

            return {
              dataKey: `${deviceId}-${payloadValue}`,
              label: `${selectedDevices[deviceId]} ${displayName}`,
            }
          }),
        )
        setCsvURL(json.CSV_URL)
        fetchAIResponse(json.CSV_URL, messages)
        setGraphData({ dataset: datasetArray, series })
      })
      .catch(error => {
        console.error('Error fetching data:', error)
        setFetchDataLoading(false)
      })
  }

  const fetchAIResponse = async (url, messagesNewest) => {
    const server = process.env.FLASK_AI_ENDPOINT
    const requestParams = {
      url,
      messages: messagesNewest,
    }
    fetch(server, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestParams),
    })
      .then(response => response.json())
      .then(json => {
        console.log(json)
        console.log(messages)
        setMessages([...messagesNewest, { role: 'assistant', content: json.data }])
        setAILoading(false)
        setFetchDataLoading(false)
        if (firstTime) {
          handleStart()
          setFirstTime(false)
        }
      })
      .catch(error => {
        console.error('Error fetching data:', error)
        setFetchDataLoading(false)
      })
  }

  const sendNewMessage = useCallback(async () => {
    setAILoading(true)
    setMessages([...messages, { role: 'user', content: AITextBox }])
    sendUserEvent(
      userId,
      'SendAIMessage',
      `Message sent to AI model on the data visualization page.`,
      JSON.stringify({
        AITextBox,
      }),
      'datavis',
      appId,
    )
    fetchAIResponse(csvURL, [...messages, { role: 'user', content: AITextBox }])
    setAITextBox('')
  })

  useEffect(() => {
    if (messages.length > 2) {
      const element = document.getElementById('lastMessage')
      element.scrollIntoView()
    }
  }, [messages])

  useRootClass(style.stageFlex, 'stage')

  useBreadcrumbs(
    'apps.single.data',
    <Breadcrumb path={`/applications/${appId}/datavis`} content={sharedMessages.dataVis} />,
  )

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

  const increment = () => {
    setClicks(clicks + 1)
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

  const handleKeyDown = React.useCallback(
    evt => {
      if (evt.key === 'Enter' && AITextBox !== '') {
        evt.stopPropagation()
        sendNewMessage()

        return
      }
    },
    [AITextBox, sendNewMessage],
  )

  const timeInterval = useRef(null)
  const startTimeTimer = useRef(null)

  return (
    <div style={{ margin: '0px 30px' }} onMouseDown={() => increment()}>
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
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
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
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <h3>
                    {minutes} {seconds} {milliseconds}
                  </h3>
                  <h2>{clicks}</h2>
                </div>
              </div>
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
              <SubmitButton isSubmitting={fetchDataLoading}>Fetch Data</SubmitButton>
              {selectedTime !== '1H' && (
                <div style={{ marginLeft: '25px', marginTop: '-84px' }}>
                  <h3>Aggregate By</h3>
                  <FormControl sx={{ width: 175 }}>
                    <Select
                      value={selectedAggregation}
                      onChange={handleAggregationChange}
                      displayEmpty
                      renderValue={selected => selected || 'Select Aggregation'}
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
              {graphData && graphData.dataset && graphData.dataset.length > 0 && (
                <Button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: '20px 0px',
                  }}
                  busy={AILoading}
                  onClick={() => setAIModal(true)}
                >
                  AI Analysis
                </Button>
              )}
            </div>
          </Form>
        )}
      </Formik>
      <div style={{ paddingRight: '50px', paddingTop: '25px' }}>
        {graphData && graphData.dataset && graphData.dataset.length > 0 && !fetchDataLoading && (
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
      {AIModal && (
        <Modal
          title="AI Analysis"
          subtitle="Chat with the AI to perform analysis"
          bottomLine="Not all content is correct"
          buttonMessage="Done"
          onComplete={() => {
            setAIModal(false)
          }}
          approveButtonProps={{ disabled: true }}
          onKeyDown={handleKeyDown}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Chat Messages - Scrollable */}
            <div
              style={{
                flexGrow: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '10px',
              }}
            >
              {messages.map((msg, index) => {
                // Regular expression to match Markdown-style image syntax
                const imageRegex = /!\[.*?\]\((.*?)\)/
                const match = msg.content.match(imageRegex)
                const imageUrl = match ? match[1] : null
                const textWithoutImage = msg.displayContent
                  ? msg.displayContent
                  : msg.content.replace(imageRegex, '').trim()

                return (
                  <div
                    key={index}
                    style={{
                      maxWidth: '60%',
                      padding: '10px 15px',
                      borderRadius: '15px',
                      fontSize: '16px',
                      wordWrap: 'break-word',
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      backgroundColor: msg.role === 'user' ? '#d4f8c6' : '#e5e5e5',
                    }}
                    id={messages.length - 1 === index ? 'lastMessage' : null}
                  >
                    {textWithoutImage && <p style={{ margin: 0 }}>{textWithoutImage}</p>}
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt="Chat Image"
                        style={{
                          width: '100%',
                          maxWidth: '300px',
                          marginTop: '5px',
                          borderRadius: '10px',
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Input Box - Stuck to Bottom */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                borderTop: '1px solid #ccc',
                padding: '10px',
                background: '#fff', // Ensures input doesn't blend with chat
              }}
            >
              <OutlinedInput
                fullWidth
                value={AITextBox}
                onChange={e => {
                  setAITextBox(e.target.value)
                }}
                disabled={AILoading}
                placeholder="Type a message..."
                style={{
                  flexGrow: 1,
                  padding: '4px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                }}
              />
              <IconButton onClick={sendNewMessage} disabled={AILoading}>
                <PlayArrowIcon />
              </IconButton>
            </div>
            <div>
              <ButtonGroup variant="contained" aria-label="Basic button group">
                <IconButton disabled={!isRunning} onClick={() => handlePause()}>
                  <PauseIcon />
                </IconButton>
                <IconButton disabled={isRunning} onClick={() => handleReset()}>
                  <StopIcon />
                </IconButton>
              </ButtonGroup>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <h3>
                  {minutes} {seconds} {milliseconds}
                </h3>
                <h2>{clicks}</h2>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default ApplicationDataVisualization
