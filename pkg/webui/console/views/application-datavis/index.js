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
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import Plotly from 'plotly.js-dist-min'
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
  Typography,
  DialogContent,
  DialogTitle,
  Button as MUIButton,
} from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import StackedBarChartIcon from '@mui/icons-material/StackedBarChart'
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
  const [clusteredAggregationOptions, setClusteredAggregationOptions] = useState([])
  const [toggleView, setToggleView] = useState('dateTimePicker')
  const [selectedAggregation, setSelectedAggregation] = useState('')
  const [clusteredSelectedAggregation, setClusteredSelectedAggregation] = useState('')
  const [loading, setLoading] = useState(true)
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)
  const [openVideo, setOpenVideo] = useState(false)
  const [visualizationMode, setVisualizationMode] = useState('timeSeries')
  const [clusteredSelectedTime, setClusteredSelectedTime] = useState('12H')
  const [clusteredSummaryType, setClusteredSummaryType] = useState('Average')
  const [timeFilter, setTimeFilter] = useState({ start: null, end: null })
  const [dayFilter, setDayFilter] = useState([])

  const [showTrendLines] = useState('none')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [selectedReadings, setSelectedReadings] = useState([])
  const [selectedTime, setSelectedTime] = useState('1H')
  const [plotlyData, setPlotlyData] = useState(null)
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
  const clusterTimesOptions = ['12H', '24H','3D', '7D', '14D', '30D', '3M', '6M', '1Y']
  const clusterSummaryOptions = ['Average', 'Minimum', 'Maximum']
  const dayOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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

    const clusteredAggregationOptionsMap = {
    '12H': ['1 Hour'],
    '24H': ['2 Hours'],
    '3D': ['6 Hours', '1 Day'],
    '7D': ['12 Hours', '1 Day'],
    '14D': ['1 Day', '7 Days'],
    '30D': ['2 Days', '7 Days'],
    '3M': ['7 Days', '1 Month'],
    '6M': ['14 Days', '1 Month'],
    '1Y': ['1 Month'],
  }

  const clusteredDefaultAggregationValues = {
    '12H': '1 Hour',
    '24H': '2 Hours',
    '3D': '6 Hours',
    '7D': '12 Hours',
    '14D': '1 Day',
    '30D': '2 Days',
    '3M': '7 Days',
    '6M': '14 Days',
    '1Y': '1 Month'
  }

  const resetAllInputs = () => {
    setStartTime(null)
    setEndTime(null)
    setSelectedAggregation('')
    setClusteredSelectedAggregation('1 Hour')
    setSelectedTime('1H')
    setClusteredSelectedTime('12H')
    setPlotlyData(null)
    setClusteredSummaryType('Average')
    setTimeFilter({ start: null, end: null })
    setDayFilter([])
}


  const validationSchema = yup.object().shape({
    selectedDevices: yup.array().min(1, 'Select at least one device').required(),
    selectedReadings: yup.array().when('selectedDevices', {
      is: selectedDevices => selectedDevices.length > 0,
      then: schema => schema.min(1, 'Select at least one reading').required(),
    }),
  })

  const calculateTrendLine = (dates, values) => {
    const xValues = dates.map(date => date.getTime())
    const yValues = values
    const n = yValues.length
    
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
    for (let i = 0; i < n; i++) {
      sumX += xValues[i]
      sumY += yValues[i]
      sumXY += xValues[i] * yValues[i]
      sumXX += xValues[i] * xValues[i]
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    return xValues.map(x => slope * x + intercept)
  }

  useEffect(() => {
    ReactGA.send({
      hitType: 'pageview',
      page: `/applications/${appId}/datavis`,
      title: 'Data Visualization',
    })
    ReactGA.event({
      category: 'Page View',
      action: 'User Clicked on Data Visualization',
      label: 'data-vis',
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

    const clusteredSelectTime = time => {
    setClusteredSelectedTime(time)
    setClusteredSelectedAggregation(clusteredDefaultAggregationValues[time] || '')
  }

  useEffect(() => {
    setAggregationOptions(aggregationOptionsMap[selectedTime] || [])
    setSelectedAggregation(defaultAggregationValues[selectedTime] || '')
  }, [selectedTime])

    useEffect(() => {
    setClusteredAggregationOptions(clusteredAggregationOptionsMap[clusteredSelectedTime] || [])
    setClusteredSelectedAggregation(clusteredDefaultAggregationValues[clusteredSelectedTime] || '')
  }, [clusteredSelectedTime])

  const handleAggregationChange = event => {
    setSelectedAggregation(event.target.value)
  }

  const clusteredHandleAggregationChange = event => {
  setClusteredSelectedAggregation(event.target.value)
  }

  const handleClusteredSummaryChange = event => {
  setClusteredSummaryType(event.target.value)
  }

 const handleDayFilterChange = (dayIndex) => {
  setDayFilter(prev =>
    prev.includes(dayIndex)
      ? prev.filter(i => i !== dayIndex)
      : [...prev, dayIndex]
  )
}

  const handleToggleChange = (event, newView) => {
    if (newView) setToggleView(newView)
  }

  const getClosestTimeRange = (startTime, endTime) => {
    const timeDifference = endTime - startTime
    const timeDifferenceInHours = timeDifference / (1000 * 60 * 60)

    const timeRanges = {
      '1H': 1,
      '6H': 6,
      '24H': 24,
      '3D': 72,
      '7D': 168,
      '14D': 336,
      '30D': 730,
      '3M': 2190,
      '6M': 4380,
      '1Y': 8760,
      ALL: Infinity,
    }

    let closestRange = '1H'
    let closestDifference = Infinity

    for (const [range, hours] of Object.entries(timeRanges)) {
      const difference = Math.abs(timeDifferenceInHours - hours)
      if (difference < closestDifference) {
        closestDifference = difference
        closestRange = range
      }
    }

    return closestRange
  }

  const convertLocalToUTCStart = localTime => {
    const date = new Date(localTime)
    setStartTime(date.toISOString())

    if (endTime) {
      const closestRange = getClosestTimeRange(date, new Date(endTime))
      setAggregationOptions(aggregationOptionsMap[closestRange] || [])
      setSelectedAggregation(defaultAggregationValues[closestRange] || '')
    }
  }

  const convertLocalToUTCEnd = localTime => {
    const date = new Date(localTime)
    setEndTime(date.toISOString())

    if (startTime) {
      const closestRange = getClosestTimeRange(new Date(startTime), date)
      setAggregationOptions(aggregationOptionsMap[closestRange] || [])
      setSelectedAggregation(defaultAggregationValues[closestRange] || '')
    }
  }

  const clusteredConvertLocalToUTCStart = localTime => {
    const date = new Date(localTime)
    setStartTime(date.toISOString())

    if (endTime) {
      const closestRange = getClosestTimeRange(date, new Date(endTime))
      setClusteredAggregationOptions(clusteredAggregationOptionsMap[closestRange] || [])
      setClusteredSelectedAggregation(clusteredDefaultAggregationValues[closestRange] || '')
    }
  }

  const clusteredConvertLocalToUTCEnd = localTime => {
    const date = new Date(localTime)
    setEndTime(date.toISOString())

    if (startTime) {
      const closestRange = getClosestTimeRange(new Date(startTime), date)
      setClusteredAggregationOptions(clusteredAggregationOptionsMap[closestRange] || [])
      setClusteredSelectedAggregation(clusteredDefaultAggregationValues[closestRange] || '')
    }
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
                readings: json.capabilities[deviceKey].readings.map(reading => ({
                  payload_value: reading.payload_value,
                  display_name: reading.display_name,
                  unit: reading.unit || '' 
                }))
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
    if (visualizationMode === 'timeSeries') {
      const mappedData = selectedReadings.reduce((acc, column) => {
        const [devEui, attribute] = column.split('-')
    
        if (!acc[devEui]) {
          acc[devEui] = []
        }
    
        acc[devEui].push(attribute)
        return acc
      }, {})
    
      const body = {
        data: mappedData,
        visualization_type: 'time_series'
      }
    
      if (toggleView === 'dateTimePicker') {
        if (startTime && endTime) {
          body.start_time = startTime
          body.end_time = endTime
          body.aggregation = selectedAggregation 
        }
      } else if (toggleView === 'timeButtons') {
        body.period = selectedTime
        body.aggregation = selectedAggregation
      }
    
      const sensorIds = Object.keys(mappedData)
      const payloadTypes = Object.values(mappedData).flat()
    
      body.sensor_ids = sensorIds
      body.payload_types = payloadTypes
    
      const endpoint = toggleView === 'dateTimePicker' ? serverDataEndpoint : serverDataButtonEndpoint
          
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(response => response.json())
        .then(json => {
          if (json && json.data) {
            const plotlyTraces = []
            const deviceReadingsMap = {}
            const colors = [
              '#1795ff', '#890BE0', '#59A14F', '#ff3232', '#e70096',
              '#F28E2B', '#B6992D', '#00f1ed', '#880000', '#8CD17D',
              '#499894', '#BAB0AC', '#D37295', '#FABFD2', '#86BCB6'
            ]
        
            json.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

            json.data.forEach(item => {
              const key = `${item.dev_eui}-${item.payload_type}`
              if (!deviceReadingsMap[key]) {
                const device = availableReadingColumns[item.dev_eui]
                const reading = device?.find(r => r.payload_value === item.payload_type)
                const displayName = reading?.display_name || item.payload_type
                
                deviceReadingsMap[key] = {
                  x: [],
                  y: [],
                  name: `${selectedDevices[item.dev_eui]} ${displayName}`,
                  fullName: `${selectedDevices[item.dev_eui]} ${displayName}`,
                  unit: reading?.unit || item.unit || '' 
                }
              }
              deviceReadingsMap[key].x.push(new Date(item.timestamp))
              deviceReadingsMap[key].y.push(parseFloat(item.value) || 0)
            })

            Object.values(deviceReadingsMap).forEach((traceData, i) => {
              plotlyTraces.push({
                x: traceData.x,
                y: traceData.y,
                type: 'scattergl',
                mode: 'lines',
                name: traceData.name,
                line: {
                  color: colors[i % colors.length],
                  width: 2,
                  shape: 'spline'
                },
                connectgaps: false,
                hoverinfo: 'y+name',
                hovertemplate: `
                  <span style="font-size:14px;color:#666">%{fullData.name}:</span>
                  <span style="color:#000; font-size:14px;">%{y:.2f} ${traceData.unit}</span><extra></extra>
                `,
                hoverlabel: {
                  bgcolor: 'white',
                  bordercolor: colors[i % colors.length],
                }
              })

              if (traceData.y.length > 1) {
                plotlyTraces.push({
                  x: traceData.x,
                  y: calculateTrendLine(traceData.x, traceData.y),
                  type: 'scattergl',
                  mode: 'lines',
                  name: `${traceData.name} (Trendline)`,
                  line: {
                    color: colors[i % colors.length],
                    width: 1.5,
                    dash: 'dash'
                  },
                  visible: showTrendLines === 'all' ? true : 'legendonly',
                  hoverinfo: 'none'
                })
              }
            })
        
            setPlotlyData(plotlyTraces)
          }
        })
        .catch(error => console.error('Error fetching data:', error))
    } else {
        const mappedData = selectedReadings.reduce((acc, column) => {
          const [devEui, attribute] = column.split('-')
          if (!acc[devEui]) acc[devEui] = []
          acc[devEui].push(attribute)
          return acc
        }, {})

        const body = {
          data: mappedData,
          visualization_type: 'clustered',
          summary: clusteredSummaryType.toLowerCase(),
        }

        if (toggleView === 'dateTimePicker') {
          if (startTime && endTime) {
            body.start_time = startTime
            body.end_time = endTime
            body.aggregation = clusteredSelectedAggregation
          }
        } else if (toggleView === 'timeButtons') {
          body.period = clusteredSelectedTime
          body.aggregation = clusteredSelectedAggregation
        }

          const sensorIds = Object.keys(mappedData)
          const payloadTypes = Object.values(mappedData).flat()
        
          body.sensor_ids = sensorIds
          body.payload_types = payloadTypes

          if (timeFilter.start && timeFilter.end) {
            body.time_filter = {
              start: timeFilter.start.format('HH:mm'),
              end: timeFilter.end.format('HH:mm')
            }
          }

          if (dayFilter.length > 0) {
            body.day_filter = dayFilter.map(i => dayOptions[i])
}

        const endpoint = toggleView === 'dateTimePicker' ? serverDataEndpoint : serverDataButtonEndpoint

        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
          .then(response => response.json())
            .then(json => {
              if (json && Array.isArray(json.data)) {
                const deviceReadingsMap = {}
                const colors = [
                  '#1795ff', '#890BE0', '#59A14F', '#ff3232', '#e70096',
                  '#F28E2B', '#B6992D', '#00f1ed', '#880000', '#8CD17D'
                ]

                // Sort by timestamp
                json.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

                json.data.forEach(item => {
                  const key = `${item.dev_eui}-${item.payload_type}`
                  if (!deviceReadingsMap[key]) {
                    const device = availableReadingColumns[item.dev_eui]
                    const reading = device?.find(r => r.payload_value === item.payload_type)
                    const displayName = reading?.display_name || item.payload_type

                    deviceReadingsMap[key] = {
                      x: [],
                      y: [],
                      name: `${selectedDevices[item.dev_eui]} ${displayName}`,
                      unit: item.unit || ''
                    }
                  }

                  deviceReadingsMap[key].x.push(item.timestamp)
                  deviceReadingsMap[key].y.push(parseFloat(item.value))
                })

                const traces = Object.values(deviceReadingsMap).map((trace, i) => ({
                  type: 'bar',
                  name: trace.name,
                  x: trace.x,
                  y: trace.y,
                  marker: { color: colors[i % colors.length] },
                  hovertemplate: `
                    <span style="text-align:left;">
                      %{x}<br>
                      %{fullData.name}: <b>%{y:.2f} ${trace.unit}</b>
                    </span><extra></extra>
                  `,
                  hoverlabel: {
                    bgcolor: 'white',
                    bordercolor: colors[i % colors.length], 
                    borderwidth: 5,                         
                    font: {
                      color: '#000',
                      size: 12
                    },
                    align: 'left' 
                  }
                }))

                setPlotlyData({
                  data: traces,
                    layout: {
                      barmode: 'group',
                      xaxis: {
                        title: 'Time',
                        type: 'date',
                        tickformat: '%m/%d/%Y</b><br>%I:%M:%S %p',
                        tickfont: { size: 11 },
                        hoverformat: '%m/%d/%Y %I:%M:%S %p',
                        tickangle: 0,
                        automargin: true,
                        fixedrange: false,
                      },
                      yaxis: { 
                        title: `${clusteredSelectedAggregation.toUpperCase()} Value`,
                        tickformat: traces[0]?.unit ? ',.2f' : ',d'
                      },
                      showlegend: true,
                      legend: { orientation: 'h', y: -0.3 }
                    }
                })
              }
            })

          .catch(error => console.error('Error:', error))
      }
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

        <ToggleButtonGroup
          value={visualizationMode}
          exclusive
          onChange={(_, newMode) => {
            if (newMode) 
              setVisualizationMode(newMode)
              resetAllInputs()
          }}
          aria-label="Visualization mode"
          style={{ marginBottom: '20px' }}
        >
          <ToggleButton value="timeSeries" aria-label="Time series">
            <TrendingUpIcon style={{ marginRight: 8 }} />
            Time Series Chart
          </ToggleButton>
          <ToggleButton value="clustered" aria-label="Clustered columns">
            <StackedBarChartIcon style={{ marginRight: 8 }} />
            Clustered Column Chart
          </ToggleButton>
        </ToggleButtonGroup>

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
                      handleSelectedReadingChange(event)
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

  {visualizationMode === 'timeSeries' ? (
    <>
      {/* Time Series Chart Controls */}
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
                        renderValue={(selected) => selected || 'Select Aggregation'}
                        label="Aggregate By"
                      >
                        {aggregationOptions.map((option) => (
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
          {timesOptions.map((time) => (
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
                  renderValue={(selected) => selected || 'Select Aggregation'}
                  label="Aggregate By"
                >
                  {aggregationOptions.map((option) => (
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
  </>
) : (
  <>
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
                  label="Clustered Start Time"
                  value={null}
                  onChange={clusteredConvertLocalToUTCStart}
                />
              </div>

              <div style={{ margin: '0 10px' }}> --------- </div>

              <div>
                <DateTimePicker
                  label="Clustered End Time"
                  value={null}
                  onChange={clusteredConvertLocalToUTCEnd}
                />
              </div>
              {startTime && endTime && (
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: '10px' }}>
              <FormControl sx={{ width: 175 }}>
                <InputLabel id="aggregation-label">Aggregate By</InputLabel>
                <Select
                  value={clusteredSelectedAggregation}
                  onChange={clusteredHandleAggregationChange}
                  displayEmpty
                  renderValue={(selected) => selected || 'Select Aggregation'}
                  label="Aggregate By"
                >
                  {clusteredAggregationOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ marginLeft: 2, width: 175 }}>
              <InputLabel id="summarize-label">Summarize By</InputLabel>
              <Select
                labelId="summarize-label"
                value={clusteredSummaryType}
                onChange={handleClusteredSummaryChange}
                displayEmpty
                renderValue={(selected) => selected || 'Select Summary'}
                label="Summarize By"
              >
                {clusterSummaryOptions.map((option) => (
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
          {clusterTimesOptions.map((time) => (
            <Button
              key={time}
              type="button"
              message={time}
              className="small"
              onClick={() => clusteredSelectTime(time)}
              primary={clusteredSelectedTime === time}
            />
          ))}
          <SubmitButton>Fetch Data</SubmitButton>
            <div style={{ marginLeft: '25px', marginTop: '-20px' }}>
            <FormControl sx={{ width: 175 }}>
              <InputLabel id="aggregation-label">Aggregate By</InputLabel>
              <Select
                value={clusteredSelectedAggregation}
                onChange={clusteredHandleAggregationChange}
                displayEmpty
                renderValue={(selected) => selected || 'Select Aggregation'}
                label="Aggregate By"
              >
                {clusteredAggregationOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ marginLeft: 2, width: 175 }}>
              <InputLabel id="summarize-label">Summarize By</InputLabel>
              <Select
                labelId="summarize-label"
                value={clusteredSummaryType}
                onChange={handleClusteredSummaryChange}
                displayEmpty
                renderValue={(selected) => selected || 'Select Summary'}
                label="Summarize By"
              >
                {clusterSummaryOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            </div>
        </div>
      )}
    </div>
    <MUIButton 
      variant="outlined" 
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setShowAdvanced(!showAdvanced)
      }}
      style={{ marginBottom: '10px' }}
      type="button"
      >
      {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
    </MUIButton>

    {showAdvanced && (
    <div style={{ 
      padding: '15px', 
      borderRadius: '4px',
      marginBottom: '20px',
      marginTop: '10px'
    }}>
    <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
      <div>
        <Typography variant="subtitle2" gutterBottom>
          Filter by time of day
        </Typography>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <TimePicker
              label="From"
              value={timeFilter.start}
              onChange={(newValue) => {
                setTimeFilter(prev => ({
                  ...prev,
                  start: newValue?.isValid?.() ? newValue : null
                }))
              }}
              renderInput={(params) => <TextField {...params} size="small" />}
            />
            <span>to</span>
            <TimePicker
              label="To"
              value={timeFilter.end}
              onChange={(newValue) => {
                setTimeFilter(prev => ({
                  ...prev,
                  end: newValue?.isValid?.() ? newValue : null
                }))
              }}
              renderInput={(params) => <TextField {...params} size="small" />}
            />
          </LocalizationProvider>
        </div>
      </div>

      <div>
        <Typography variant="subtitle2" gutterBottom>
          Filter by day of week
        </Typography>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {dayOptions.map((day, i) => (
            <MUIButton
              key={day}
              multiple
              variant={dayFilter.includes(i) ? 'contained' : 'outlined'}
              onClick={() => handleDayFilterChange(i)}
              size="small"
              type="button"
            >
              {day}
            </MUIButton>
          ))}
        </div>
      </div>
    </div>
  </div>
)}
  </>
)}

            </Form>
          )}
        </Formik>
        <div style={{ paddingRight: '50px', paddingTop: '25px' }}>
          <style>{`
            .plotly .hovertext {
              max-width: none !important;
              white-space: nowrap !important;
              font-family: 'Roboto', sans-serif !important;
            }
            .plotly .xtick text {
              dominant-baseline: hanging;
              text-anchor: middle;
            }
          `}</style>
          {plotlyData && (
            <div 
              id="plotly-data-chart"
              style={{ 
                width: '925px', 
                height: '450px',
                border: '1px solid #eee',
                borderRadius: '4px',
                marginTop: '-20px'
              }}
            />
          )}
        </div>

        {useEffect(() => {
          if (!plotlyData) return

          const baseLayout = {
            width: 925,
            height: 450,
            margin: {
              t: 40,
              b: 120,
              l: 60,
              r: 40,
              pad: 4
            }
          }

          const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToAdd: [
              'zoom2d', 
              'pan2d', 
              'zoomIn2d', 
              'zoomOut2d', 
              'autoScale2d', 
              'resetScale2d'
            ],
            scrollZoom: true,
            displaylogo: false
          }

          if (visualizationMode === 'timeSeries') {
            const layout = {
              ...baseLayout,
              title: 'Device Data',
              xaxis: {
                title: 'Time',
                type: 'date',
                tickformat: '%m/%d/%Y</b><br>%I:%M:%S %p',
                tickfont: { size: 11 },
                hoverformat: '%m/%d/%Y %I:%M:%S %p',
                showspikes: true,
                spikemode: 'across',
                spikesnap: 'data',
                spikedash: 'dash',
                spikecolor: 'rgba(0,0,0,0.5)',
                spikethickness: 1,
                tickangle: 0,
                automargin: true,
                fixedrange: false,
              },
              yaxis: {
                title: 'Value',
                showspikes: false,
                fixedrange: false,
                zeroline: true,
                zerolinecolor: '#eee'
              },
              hovermode: 'x unified',
              hoverdistance: 30,
              spikedistance: -1,
              showlegend: true,
              legend: {
                orientation: 'h',
                y: -0.25,
                font: { size: 10 },
              }
            }

            Plotly.newPlot('plotly-data-chart', plotlyData, layout, config)
          } else {
            Plotly.newPlot('plotly-data-chart', plotlyData.data, {
              ...baseLayout,
              ...plotlyData.layout
            }, config)
          }

          return () => {
            const plot = document.getElementById('plotly-data-chart')
            if (plot) Plotly.purge(plot)
          }
        }, [plotlyData, visualizationMode, showTrendLines])}
      </div>
    </Require>
  )
}

export default ApplicationDataVisualization