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

import React, { useCallback, useState } from 'react'
import { Container, Col, Row } from 'react-grid-system'
import { useParams } from 'react-router-dom'
import { Dialog, DialogContent, DialogTitle, IconButton, Box, Button } from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'

import videoFile from '@assets/videos/AddSensor.mp4'

import PageTitle from '@ttn-lw/components/page-title'

import RequireRequest from '@ttn-lw/lib/components/require-request'

import DeviceOnboardingForm from '@console/containers/device-onboarding-form'

import sharedMessages from '@ttn-lw/lib/shared-messages'
import { selectJsConfig } from '@ttn-lw/lib/selectors/env'
import attachPromise from '@ttn-lw/lib/store/actions/attach-promise'

import { listBrands } from '@console/store/actions/device-repository'
import { getJoinEUIPrefixes } from '@console/store/actions/join-server'

const DeviceAdd = () => {
  const { appId } = useParams()
  const [openVideo, setOpenVideo] = useState(false)
  const { enabled: jsEnabled } = selectJsConfig()
  const requestAction = useCallback(
    async dispatch => {
      if (jsEnabled) {
        await dispatch(attachPromise(getJoinEUIPrefixes()))
      }
      await dispatch(attachPromise(listBrands(appId, {}, ['name', 'lora_alliance_vendor_id'])))
    },
    [appId, jsEnabled],
  )

  return (
    <RequireRequest requestAction={requestAction}>
      <Container>
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            right: '1px',
            margin: '4px 4px',
            zIndex: 1000,
          }}
        >
          <Button
            variant="contained"
            onClick={() => setOpenVideo(true)}
            startIcon={<HelpOutlineIcon />}
            style={{ maxHeight: '36px' }}
          >
            <p>Help Video</p>
          </Button>
        </div>
        <Row>
          <Col>
            <PageTitle tall title={sharedMessages.registerEndDevice} className="mb-cs-m" />
            <DeviceOnboardingForm />
          </Col>
        </Row>
        <Dialog
          open={openVideo}
          onClose={() => setOpenVideo(false)}
          maxWidth="md"
          style={{ zIndex: '2001' }}
          PaperProps={{
            style: {
              borderRadius: '6px',
            },
          }}
        >
          <DialogTitle style={{ alignSelf: 'center' }}>Adding End Device Video Guide</DialogTitle>
          <DialogContent>
            <video controls style={{ width: '100%' }}>
              <source src={videoFile} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </DialogContent>
        </Dialog>
      </Container>
    </RequireRequest>
  )
}

export default DeviceAdd
