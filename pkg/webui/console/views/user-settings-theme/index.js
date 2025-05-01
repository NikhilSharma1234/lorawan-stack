// Copyright © 2025 The Things Network Foundation, The Things Industries B.V.
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
import { useSelector } from 'react-redux'

import PageTitle from '@ttn-lw/components/page-title'
import { useBreadcrumbs } from '@ttn-lw/components/breadcrumbs/context'
import Breadcrumb from '@ttn-lw/components/breadcrumbs/breadcrumb'

import Message from '@ttn-lw/lib/components/message'
import RequireRequest from '@ttn-lw/lib/components/require-request'

import ThemeSettingsForm from '@console/containers/user-settings-theme'

import Require from '@console/lib/components/require'

import sharedMessages from '@ttn-lw/lib/shared-messages'

import { mayViewOrEditUserSettings } from '@console/lib/feature-checks'

import { getUser } from '@console/store/actions/users'

import { selectUserId } from '@console/store/selectors/logout'

const m = defineMessages({
  customizeTheme: 'Customize your interface theme.',
})

const ThemeSettings = () => {
  useBreadcrumbs(
    'user-settings.theme',
    <Breadcrumb path="/user-settings/theme" content={sharedMessages.theme} />,
  )

  const userId = useSelector(selectUserId)

  return (
    <Require featureCheck={mayViewOrEditUserSettings} otherwise={{ redirect: '/' }}>
      <RequireRequest requestAction={getUser(userId, ['console_preferences'])}>
        <div className="container container--xxl grid">
          <div className="xxl:item-6 xxl:item-start-4 item-12 item-start-1">
            <PageTitle title={sharedMessages.theme} className="mb-0" />
            <Message content={m.customizeTheme} />
            <ThemeSettingsForm />
          </div>
        </div>
      </RequireRequest>
    </Require>
  )
}

export default ThemeSettings
