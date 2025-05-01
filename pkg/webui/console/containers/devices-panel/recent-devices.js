// Copyright © 2024 The Things Network Foundation, The Things Industries B.V.
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

import React, { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { createSelector } from 'reselect'

import VerticalScrollFader from '@ttn-lw/components/vertical-scroll-fader'
import Status from '@ttn-lw/components/status'
import Button from '@ttn-lw/components/button'
import { IconPlus } from '@ttn-lw/components/icon'

import FetchTable from '@ttn-lw/containers/fetch-table'

import Message from '@ttn-lw/lib/components/message'

import LastSeen from '@console/components/last-seen'

import sharedMessages from '@ttn-lw/lib/shared-messages'

import { getDevicesList } from '@console/store/actions/devices'

import {
  selectDevicesWithLastSeen,
  selectDevicesTotalCount,
} from '@console/store/selectors/devices'
import { selectSelectedApplicationId } from '@console/store/selectors/applications'

import style from './devices-panel.styl'

const RecentEndDevices = () => {
  const listRef = React.useRef()
  const devices = useSelector(selectDevicesWithLastSeen)
  const totalCount = useSelector(selectDevicesTotalCount)
  const appId = useSelector(selectSelectedApplicationId)

  const getItemsAction = useCallback(
    () =>
      getDevicesList(appId, { page: 1, limit: 20, order: '-last_seen_at' }, [
        'name',
        'last_seen_at',
      ]),
    [appId],
  )

  const baseDataSelector = createSelector(
    selectDevicesWithLastSeen,
    selectDevicesTotalCount,
    (devices, totalCount) => ({
      devices,
      totalCount,
      mayAdd: false,
    }),
  )

  const headers = [
    {
      name: 'name',
      displayName: sharedMessages.name,
      getValue: row => ({
        id: row.ids.device_id,
        name: row.name,
      }),
      render: ({ id, name }) =>
        Boolean(name) ? (
          <>
            <span className="mt-0 mb-cs-xxs p-0 fw-bold d-block">{name}</span>
            <span className="c-text-neutral-light d-block">{id}</span>
          </>
        ) : (
          <span className="mt-0 p-0 fw-bold d-block">{id}</span>
        ),
    },
    {
      name: 'last_seen_at',
      displayName: sharedMessages.lastSeen,
      width: '9rem',
      render: lastSeen => {
        const showLastSeen = Boolean(lastSeen)
        return showLastSeen ? (
          <LastSeen lastSeen={lastSeen} short statusClassName="j-end" />
        ) : (
          <Status
            status="mediocre"
            label={sharedMessages.noRecentActivity}
            className="d-flex j-end al-center"
          />
        )
      },
    },
  ]

  return devices.length === 0 && totalCount === 0 ? (
    <div className="d-flex direction-column flex-grow j-center gap-cs-l">
      <div>
        <Message
          content={sharedMessages.noRecentEndDevices}
          className="d-block text-center fs-l fw-bold"
        />
        <Message
          content={sharedMessages.noRecentEndDevicesDescription}
          className="d-block text-center c-text-neutral-light"
        />
      </div>
      <div className="text-center">
        <Button.Link
          to={`/applications/${appId}/devices/add`}
          primary
          message={sharedMessages.registerEndDevice}
          icon={IconPlus}
        />
      </div>
    </div>
  ) : (
    <VerticalScrollFader
      className={style.scrollGradient}
      faderHeight="4rem"
      topFaderOffset="3rem"
      light
      ref={listRef}
    >
      <FetchTable
        entity="devices"
        defaultOrder="-last_seen_at"
        headers={headers}
        pageSize={20}
        baseDataSelector={baseDataSelector}
        getItemsAction={getItemsAction}
        itemPathPrefix={`/applications/${appId}/devices/`}
        paginated={false}
        className={style.devicesPanelOuterTable}
        headerClassName={style.devicesPanelOuterTableHeader}
        panelStyle
      />
    </VerticalScrollFader>
  )
}

export default RecentEndDevices
