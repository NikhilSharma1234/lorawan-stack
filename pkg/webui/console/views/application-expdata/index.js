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

import "react-datepicker/dist/react-datepicker.css";
import React, { useState, useEffect, useCallback } from 'react'
import { getDevicesList } from '@console/store/actions/devices'
import DatePicker from 'react-datepicker'
import { selectSelectedApplicationId } from "@console/store/selectors/applications";
import { selectSelectedDevice } from "@console/store/selectors/devices";
import { useSelector, useDispatch } from 'react-redux'
import Button from '@ttn-lw/components/button'
import PageTitle from '@ttn-lw/components/page-title'
import { useParams } from 'react-router-dom'
import Breadcrumb from '@ttn-lw/components/breadcrumbs/breadcrumb'
import { useBreadcrumbs } from '@ttn-lw/components/breadcrumbs/context'
import Require from '@console/lib/components/require'
import style from '@console/views/app/app.styl'
import useRootClass from '@ttn-lw/lib/hooks/use-root-class'
import sharedMessages from '@ttn-lw/lib/shared-messages'
import { mayViewApplicationEvents } from '@console/lib/feature-checks'


const ApplicationDataExport = () => {
  const appId = useSelector(selectSelectedApplicationId);
  const devices = useSelector(selectSelectedDevice); 
  const dispatch = useDispatch();
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [data, setData] = useState(null);

  useEffect(() => {
    dispatch(getDevicesList(appId, { page: 1, limit: 100 }, [
      'name',
      'application_server_address',
      'network_server_address',
      'join_server_address',
    ]));
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
    const requestParams = {
      devices: selectedDevices.map(d => d.dev_eui),
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
    <div>
      <h3>Select Time Range</h3>
      <DatePicker
        selected={startTime}
        onChange={date => setStartTime(date)}
        selectsStart
        startDate={startTime}
        endDate={endTime}
      />
      <DatePicker
        selected={endTime}
        onChange={date => setEndTime(date)}
        selectsEnd
        startDate={startTime}
        endDate={endTime}
        minDate={startTime}
      />

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

      <Button onClick={fetchData}>Fetch Data</Button>

      <div className="data-container" style={{ maxHeight: '400px', overflowY: 'scroll' }}>
        {data ? (
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Payload</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.timestamp}>
                  <td>{row.timestamp}</td>
                  <td>{JSON.stringify(row.payload)}</td>
                  <td>{JSON.stringify(row.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No data available</p>
        )}
      </div>
    </div>
  );
};

export default ApplicationDataExport;
