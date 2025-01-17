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
import { Button, Card, CardActions, CardContent, Container, Typography } from '@mui/material'
import { useDispatch } from 'react-redux'
import classnames from 'classnames'
import { MapContainer, Marker, TileLayer, Popup } from 'react-leaflet'
import { latLngBounds } from 'leaflet'
import { Col, Row } from 'react-grid-system'

import mapStyle from '@ttn-lw/components/map/map.styl'
import { useBreadcrumbs } from '@ttn-lw/components/breadcrumbs/context'
import Breadcrumb from '@ttn-lw/components/breadcrumbs/breadcrumb'

import style from '@console/views/app/app.styl'

import attachPromise from '@ttn-lw/lib/store/actions/attach-promise'
import useRootClass from '@ttn-lw/lib/hooks/use-root-class'
import sharedMessages from '@ttn-lw/lib/shared-messages'

import { getDevicesList } from '@console/store/actions/devices'

const ApplicationMap = () => {
  const { appId } = useParams()
  const [zoom, setZoom] = useState(10)
  const serverDeviceEndpoint = process.env.FLASK_DEVICE_ENDPOINT
  const [availableDevices, setAvailableDevices] = useState(undefined)
  const [markers, setMarkers] = useState(undefined)
  const [unmarkedDevices, setUnmarkedDevices] = useState(undefined)
  const dispatch = useDispatch()
  const navigate = useNavigate()

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
  }, [appId, dispatch, serverDeviceEndpoint])

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
                      <Button size="small" onClick={() => navigateToDeviceLocation(appId, device)}>
                        Set Location
                      </Button>
                    </CardActions>
                  )}
                </Card>
              ))}
            </Row>
          </Col>
        </div>
      ) : null}
    </Container>
  )
}

export default ApplicationMap
