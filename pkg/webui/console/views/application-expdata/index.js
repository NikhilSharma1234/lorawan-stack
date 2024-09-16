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

import React, { useState, useEffect } from 'react'
import { getDevicesList } from '@console/store/actions/devices'
import { selectSelectedApplicationId } from "@console/store/selectors/applications";
import { selectSelectedDevice } from "@console/store/selectors/devices";
import { useSelector, useDispatch } from 'react-redux'
import Button from '@ttn-lw/components/button'
import Breadcrumb from '@ttn-lw/components/breadcrumbs/breadcrumb'
import { useBreadcrumbs } from '@ttn-lw/components/breadcrumbs/context'
import style from '@console/views/app/app.styl'
import useRootClass from '@ttn-lw/lib/hooks/use-root-class'
import sharedMessages from '@ttn-lw/lib/shared-messages'
import attachPromise from '@ttn-lw/lib/store/actions/attach-promise'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import CsvDownloadButton from 'react-json-to-csv';

const ApplicationDataExport = () => {
  const appId = useSelector(selectSelectedApplicationId);
  const devices = useSelector(selectSelectedDevice); 
  const dispatch = useDispatch();
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [data, setData] = useState(null);
  const dascaluDevices = {
    'A8404188D9592DCC': 'dragino-soil-moisture1',
    'A84041DF90592DCD': 'dragino-soil-moisture2',
    'A84041B6F65929CB': 'dragino-soil-moisture3',
    '0025CA0A0001BB35': 'laird-temp4',
    '0025CA0A0001BB40': 'laird-temp2'
  };

  useEffect(async () => {
    const devicesNew = await dispatch(attachPromise(
      getDevicesList(appId, { page: 1, limit: 100 }, [
      'name',
      'application_server_address',
      'network_server_address',
      'join_server_address',
    ])));
    console.log("here")
    console.log(devicesNew)
  }, [appId, dispatch]);

  useEffect(() => {
    if (devices) {
      console.log('Devices List:', devices);
    }
  }, [devices]);

  const handleDeviceSelect = (device) => {
    setSelectedDevices(prev =>
      prev.some(d => d.dev_eui === device.dev_eui)
        ? prev.filter(d => d.dev_eui !== device.dev_eui)
        : [...prev, device],
    );
  };

  const fetchData = () => {
    // const requestParams = {
    //   devices: selectedDevices.map(d => d.dev_eui),
    //   startTime,
    //   endTime,
    // };
    console.log(startTime)
    const requestParams = {
      devices: Object.keys(dascaluDevices),
      startTime,
      endTime,
    };

    fetch('http://localhost:5001/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestParams),
    })
      .then(response => response.json())
      .then(json => {
        console.log('Export Data:', json.data);
        setData(json.data);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  };

  useRootClass(style.stageFlex, 'stage')

  useBreadcrumbs(
    'apps.single.data',
    <Breadcrumb path={`/applications/${appId}/datavis`} content={sharedMessages.dataVis} />,
  )


  return (
    <div style={{ margin: '30px' }}>
      <h3>Select Time Range</h3>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><DateTimePicker label="Start Time" value={null} onChange={(startDate) => {
          setStartTime(startDate);
        }}/></div>
          <div>  ---------  </div>
          <div><DateTimePicker label="End Time" value={null} onChange={(endDate) => {
            setEndTime(endDate);
          }}/></div>
        </div>
        
    </LocalizationProvider>

      <h3>Select Devices</h3>
      {devices && devices.map(device => (
        <div key={device.dev_eui}>
          <input
            type="checkbox"
            value={device.dev_eui}
            onChange={() => handleDeviceSelect(device)}
          />
          {device.name} (DevEUI: {device.dev_eui})
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px'}}>
      <Button onClick={fetchData}>Fetch Data</Button>
        {data ? (
          <CsvDownloadButton data={data} />
        ): null}
      </div>
      

      <div className="data-container" style={{ maxHeight: '400px', overflowY: 'scroll' }}>
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
                  <td style={{ textAlign: 'left' }}>{dascaluDevices[row.dev_eui]}</td>
                  <td style={{ textAlign: 'center' }}>{row.timestamp}</td>
                  <td style={{ textAlign: 'center' }}>{JSON.stringify(row.temperature || '')}</td>
                  <td style={{ textAlign: 'center' }}>{JSON.stringify(row.temp_SOIL || '')}</td>
                  <td style={{ textAlign: 'center' }}>{JSON.stringify(row.water_SOIL || '')}</td>
                </tr>
              </>
              
              ))}
            </tbody>
          </table>
        ) : (
          <p>No data available</p>
        )}
      </div>
      {data ? (
        <CsvDownloadButton data={data} />
      ): null}
    </div>
  );
};

export default ApplicationDataExport;
