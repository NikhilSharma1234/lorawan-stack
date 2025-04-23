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

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button as MUIButton,
  Card,
  CardActions,
  CardContent,
  Container,
  Typography,
  IconButton,
} from '@mui/material'
import { useDispatch, useSelector } from 'react-redux'
import classnames from 'classnames'
import { MapContainer, Marker, TileLayer, Popup } from 'react-leaflet'
import { latLngBounds } from 'leaflet'
import { Col, Row } from 'react-grid-system'
import OutlinedInput from '@mui/material/OutlinedInput'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'

import Button from '@ttn-lw/components/button'
import mapStyle from '@ttn-lw/components/map/map.styl'
import { useBreadcrumbs } from '@ttn-lw/components/breadcrumbs/context'
import Breadcrumb from '@ttn-lw/components/breadcrumbs/breadcrumb'
import Modal from '@ttn-lw/components/modal'

import style from '@console/views/app/app.styl'

import attachPromise from '@ttn-lw/lib/store/actions/attach-promise'
import useRootClass from '@ttn-lw/lib/hooks/use-root-class'
import sharedMessages from '@ttn-lw/lib/shared-messages'

import { getDevicesList } from '@console/store/actions/devices'

import sendUserEvent from '@console/store/reducers/sendUserEvent'

import { selectUserId } from '@account/store/selectors/user'

const ApplicationMap = () => {
  const userId = useSelector(selectUserId)
  const { appId } = useParams()
  const [zoom, setZoom] = useState(10)
  const serverDeviceEndpointCSV = process.env.FLASK_DEVICE_ENDPOINT_CSV
  const [availableDevices, setAvailableDevices] = useState(undefined)
  const [markers, setMarkers] = useState(undefined)
  const [unmarkedDevices, setUnmarkedDevices] = useState(undefined)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [AILoading, setAILoading] = useState(true)
  const [AIModal, setAIModal] = useState(false)
  const [AITextBox, setAITextBox] = useState('')
  const [messages, setMessages] = useState([])
  const [csvUrl, setCSVUrl] = useState(undefined)

  const fetchAIResponse = useCallback(async (url, messagesNewest) => {
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
      })
      .catch(error => {
        console.error('Error fetching data:', error)
      })
  })

  const sendNewMessage = useCallback(async () => {
    setAILoading(true)
    setMessages([...messages, { role: 'user', content: AITextBox }])
    sendUserEvent(
      userId,
      'SendAIMessage',
      `Message sent to AI model on the map page.`,
      JSON.stringify({
        AITextBox,
      }),
      'map',
      appId,
    )
    fetchAIResponse(csvUrl, [...messages, { role: 'user', content: AITextBox }])
    setAITextBox('')
  })

  useEffect(() => {
    sendUserEvent(userId, 'Navigation', `Navigated to the Project Map Page.`, null, 'map', appId)
    const fetchDeviceType = devices => {
      fetch(serverDeviceEndpointCSV, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensor_ids: Object.keys(devices),
          sensorsWithLocation: devices,
        }),
      })
        .then(response => response.json())
        .then(json => {
          setCSVUrl(json.CSV_URL)
          const devicesWithType = {}
          for (const deviceKey of Object.keys(devices)) {
            if (!json.capabilities[deviceKey]) {
              devicesWithType[deviceKey] = {
                name: devices[deviceKey],
                type: 'Unknown',
                readings: null,
                lastReading: null,
              }
            } else {
              devicesWithType[deviceKey] = {
                name: devices[deviceKey],
                type: json.capabilities[deviceKey].type,
                readings: json.capabilities[deviceKey].readings,
                lastReading: json.capabilities[deviceKey].lastReading,
              }

              const timestamp = devicesWithType[deviceKey].lastReading.time
              const date = new Date(timestamp).toLocaleDateString()
              const time = new Date(timestamp).toLocaleTimeString()
              devicesWithType[deviceKey].lastReading.time = `${date} ${time}`
            }
          }
          setAvailableDevices(devicesWithType)
          setMessages([
            {
              role: 'user',
              displayContent:
                'Tell me interesting details about the data. Summarize the data for me',
              content: `Tell me interesting details about this environmental monitoring sensor data. No visuals. Each unique device_id represents a unique sensor and so if a column is missing data for a device_id that probably means that sensor doesn't record that value. Do not use device_id to refer to anything, instead just call out the values of device_id. The values given are for the last reading of the sensor. Use the longitude and latitude value to tell me why I might be getting those certain values. Keep your response simple.`,
            },
          ])
        })
        .catch(error => console.error('Error fetching data:', error))
    }
    const fetchDevices = async () => {
      const devices = await dispatch(
        attachPromise(
          getDevicesList(appId, { page: 1, limit: 100 }, [
            'name',
            'application_server_address',
            'network_server_address',
            'join_server_address',
            'locations',
          ]),
        ),
      )
      const devicesToMark = {}
      const devicesWithNoLocation = {}
      for (const device of devices.entities) {
        if (!device.locations || !device.locations.user) {
          devicesWithNoLocation[device.ids.dev_eui] = {
            device_id: device.ids.device_id,
          }
        } else {
          devicesToMark[device.ids.dev_eui] = {
            device_id: device.ids.device_id,
            location: {
              latitude: device.locations.user.latitude,
              longitude: device.locations.user.longitude,
            },
          }
        }
      }
      if (Object.keys(devicesToMark).length > 0) setZoom(11)
      if (Object.keys(devicesWithNoLocation).length > 0) setUnmarkedDevices(devicesWithNoLocation)
      setMarkers(devicesToMark)
      fetchDeviceType({ ...devicesToMark, ...devicesWithNoLocation })
    }
    fetchDevices()
  }, [appId, dispatch, serverDeviceEndpointCSV, userId])

  useEffect(() => {
    if (messages.length === 1) {
      console.log('yooo')
      fetchAIResponse(csvUrl, messages)
    }
  }, [csvUrl, fetchAIResponse, messages, messages.length])

  const bounds = useCallback(() => {
    latLngBounds(
      Object.values(markers).map(marker => [marker.location.latitude, marker.location.longitude]),
    )
  }, [markers])

  const getMapCenter = useCallback(() => {
    if (!markers || Object.keys(markers).length === 0) return [39.526901, -119.813278]
    const sumCoords = Object.values(markers).reduce(
      (acc, marker) => {
        acc.latitude += marker.location.latitude
        acc.longitude += marker.location.longitude
        return acc
      },
      { latitude: 0, longitude: 0 },
    )
    const count = Object.values(markers).length
    return [sumCoords.latitude / count, sumCoords.longitude / count]
  }, [markers])

  const markerData = useCallback(() => {
    Object.values(markers).map(marker => ({
      position: {
        longitude: marker.location.longitude,
        latitude: marker.location.latitude,
      },
      accuracy: 100,
    }))
  }, [markers])

  const mapCenter = getMapCenter(markerData)

  useRootClass(style.stageFlex, 'stage')
  useBreadcrumbs(
    'apps.single.data',
    <Breadcrumb path={`/applications/${appId}/map`} content={sharedMessages.map} />,
  )

  const navigateToDevice = useCallback(
    (appId, deviceId) =>
      navigate(`/applications/${appId}/devices/${availableDevices[deviceId].name.device_id}`),

    [availableDevices, navigate],
  )

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

  const navigateToDeviceLocation = useCallback(
    (appId, deviceId) =>
      navigate(
        `/applications/${appId}/devices/${availableDevices[deviceId].name.device_id}/location`,
      ),

    [availableDevices, navigate],
  )

  return (
    <Container>
      {availableDevices ? (
        <div
          className={classnames(mapStyle.container, undefined, { [mapStyle.widget]: true })}
          data-test-id="location-map"
        >
          <MapContainer
            className={classnames(mapStyle.map, {
              [mapStyle.click]: true,
            })}
            minZoom={1}
            zoom={zoom}
            center={mapCenter}
            bounds={bounds}
            centerOnMarkers
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              noWrap
            />
            {Object.keys(markers).map((marker, index) => (
              <Marker
                key={`marker-key-${index}`}
                position={[markers[marker].location.latitude, markers[marker].location.longitude]}
              >
                <Popup>
                  <b>{markers[marker].device_id}</b>
                  <br />
                  <i>{availableDevices[marker].type} Sensor</i>
                  <br />
                  <br />
                  Last Reading: {availableDevices[marker].lastReading.time}
                  <br />
                  {Object.keys(availableDevices[marker].lastReading)
                    .filter(reading => reading !== 'time')
                    .map((reading, readingIndex) => (
                      <span key={`marker-key-reading-${readingIndex}`}>
                        {`${reading}: ${availableDevices[marker].lastReading[reading]}`}
                        <br />
                      </span>
                    ))}
                  <span>
                    <a onClick={() => navigateToDeviceLocation(appId, marker)}>Set New Location</a>{' '}
                    | <a onClick={() => navigateToDevice(appId, marker)}>View Sensor</a>
                  </span>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      ) : null}
      {availableDevices && (
        <div
          style={{
            display: 'flex',
            marginTop: '20px',
            justifyContent: 'center',
          }}
        >
          <Button type="button" busy={AILoading} onClick={() => setAIModal(true)}>
            AI Analysis
          </Button>
        </div>
      )}
      {unmarkedDevices && availableDevices ? (
        <div style={{ margin: '20px' }}>
          <h3>Unmarked Sensors</h3>
          <Col>
            <Row>
              {Object.keys(unmarkedDevices).map((device, index) => (
                <Card
                  key={`card-key-${index}`}
                  sx={{
                    width: '200px',
                    margin: '8px',
                    height: '275px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <CardContent>
                    <Typography variant="body1">{unmarkedDevices[device].device_id}</Typography>
                    <i>{availableDevices[device].type} Sensor</i>
                    <br />
                    <br />
                    Last Reading:{' '}
                    {availableDevices[device].lastReading
                      ? availableDevices[device].lastReading.time
                      : 'Unknown, no data exists for sensor'}
                    <br />
                    {availableDevices[device].lastReading &&
                      Object.keys(availableDevices[device].lastReading)
                        .filter(reading => reading !== 'time')
                        .map((reading, indexReading) => (
                          <span key={`card-key-reading-${device}-${indexReading}`}>
                            {`${reading}: ${availableDevices[device].lastReading[reading]}`}
                            <br />
                          </span>
                        ))}
                  </CardContent>
                  {availableDevices[device].lastReading && (
                    <CardActions sx={{ mt: 'auto' }}>
                      <MUIButton
                        size="small"
                        onClick={() => navigateToDeviceLocation(appId, device)}
                      >
                        Set Location
                      </MUIButton>
                    </CardActions>
                  )}
                </Card>
              ))}
            </Row>
          </Col>
        </div>
      ) : null}
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
          </div>
        </Modal>
      )}
    </Container>
  )
}

export default ApplicationMap
