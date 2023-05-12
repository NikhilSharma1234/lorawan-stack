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

package api

import (
	"encoding/json"
	"io"
	"net/http"

	"go.thethings.network/lorawan-stack/v3/pkg/errors"
	"go.thethings.network/lorawan-stack/v3/pkg/goproto"
)

const maxResponseSize = (1 << 24) // 16 MiB

var errRequest = errors.DefineUnavailable("request", "LoRa Cloud GLS request")

func parse(result any, res *http.Response) error {
	defer res.Body.Close()
	defer io.Copy(io.Discard, res.Body)
	reader := io.LimitReader(res.Body, maxResponseSize)
	if res.StatusCode < 200 || res.StatusCode > 299 {
		body, _ := io.ReadAll(reader)
		detail, err := goproto.Struct(map[string]any{
			"status_code": res.StatusCode,
			"body":        string(body),
		})
		if err != nil {
			return err
		}
		return errRequest.WithDetails(detail)
	}
	return json.NewDecoder(reader).Decode(result)
}
