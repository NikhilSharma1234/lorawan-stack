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

// Connection profiles
export const selectConnectionProfilesStore = state => state.connectionProfiles
export const selectConnectionProfiles = state => selectConnectionProfilesStore(state).profiles
export const selectSelectedWifiConnectionProfile = state =>
  selectConnectionProfilesStore(state).wifiSelectedProfile
export const selectSelectedEthernetConnectionProfile = state =>
  selectConnectionProfilesStore(state).ethernetSelectedProfile
export const selectConnectionProfilesByType = (state, type) =>
  selectConnectionProfiles(state)?.[type] ?? []
export const selectAccessPoints = state => selectConnectionProfilesStore(state).accessPoints
