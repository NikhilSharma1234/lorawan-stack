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

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import { Container, Col, Row } from 'react-grid-system'
import { defineMessages } from 'react-intl'
import { useSelector } from 'react-redux'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import NavigationIcon from '@mui/icons-material/Navigation'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { useNavigate } from 'react-router-dom'

import AppAnimation from '@assets/animations/illustrations/app.json'
import GatewayAnimation from '@assets/animations/illustrations/gateway.json'

import { useBreadcrumbs } from '@ttn-lw/components/breadcrumbs/context'
import Breadcrumb from '@ttn-lw/components/breadcrumbs/breadcrumb'
import Link from '@ttn-lw/components/link'
import Modal from '@ttn-lw/components/modal'

import Message from '@ttn-lw/lib/components/message'
import IntlHelmet from '@ttn-lw/lib/components/intl-helmet'
import Animation from '@ttn-lw/lib/components/animation'
import RequireRequest from '@ttn-lw/lib/components/require-request'

import DeploymentComponentStatus from '@console/containers/deployment-component-status'

import sharedMessages from '@ttn-lw/lib/shared-messages'
import { selectDocumentationUrlConfig, selectSupportLinkConfig } from '@ttn-lw/lib/selectors/env'

import {
  mayViewApplications,
  mayViewGateways,
  mayCreateApplications,
  mayCreateGateways,
} from '@console/lib/feature-checks'
import { checkFromState } from '@account/lib/feature-checks'

import { getApplicationsList } from '@console/store/actions/applications'
import { getGatewaysList } from '@console/store/actions/gateways'

import { selectApplicationsTotalCount } from '@console/store/selectors/applications'
import { selectGatewaysTotalCount } from '@console/store/selectors/gateways'
import { selectUserNameOrId } from '@console/store/selectors/logout'
import { selectUserId } from '@account/store/selectors/user'

import HelpLink from './help-link'

import style from './overview.styl'

const m = defineMessages({
  createApplication: 'Create a project',
  createGateway: 'Register a gateway',
  gotoApplications: 'Go to projects',
  gotoGateways: 'Go to gateways',
  welcome: 'Welcome to the Console!',
  welcomeBack: 'Welcome back, {userName}! 👋',
  getStarted: 'Get started right away by creating an application or registering a gateway.',
  continueWorking: 'Walk right through to your applications and/or gateways.',
  componentStatus: 'Component status',
  versionInfo: 'Version info',
})

const Overview = () => {
  const userId = useSelector(selectUserId)
  const applicationCount = useSelector(selectApplicationsTotalCount)
  const gatewayCount = useSelector(selectGatewaysTotalCount)
  const userName = useSelector(selectUserNameOrId)
  const mayCreateApps = useSelector(state => checkFromState(mayCreateApplications, state))
  const mayViewApps = useSelector(state => checkFromState(mayViewApplications, state))
  const mayViewGtws = useSelector(state => checkFromState(mayViewGateways, state))
  const mayCreateGtws = useSelector(state => checkFromState(mayCreateGateways, state))
  const supportLink = selectSupportLinkConfig()
  const documentationBaseUrl = selectDocumentationUrlConfig()
  const appAnimationRef = useRef(null)
  const gatewayAnimationRef = useRef(null)
  const [AIModal, setAIModal] = useState(true)
  const [suggestions, setSuggestions] = useState([])
  const navigate = useNavigate()

  const serverAISuggestionEndPoint = process.env.FLASK_SUGGESTION_ENDPOINT

  useEffect(() => {
    const fetchAISuggestions = () => {
      fetch(serverAISuggestionEndPoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
        }),
      })
        .then(response => response.json())
        .then(json => {
          console.log(json.suggestions)
          setSuggestions(json.suggestions.suggestions)
        })
        .catch(error => console.error('Error fetching data:', error))
    }
    fetchAISuggestions()
  }, [serverAISuggestionEndPoint, userId])

  useBreadcrumbs('overview', <Breadcrumb path="/" content={sharedMessages.overview} />)

  const handleAppChooserMouseEnter = useCallback(() => {
    appAnimationRef.current.setDirection(1)
    appAnimationRef.current.goToAndPlay(0)
  }, [appAnimationRef])

  const handleAppChooserMouseLeave = useCallback(() => {
    appAnimationRef.current.setDirection(-1)
  }, [appAnimationRef])

  const handleGatewayChooserMouseEnter = useCallback(() => {
    gatewayAnimationRef.current.setDirection(1)
    gatewayAnimationRef.current.goToAndPlay(0)
  }, [gatewayAnimationRef])

  const handleGatewayChooserMouseLeave = useCallback(() => {
    gatewayAnimationRef.current.setDirection(-1)
  }, [gatewayAnimationRef])

  const chooser = useMemo(() => {
    const hasEntities = applicationCount + gatewayCount !== 0
    const appPath = hasEntities ? '/applications' : '/applications/add'
    const gatewayPath = hasEntities ? '/gateways' : '/gateways/add'

    return (
      <Row>
        {mayViewApplications && (
          <Col lg={mayViewGateways ? 6 : 12}>
            <Link to={appPath} className={style.chooserNav}>
              <div
                onMouseEnter={handleAppChooserMouseEnter}
                onMouseLeave={handleAppChooserMouseLeave}
                className={style.chooser}
              >
                <Animation animationRef={appAnimationRef} animationData={AppAnimation} />
                <Message
                  component="span"
                  content={hasEntities ? m.gotoApplications : m.createApplication}
                />
              </div>
            </Link>
          </Col>
        )}
        {mayViewGateways && (
          <Col lg={mayViewApplications ? 6 : 12}>
            <Link to={gatewayPath} className={style.chooserNav}>
              <div
                onMouseEnter={handleGatewayChooserMouseEnter}
                onMouseLeave={handleGatewayChooserMouseLeave}
                className={style.chooser}
              >
                <Animation animationRef={gatewayAnimationRef} animationData={GatewayAnimation} />
                <Message
                  component="span"
                  content={hasEntities ? m.gotoGateways : m.createGateway}
                />
              </div>
            </Link>
          </Col>
        )}
      </Row>
    )
  }, [
    appAnimationRef,
    applicationCount,
    gatewayAnimationRef,
    gatewayCount,
    handleAppChooserMouseEnter,
    handleAppChooserMouseLeave,
    handleGatewayChooserMouseEnter,
    handleGatewayChooserMouseLeave,
  ])

  const hasEntities = applicationCount + gatewayCount !== 0
  const mayCreateEntities = mayCreateApps || mayCreateGtws
  const mayNotViewEntities = !mayViewApps && !mayViewGtws

  const pagesMap = {
    expdata: 'Data Export',
    datavis: 'Data Visualization',
    map: 'Map',
    '': 'Project Overview',
    devices: 'End Devices',
  }

  const formatSensorList = sensors => {
    console.log(sensors, 'input')
    if (sensors.length === 0) return ''
    if (sensors.length === 1) return sensors[0]
    if (sensors.length === 2) return `${sensors[0]} and ${sensors[1]}`
    return `${sensors.slice(0, -1).join(', ')} and ${sensors[sensors.length - 1]}`
  }

  const getDisplayNamesFromPayloads = (payloadValues, devices) => {
    const displayNameMap = {}

    // Loop through all devices and their readings to build a lookup
    Object.values(devices).forEach(device => {
      device.readings.forEach(reading => {
        displayNameMap[reading.payload_value] = reading.display_name
      })
    })
    console.log(displayNameMap, 'displaynamemap')

    // Map payload values to their display names using the lookup
    return payloadValues.map(value => displayNameMap[value] || value)
  }

  const formatISODate = isoString => {
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: localTimeZone, // Change or remove for local time
    })
  }

  const objectToQueryParams = obj => {
    const params = new URLSearchParams()
    console.log(obj, 'object')

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        // Stringify nested objects (like devices)
        params.set(key, JSON.stringify(value))
      } else {
        params.set(key, value)
      }
    }

    return `?${params.toString()}` // Outputs the query string
  }

  const handleListItemClick = (page, project, queryParams) => {
    const queryString = queryParams ? objectToQueryParams(queryParams) : ''
    console.log(page, project, queryParams)
    navigate(`/applications/${project}/${page}${queryString}`)
  }

  return (
    <RequireRequest requestAction={[getApplicationsList(), getGatewaysList()]}>
      <Container>
        <div className={style.welcomeSection}>
          <Row>
            <IntlHelmet title={sharedMessages.overview} />
            <Col sm={12} className={style.welcomeTitleSection}>
              <Message
                className={style.welcome}
                content={hasEntities ? m.welcomeBack : m.welcome}
                values={{ userName }}
                component="h1"
              />
              {!mayNotViewEntities && (
                <Message
                  className={style.getStarted}
                  content={hasEntities || !mayCreateEntities ? m.continueWorking : m.getStarted}
                  component="h2"
                />
              )}
              <HelpLink supportLink={supportLink} documentationLink={documentationBaseUrl} />
            </Col>
          </Row>
          {chooser}
        </div>
        <DeploymentComponentStatus />
      </Container>
      {AIModal && (
        <Modal
          title="AI Suggestions"
          subtitle="Here are some suggested actions based on previous activity"
          bottomLine="Not all content is correct"
          buttonMessage="Done"
          onComplete={() => {
            setAIModal(false)
          }}
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
              <List>
                {suggestions.map((suggestion, index) => {
                  // Regular expression to match Markdown-style image syntax
                  const icon =
                    suggestion.event_type === 'Navigation'
                      ? 'nav'
                      : suggestion.extra !== ''
                        ? JSON.parse(suggestion.extra).startOfTime
                          ? 'exp'
                          : 'vis'
                        : null
                  const page = pagesMap[suggestion.page]
                  const extra =
                    suggestion.extra === 'nan' || suggestion.extra === ''
                      ? null
                      : JSON.parse(suggestion.extra)
                  console.log(extra, 'extra')
                  const devices =
                    suggestion.event_type === 'FetchData'
                      ? suggestion.page === 'expdata'
                        ? formatSensorList(Object.values(extra.selectedDevicesForPage))
                        : formatSensorList(Object.values(extra.devices).map(device => device.name))
                      : null
                  const startTime =
                    suggestion.event_type === 'FetchData' && suggestion.page === 'expdata'
                      ? extra.startOfTime
                      : null
                  const endTime =
                    suggestion.event_type === 'FetchData' && suggestion.page === 'expdata'
                      ? extra.endOfTIme
                      : null

                  console.log(startTime, endTime)
                  const readings =
                    suggestion.event_type === 'FetchData' && suggestion.page === 'datavis'
                      ? formatSensorList(
                          getDisplayNamesFromPayloads(
                            Object.keys(extra.readings).reduce(function (res, key) {
                              return res.concat(extra.readings[key])
                            }, []),
                            extra.devices,
                          ),
                        )
                      : null
                  const aggregator =
                    suggestion.event_type === 'FetchData' && suggestion.page === 'datavis'
                      ? extra.aggregation
                      : null
                  const text =
                    suggestion.event_type === 'Navigation'
                      ? `Navigate to the ${page} page.`
                      : suggestion.page === 'expdata'
                        ? `Run Fetch Data on the ${page} page for project: ${suggestion.project}, devices: ${devices} from ${formatISODate(startTime)} to ${formatISODate(endTime)}.`
                        : `Run Fetch Data on the ${page} page for project: ${suggestion.project}, devices: ${devices}. Readings: ${readings} for time period of ${extra.selectedTimeFrame}${aggregator ? ` with aggregator of ${aggregator}.` : '.'}`

                  const queryParams =
                    suggestion.event_type === 'Navigation'
                      ? null
                      : suggestion.page === 'expdata'
                        ? {
                            startTime,
                            endTime,
                            devices: extra.selectedDevicesForPage,
                          }
                        : {
                            aggregator,
                            timeFrame: extra.selectedTimeFrame,
                            readings: extra.readings,
                            devices: Object.fromEntries(
                              Object.entries(extra.devices).map(([key, value]) => [
                                key,
                                value.name,
                              ]),
                            ),
                          }

                  return (
                    <ListItem disablePadding key={index}>
                      <ListItemButton
                        onClick={() =>
                          handleListItemClick(suggestion.page, suggestion.project, queryParams)
                        }
                      >
                        <ListItemIcon>
                          {icon === 'nav' ? (
                            <NavigationIcon />
                          ) : icon === 'exp' ? (
                            <FileDownloadIcon />
                          ) : (
                            <ShowChartIcon />
                          )}
                        </ListItemIcon>
                        <ListItemText primary={text} />
                      </ListItemButton>
                    </ListItem>
                  )
                })}
              </List>
            </div>
          </div>
        </Modal>
      )}
    </RequireRequest>
  )
}

export default Overview
