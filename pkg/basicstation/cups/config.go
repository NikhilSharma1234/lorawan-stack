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

// Package cups implements the CUPS protocol.
package cups

// ServerConfig is the configuration of the CUPS server.
type ServerConfig struct {
	ExplicitEnable  bool `name:"require-explicit-enable" description:"Require gateways to explicitly enable CUPS. This option is ineffective"` //nolint:lll
	RegisterUnknown struct {
		Type   string `name:"account-type" description:"Type of account to register unknown gateways to (user|organization)"` //nolint:lll
		ID     string `name:"id" description:"ID of the account to register unknown gateways to"`
		APIKey string `name:"api-key" description:"API Key to use for unknown gateway registration"`
	} `name:"owner-for-unknown"`
	Default struct {
		LNSURI string `name:"lns-uri" description:"The default LNS URI that the gateways should use"`
	} `name:"default" description:"Default gateway settings"`
	AllowCUPSURIUpdate bool `name:"allow-cups-uri-update" description:"Allow CUPS URI updates"`
}
