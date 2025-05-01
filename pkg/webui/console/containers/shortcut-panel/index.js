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

import React from 'react'
import { defineMessages } from 'react-intl'
import { useDispatch, useSelector } from 'react-redux'
import classNames from 'classnames'

import { APPLICATION } from '@console/constants/entities'

import {
  IconUsersGroup,
  IconKey,
  IconBolt,
  IconApplication,
  IconDevice,
  IconGateway,
} from '@ttn-lw/components/icon'

import sharedMessages from '@ttn-lw/lib/shared-messages'
import PropTypes from '@ttn-lw/lib/prop-types'

import {
  checkFromState,
  mayCreateApplications,
  mayCreateDevices,
  mayCreateEntities,
  mayCreateGateways,
  mayCreateOrganizations,
  mayViewOrEditUserApiKeys,
} from '@console/lib/feature-checks'

import { setSearchOpen, setSearchScope } from '@console/store/actions/search'

import { selectUser } from '@console/store/selectors/user'

import Panel from '../../../components/panel'

import ShortcutItem from './shortcut-item'

const m = defineMessages({
  shortcuts: 'Quick actions',
  addEndDevice: 'Add end device',
})

const ShortcutPanel = ({ panelClassName, mobile }) => {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const mayCreateApps = useSelector(state =>
    user ? checkFromState(mayCreateApplications, state) : false,
  )
  const mayCreateGtws = useSelector(state =>
    user ? checkFromState(mayCreateGateways, state) : false,
  )
  const mayCreateOrgs = useSelector(state =>
    user ? checkFromState(mayCreateOrganizations, state) : false,
  )
  const mayCreateKeys = useSelector(state =>
    user ? checkFromState(mayViewOrEditUserApiKeys, state) : false,
  )
  const mayCreateDev = useSelector(state =>
    user ? checkFromState(mayCreateDevices, state) : false,
  )
  const hasCreateRights = useSelector(state =>
    user ? checkFromState(mayCreateEntities, state) : false,
  )

  const handleRegisterDeviceClick = React.useCallback(() => {
    dispatch(setSearchScope(APPLICATION))
    dispatch(setSearchOpen(true))
  }, [dispatch])

  const shortcutItems = [
    {
      hasRight: mayCreateApps,
      icon: IconApplication,
      title: sharedMessages.createApplication,
      link: '/applications/add',
    },
    {
      hasRight: mayCreateDev,
      icon: IconDevice,
      title: m.addEndDevice,
      action: handleRegisterDeviceClick,
    },
    {
      hasRight: mayCreateOrgs,
      icon: IconUsersGroup,
      title: sharedMessages.createOrganization,
      link: '/organizations/add',
    },
    {
      hasRight: mayCreateKeys,
      icon: IconKey,
      title: sharedMessages.addApiKey,
      link: '/user-settings/api-keys/add',
    },
    {
      hasRight: mayCreateGtws,
      icon: IconGateway,
      title: sharedMessages.registerGateway,
      link: '/gateways/add',
    },
  ]

  if (!hasCreateRights) {
    return null
  }

  if (mobile) {
    return (
      <div className="d-flex gap-cs-s">
        {shortcutItems
          .filter(item => item.hasRight)
          .map(({ icon, title, link, action }, index) => (
            <ShortcutItem
              key={index}
              icon={icon}
              title={title}
              link={link}
              action={action}
              mobile
            />
          ))}
      </div>
    )
  }

  return (
    <Panel title={m.shortcuts} icon={IconBolt} className={classNames(panelClassName, 'h-full')}>
      <div className="d-flex gap-cs-xs w-full">
        {shortcutItems
          .filter(item => item.hasRight)
          .map(({ icon, title, link, action }, index) => (
            <ShortcutItem key={index} icon={icon} title={title} link={link} action={action} />
          ))}
      </div>
    </Panel>
  )
}

ShortcutPanel.propTypes = {
  mobile: PropTypes.bool,
  panelClassName: PropTypes.string,
}

ShortcutPanel.defaultProps = {
  panelClassName: undefined,
  mobile: false,
}

export default ShortcutPanel
