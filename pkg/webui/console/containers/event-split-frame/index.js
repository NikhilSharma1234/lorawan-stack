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

import React, { useContext, useCallback, useRef, useEffect } from 'react'
import DOM from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'

import Button from '@ttn-lw/components/button'
import { IconChevronUp } from '@ttn-lw/components/icon'

import RequireRequest from '@ttn-lw/lib/components/require-request'

import LiveDataTutorial from '@console/components/live-data-tutorial'

import PropTypes from '@ttn-lw/lib/prop-types'
import attachPromise from '@ttn-lw/lib/store/actions/attach-promise'
import sharedMessages from '@ttn-lw/lib/shared-messages'

import { getUser } from '@console/store/actions/users'
import { updateUser } from '@console/store/actions/user'

import { selectUserId } from '@console/store/selectors/logout'
import { selectUserById } from '@console/store/selectors/users'
import { selectConsolePreferences } from '@console/store/selectors/user-preferences'

import EventSplitFrameContext from './context'

import style from './event-split-frame.styl'

const EventSplitFrameInner = ({ children }) => {
  const { isOpen, height, isActive, setHeight, setIsMounted, setIsOpen } =
    useContext(EventSplitFrameContext)
  const ref = useRef()
  const dispatch = useDispatch()
  const userId = useSelector(selectUserId)
  const user = useSelector(state => selectUserById(state, userId))
  const consolePreferences = useSelector(state => selectConsolePreferences(state))
  const tutorialsSeen = consolePreferences.tutorials?.seen || []
  const seen = tutorialsSeen.includes('TUTORIAL_LIVE_DATA_SPLIT_VIEW')

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [setIsMounted])

  const setTutorialSeen = useCallback(async () => {
    const patch = {
      console_preferences: {
        tutorials: {
          seen: [...tutorialsSeen, 'TUTORIAL_LIVE_DATA_SPLIT_VIEW'],
        },
      },
    }

    await dispatch(attachPromise(updateUser({ id: user.ids.user_id, patch })))
  }, [dispatch, tutorialsSeen, user.ids.user_id])

  // Handle the dragging of the handler to resize the frame.
  const handleDragStart = useCallback(
    e => {
      e.preventDefault()

      const startY = e.clientY
      const startHeight = height

      const handleDragMove = e => {
        const newHeight = startHeight + (startY - e.clientY)
        setHeight(Math.max(3 * 14, newHeight))
      }

      const handleDragEnd = () => {
        window.removeEventListener('mousemove', handleDragMove)
        window.removeEventListener('mouseup', handleDragEnd)
      }

      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
    },
    [height, setHeight],
  )

  if (!isActive) {
    return null
  }

  return (
    <div className={style.container} style={{ height }} ref={ref}>
      {isOpen && (
        <>
          <div className={style.header} onMouseDown={handleDragStart}>
            <div className={style.handle} />
          </div>
          <div className={style.content}>{children}</div>
        </>
      )}
      {isActive && !isOpen && (
        <div className={style.openButton}>
          <LiveDataTutorial setIsOpen={setIsOpen} setTutorialSeen={setTutorialSeen} seen={seen} />
          <Button
            icon={IconChevronUp}
            className={style.liveDataButton}
            onClick={() => setIsOpen(true)}
            message={sharedMessages.liveData}
          />
        </div>
      )}
    </div>
  )
}

EventSplitFrameInner.propTypes = {
  children: PropTypes.node.isRequired,
}

const EventSplitFrame = props => {
  const userId = useSelector(selectUserId)

  return DOM.createPortal(
    <RequireRequest requestAction={getUser(userId, ['console_preferences'])}>
      <EventSplitFrameInner {...props} />
    </RequireRequest>,
    document.getElementById('split-frame'),
  )
}

export default EventSplitFrame
