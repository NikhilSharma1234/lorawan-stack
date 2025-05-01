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

import React, { useCallback } from 'react'
import { defineMessages } from 'react-intl'
import PropTypes from 'prop-types'

import splitViewIllustration from '@assets/misc/split-view-illustration.png'

import Button from '@ttn-lw/components/button'

import Message from '@ttn-lw/lib/components/message'

import style from './live-data-tutorial.styl'

const m = defineMessages({
  liveDataSplitView: 'Live data split view',
  liveDataSplitViewDescription:
    'Debug, make changes while keeping an eye on live data from everywhere with split view.',
  gotIt: 'Got it',
  tryIt: 'Try it',
})

const LiveDataTutorial = props => {
  const { setIsOpen, seen, setTutorialSeen } = props

  const handleTryIt = useCallback(() => {
    setIsOpen(true)
    setTutorialSeen()
  }, [setIsOpen, setTutorialSeen])

  return (
    !seen && (
      <div className={style.container}>
        <Message component="h3" content={m.liveDataSplitView} className={style.title} />
        <Message
          component="p"
          content={m.liveDataSplitViewDescription}
          className={style.subtitle}
        />
        <img className={style.image} src={splitViewIllustration} alt="live-data-split-view" />
        <div className={style.buttonGroup}>
          <Button message={m.gotIt} secondary className={style.button} onClick={setTutorialSeen} />
          <Button message={m.tryIt} primary onClick={handleTryIt} className={style.button} />
        </div>
      </div>
    )
  )
}

LiveDataTutorial.propTypes = {
  seen: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
  setTutorialSeen: PropTypes.func.isRequired,
}
LiveDataTutorial.defaultProps = {}

export default LiveDataTutorial
