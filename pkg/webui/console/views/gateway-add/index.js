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

import React, { useCallback, useState} from 'react'
import { Container, Col, Row } from 'react-grid-system'
import { defineMessages } from 'react-intl'
import { useNavigate } from 'react-router-dom'

import PageTitle from '@ttn-lw/components/page-title'
import Link from '@ttn-lw/components/link'

import { Dialog, DialogContent, DialogTitle, IconButton, Box } from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import videoFile from '@assets/videos/AddGateway.mp4'

import Message from '@ttn-lw/lib/components/message'
import RequireRequest from '@ttn-lw/lib/components/require-request'

import GatewayOnboardingForm from '@console/containers/gateway-onboarding-form'

import Require from '@console/lib/components/require'

import sharedMessages from '@ttn-lw/lib/shared-messages'

import { mayCreateGateways } from '@console/lib/feature-checks'

import { getOrganizationsList } from '@console/store/actions/organizations'

const m = defineMessages({
  gtwOnboardingDescription:
    'Register your gateway to enable data traffic between nearby end devices and the network. {break} Learn more in our guide on <Link>Adding Gateways</Link>.',
})

const GatewayGuideLink = content => (
  <Link.DocLink secondary path="/gateways/adding-gateways">
    {content}
  </Link.DocLink>
)

const GatewayAdd = () => {
  const navigate = useNavigate()
  const [openVideo, setOpenVideo] = useState(false)
  const handleSuccess = useCallback(
    (gtwId, isManaged = false) => {
      if (isManaged) {
        navigate(`/gateways/${gtwId}/managed-gateway/connection-settings?claimed=true`)
        return
      }
      navigate(`/gateways/${gtwId}`)
    },
    [navigate],
  )

  return (
    <Require featureCheck={mayCreateGateways} otherwise={{ redirect: '/gateways' }}>
      <RequireRequest requestAction={getOrganizationsList()}>
        <Container>
          <div style={{ display: 'flex', justifyContent: 'flex-end'}}>
            <Box
              sx={{ boxShadow: 4 }}
              onClick={() => setOpenVideo(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding:'0px 8px',
                borderRadius: '8px',
              }}
            >
              <IconButton>
                <HelpOutlineIcon style={{ fontSize: '26px' }} />
              </IconButton>
              <p>Help Video</p>
            </Box>
          </div>
          <PageTitle
            colProps={{ md: 10, lg: 9 }}
            className="mb-cs-s"
            title={sharedMessages.registerGateway}
          >
            <Message
              component="p"
              content={m.gtwOnboardingDescription}
              values={{ Link: GatewayGuideLink, break: <br /> }}
            />
            <hr className="mb-ls-s" />
          </PageTitle>
          <Row>
            <Col md={10} lg={9}>
              <GatewayOnboardingForm onSuccess={handleSuccess} />
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
            <DialogTitle style={{ alignSelf: 'center' }}>Adding Gateway Video Guide</DialogTitle>
            <DialogContent>
              <video controls style={{ width: '100%' }}>
                <source src={videoFile} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </DialogContent>
          </Dialog>
        </Container>
      </RequireRequest>
    </Require>
  )
}

export default GatewayAdd
