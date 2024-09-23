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
import CsvDownloadButton from 'react-json-to-csv'
import { Select } from '@mui/material'
import OutlinedInput from '@mui/material/OutlinedInput'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import ListItemText from '@mui/material/ListItemText'
import Checkbox from '@mui/material/Checkbox'
import Paper from '@mui/material/Paper'
import { DataGrid } from '@mui/x-data-grid'

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
  const [availableDevices, setAvailableDevices] = useState({
    A8404188D9592DCC: 'dragino-soil-moisture1',
    A84041DF90592DCD: 'dragino-soil-moisture2',
    A84041B6F65929CB: 'dragino-soil-moisture3',
    '0025CA0A0001BB35': 'laird-temp4',
    '0025CA0A0001BB40': 'laird-temp2',
  })
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)
  const [data, setData] = useState(null)
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

  useEffect(() => {
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
      // SetAvailableDevices(devicesNew)
    }
    fetchDevices()
  }, [appId, dispatch])

  const fetchData = () => {
    // Const requestParams = {
    //   devices: selectedDevices.map(d => d.dev_eui),
    //   startTime,
    //   endTime,
    // };
    const requestParams = {
      devices: Object.keys(selectedDevices),
      startTime,
      endTime,
    }

    fetch('http://localhost:5001/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestParams),
    })
      .then(response => response.json())
      .then(json => {
        console.log('Export Data:', json.data)
        setData(json.data)
      })
      .catch(error => {
        console.error('Error fetching data:', error)
      })
  }

  const handleChange = useCallback(
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
          newSelectedDevices[key] = availableDevices[key]
        }
        setSelectedDevices(newSelectedDevices)
      }
    },
    [selectedDevices, availableDevices],
  )

  useRootClass(style.stageFlex, 'stage')

  useBreadcrumbs(
    'apps.single.data',
    <Breadcrumb path={`/applications/${appId}/datavis`} content={sharedMessages.dataVis} />,
  )

  const columns = [
    {
      field: 'dev_eui',
      headerName: 'Device Name',
      description: 'Name of the device',
      width: 175,
      valueGetter: value => availableDevices[value],
    },
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      description: 'Timestamp from reading',
      width: 250,
    },
    {
      field: 'temperature',
      headerName: 'Temperature',
      description: 'Temperature reading from sensor',
      type: 'number',
      width: 90,
    },
    {
      field: 'temp_SOIL',
      headerName: 'Soil Temperature',
      description: 'Soil temperature from sensor',
      type: 'number',
      width: 90,
    },
    {
      field: 'water_SOIL',
      headerName: 'Soil Moisture',
      description: 'Soil moisture from sensor',
      sortable: false,
      width: 90,
    },
  ]

  const paginationModel = { page: 0, pageSize: 5 }

  return (
    <div style={{ margin: '30px' }}>
      <h3>Select Time Range</h3>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div>
            <DateTimePicker label="Start Time" value={null} onChange={setStartTime} />
          </div>
          <div style={{ margin: '0 20px' }}> --------- </div>
          <div>
            <DateTimePicker label="End Time" value={null} onChange={setEndTime} />
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
            onChange={handleChange}
            input={<OutlinedInput label="Selected Devices" />}
            renderValue={() => Object.values(selectedDevices).join(', ')}
            MenuProps={MenuProps}
          >
            {Object.keys(availableDevices).map(key => (
              <MenuItem key={availableDevices[key]} value={key}>
                <Checkbox checked={Object.keys(selectedDevices).includes(key)} />
                <ListItemText primary={availableDevices[key]} />
              </MenuItem>
            ))}
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
        <SubmitButton onClick={fetchData}>Fetch Data</SubmitButton>
        {data ? <CsvDownloadButton style={{ margin: '0px 20px' }} data={data} /> : null}
      </div>
      {/* <div className="data-container" style={{ maxHeight: '400px', overflowY: 'scroll' }}>
        {data ? (
          <table style={{ border: '1px solid black' }}>
            <thead>
              <tr>
                <th style={{ width: '200px', textAlign: 'left' }}>Device Name</th>
                <th>Timestamp</th>
                <th>Temperature</th>
                <th style={{ width: '100px' }}>Soil Temperature</th>
                <th>Soil Moisture</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <>
                  <tr key={row.item_number}>
                    <td style={{ textAlign: 'left' }}>{availableDevices[row.dev_eui]}</td>
                    <td style={{ textAlign: 'center' }}>{row.timestamp}</td>
                    <td style={{ textAlign: 'center' }}>{JSON.stringify(row.temperature || '')}</td>
                    <td style={{ textAlign: 'center' }}>{JSON.stringify(row.temp_SOIL || '')}</td>
                    <td style={{ textAlign: 'center' }}>{JSON.stringify(row.water_SOIL || '')}</td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        ) : null}
      </div> */}
      {data ? (
        <Paper sx={{ height: 400, width: '100%' }}>
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
