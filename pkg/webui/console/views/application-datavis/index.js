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
import { useParams } from 'react-router-dom'
import { Chart } from "react-google-charts"
import PageTitle from '@ttn-lw/components/page-title'
import Breadcrumb from '@ttn-lw/components/breadcrumbs/breadcrumb'
import { useBreadcrumbs } from '@ttn-lw/components/breadcrumbs/context'
import Require from '@console/lib/components/require'
import style from '@console/views/app/app.styl'
import useRootClass from '@ttn-lw/lib/hooks/use-root-class'
import sharedMessages from '@ttn-lw/lib/shared-messages'
import { mayViewApplicationEvents } from '@console/lib/feature-checks'

const ApplicationDataVisualization = () => {
  const { appId } = useParams()

  const dataFake = [
    ["Time", "Temperature"],
    ["", 1000],
    ["", 1170],
    ["", 660],
    ["", 1030],
  ];
  
  const options = {
    title: "Sensor Data",
    curveType: "function",
    legend: { position: "bottom" },
  };

  const [data, setData] = useState(null);
  const server = process.env.FLASK_DATA_ENDPOINT;
  useEffect(() => {
    fetch(server)
      .then(response => response.json())
      .then(json => {
        console.log("HEHE")
        console.log(json.data)
        const newArr = [];
        newArr.push(["Time", "Temperature"])
        for(let row = 0; row < json.data.length; row++) {
          let rowData = json.data[row];
          console.log(json.data[row])
          if (rowData.payload.temperature) newArr.push([rowData.timestamp, rowData.payload.temperature]);
        }
        console.log(newArr)
        setData(newArr)
      })
      .catch(error => console.error(error));
  }, []);

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
      <PageTitle title={sharedMessages.dataVis} />
      <Chart
      chartType="LineChart"
      width="100%"
      height="400px"
      data={data}
      options={options}
      />
    </Require>
  )
}

export default ApplicationDataVisualization

