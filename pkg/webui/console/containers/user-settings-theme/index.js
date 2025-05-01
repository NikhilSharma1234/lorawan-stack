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

import React, { useCallback, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { defineMessages } from 'react-intl'

import themeDark from '@ttn-lw/assets/misc/console-theme-dark.png'
import themeLight from '@ttn-lw/assets/misc/console-theme-light.png'
import themeSystem from '@ttn-lw/assets/misc/console-theme-system.png'

import toast from '@ttn-lw/components/toast'
import Form, { useFormContext } from '@ttn-lw/components/form'
import SubmitBar from '@ttn-lw/components/submit-bar'
import SubmitButton from '@ttn-lw/components/submit-button'
import Button from '@ttn-lw/components/button'
import Radio from '@ttn-lw/components/radio-button'

import Yup from '@ttn-lw/lib/yup'
import diff from '@ttn-lw/lib/diff'
import attachPromise from '@ttn-lw/lib/store/actions/attach-promise'
import sharedMessages from '@ttn-lw/lib/shared-messages'
import PropTypes from '@ttn-lw/lib/prop-types'

import { updateUser, updateUserSuccess } from '@console/store/actions/user'

import { selectUserId } from '@console/store/selectors/logout'
import { selectSelectedUser } from '@console/store/selectors/users'

const m = defineMessages({
  updateTheme: 'Theme updated',
  light: 'Light',
  dark: 'Dark',
  system: 'System',
})

const validationSchema = Yup.object().shape({
  console_preferences: Yup.object().shape({
    console_theme: Yup.string()
      .oneOf(['CONSOLE_THEME_LIGHT', 'CONSOLE_THEME_DARK', 'CONSOLE_THEME_SYSTEM'])
      .required(sharedMessages.validateRequired),
  }),
})

const InnerThemeForm = ({ initialValues }) => {
  const dispatch = useDispatch()
  const { resetForm } = useFormContext()

  const handleThemeChange = useCallback(
    value => {
      dispatch(updateUserSuccess({ console_preferences: { console_theme: value } }))
    },
    [dispatch],
  )

  const handleDiscardChanges = useCallback(() => {
    resetForm(initialValues)
    dispatch(updateUserSuccess(initialValues))
  }, [resetForm, initialValues, dispatch])

  return (
    <>
      <Form.Field
        name="console_preferences.console_theme"
        component={Radio.Group}
        horizontal
        spaceBetween
        className="m-vert-cs-xxl"
        onChange={handleThemeChange}
      >
        <Radio
          label={m.light}
          value="CONSOLE_THEME_LIGHT"
          className="w-30 direction-column al-start"
        >
          <img src={themeLight} alt="Light theme" className="w-full mb-cs-s" />
        </Radio>
        <Radio label={m.dark} value="CONSOLE_THEME_DARK" className="w-30 direction-column al-start">
          <img src={themeDark} alt="Dark theme" className="w-full mb-cs-s" />
        </Radio>
        <Radio
          label={m.system}
          value="CONSOLE_THEME_SYSTEM"
          className="w-30 direction-column al-start"
        >
          <img src={themeSystem} alt="System theme" className="w-full mb-cs-s" />
        </Radio>
      </Form.Field>
      <SubmitBar align="start">
        <Form.Submit component={SubmitButton} message={sharedMessages.saveChanges} />
        <Button
          type="button"
          secondary
          message={sharedMessages.discardChanges}
          onClick={handleDiscardChanges}
        />
      </SubmitBar>
    </>
  )
}

InnerThemeForm.propTypes = {
  initialValues: PropTypes.shape({}).isRequired,
}

const ThemeSettingsForm = () => {
  const dispatch = useDispatch()
  const [error, setError] = useState()
  const userId = useSelector(selectUserId)
  const user = useSelector(selectSelectedUser)
  const theme = user.console_preferences.console_theme

  const initialValues = {
    console_preferences: {
      console_theme: theme || 'CONSOLE_THEME_SYSTEM',
    },
  }

  const handleSubmit = useCallback(
    async (values, { resetForm, setSubmitting }) => {
      setError(undefined)
      const themeDiff = diff(user.console_preferences, values.console_preferences)
      const patch = {
        console_preferences: {
          ...user.console_preferences,
          ...themeDiff,
        },
      }

      try {
        await dispatch(attachPromise(updateUser({ id: userId, patch })))
        toast({
          title: sharedMessages.success,
          message: m.updateTheme,
          type: toast.types.SUCCESS,
        })
      } catch (error) {
        setError(error)
        setSubmitting(false)
        resetForm(initialValues)
      }
    },
    [dispatch, userId, initialValues, user],
  )

  return (
    <Form
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      error={error}
    >
      <InnerThemeForm initialValues={initialValues} />
    </Form>
  )
}

export default ThemeSettingsForm
