// Copyright © 2019 The Things Network Foundation, The Things Industries B.V.
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

const sendUserEvent = async (user_id, event_type, event_description, extra, page, project) => {
  const server = process.env.FLASK_EVENT_ENDPOINT
  const requestParams = {
    user_id,
    event_type,
    event_description,
    extra,
    page,
    project,
  }
  fetch(server, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestParams),
  }).catch(error => {
    console.error('Error submitting user event:', error)
  })
}

export default sendUserEvent
