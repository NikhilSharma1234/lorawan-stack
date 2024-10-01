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

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart } from '@mui/x-charts/LineChart';
import { Select, OutlinedInput, InputLabel, MenuItem, FormControl, Checkbox, ListItemText } from '@mui/material';
import Breadcrumb from '@ttn-lw/components/breadcrumbs/breadcrumb';
import { useBreadcrumbs } from '@ttn-lw/components/breadcrumbs/context';
import Require from '@console/lib/components/require';
import style from '@console/views/app/app.styl';
import useRootClass from '@ttn-lw/lib/hooks/use-root-class';
import sharedMessages from '@ttn-lw/lib/shared-messages';
import { mayViewApplicationEvents } from '@console/lib/feature-checks';
import Button from '@ttn-lw/components/button';
import SubmitButton from '@ttn-lw/components/submit-button';

const ApplicationDataVisualization = () => {
  const { appId } = useParams();

  const [data, setData] = useState(null);
  const [selectedDevices, setSelectedDevices] = useState({});
  const [availableDevices, setAvailableDevices] = useState({
    'A8404188D9592DCC': 'dragino-soil-moisture1',
    'A84041DF90592DCD': 'dragino-soil-moisture2',
    'A84041B6F65929CB': 'dragino-soil-moisture3',
    '0025CA0A0001BB35': 'laird-temp4',
    '0025CA0A0001BB40': 'laird-temp2',
  });

  const [selectedSensor, setSelectedSensor] = useState('');
  const [selectedTime, setSelectedTime] = useState('1H');
  const [graphData, setGraphData] = useState([]);

  const ITEM_HEIGHT = 48;
  const ITEM_PADDING_TOP = 8;
  const MenuProps = {
    PaperProps: {
      style: {
        maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
        width: 250,
      },
    },
  };

  const timesOptions = ['1H', '24H', '7D', '14D', '30D', '6M', '1Y', 'ALL'];

  const handleDeviceChange = useCallback(
    (event) => {
      const {
        target: { value },
      } = event;

      const newSelectedDevices = {};
      for (const key of value) {
        newSelectedDevices[key] = availableDevices[key];
      }
      setSelectedDevices(newSelectedDevices);
    },
    [availableDevices],
  );

  const handleSensorChange = (event) => {
    setSelectedSensor(event.target.value);
  };

  const selectTime = (time) => {
    setSelectedTime(time);
  };

  const fetchData = () => {
    fetch('http://localhost:5001/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sensor_ids: Object.keys(selectedDevices),
        payload_type: selectedSensor,
        period: selectedTime,
      }),
    })
      .then((response) => response.json())
      .then((json) => {
        const dataset = {};

        json.data.forEach((item) => {
          const timestamp = new Date(item.timestamp).getTime();
          const sensorValue = parseFloat(item[selectedSensor]) || null;

          if (!dataset[timestamp]) {
            dataset[timestamp] = { timestamp };
          }

          dataset[timestamp][item.dev_eui] = sensorValue;
        });

        const datasetArray = Object.values(dataset).sort((a, b) => a.timestamp - b.timestamp);

        const series = Object.keys(selectedDevices).map((deviceEui) => ({
          dataKey: deviceEui,
          label: selectedDevices[deviceEui] || deviceEui,
        }));

        setGraphData({ dataset: datasetArray, series });
      })
      .catch((error) => console.error('Error fetching data:', error));
  };

  useRootClass(style.stageFlex, 'stage');

  useBreadcrumbs(
    'apps.single.data',
    <Breadcrumb path={`/applications/${appId}/datavis`} content={sharedMessages.dataVis} />,
  );

  return (
    <Require featureCheck={mayViewApplicationEvents} otherwise={{ redirect: `/applications/${appId}` }}>
      <div style={{ marginLeft: '30px' }}>
        <h3>Devices</h3>
        <FormControl sx={{ width: 300 }}>
          <InputLabel id="device-select-label">Selected Devices</InputLabel>
          <Select
            labelId="device-select-label"
            id="device-select"
            multiple
            value={Object.keys(selectedDevices)}
            onChange={handleDeviceChange}
            input={<OutlinedInput label="Selected Devices" />}
            renderValue={() => Object.values(selectedDevices).join(', ')}
            MenuProps={MenuProps}
          >
            {Object.keys(availableDevices).map((key) => (
              <MenuItem key={availableDevices[key]} value={key}>
                <Checkbox checked={Object.keys(selectedDevices).includes(key)} />
                <ListItemText primary={availableDevices[key]} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      <div style={{ margin: '30px' }}>
        <h3>Sensor Readings</h3>
        <FormControl sx={{ width: 300 }}>
          <InputLabel id="sensor-select-label">Selected Reading</InputLabel>
          <Select
            labelId="sensor-select-label"
            id="sensor-select"
            value={selectedSensor}
            onChange={handleSensorChange}
            input={<OutlinedInput label="Selected Devices" />}
          >
            <MenuItem value="batteryCapacity">Battery Capacity</MenuItem>
            <MenuItem value="temperature">Temperature</MenuItem>
            <MenuItem value="temp_SOIL">Soil Temperature</MenuItem>
            <MenuItem value="water_SOIL">Soil Moisture</MenuItem>
            <MenuItem value="conduct_SOIL">Soil Conductivity</MenuItem>

          </Select>
        </FormControl>
      </div>

      <div style={{ margin: '30px', display: 'flex', gap: '10px' }}>
        {timesOptions.map((time) => (
          <Button
            key={time}
            message={time}
            className="small"
            onClick={() => selectTime(time)}
            primary={selectedTime === time}
          />
        ))}
        <SubmitButton onClick={fetchData}>Fetch Data</SubmitButton>
      </div>

      {graphData && graphData.dataset && graphData.dataset.length > 0 && (
        <LineChart
          dataset={graphData.dataset}
          xAxis={[
            {
              dataKey: 'timestamp',
              valueFormatter: (value) => new Date(value).toLocaleString(),
              scaleType: 'time',
            },
          ]}
          series={graphData.series.map((series) => ({
            ...series,
            showMark: false,
          }))}
          width={800}
          height={400}
        />
      )}
    </Require>
  );
};

export default ApplicationDataVisualization;
