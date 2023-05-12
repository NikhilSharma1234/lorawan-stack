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

package log

// Noop just does nothing.
var Noop = &noop{}

// noop is a log.Interface that does nothing.
type noop struct{}

// Debug implements log.Interface.
func (n noop) Debug(args ...any) {}

// Info implements log.Interface.
func (n noop) Info(args ...any) {}

// Warn implements log.Interface.
func (n noop) Warn(args ...any) {}

// Error implements log.Interface.
func (n noop) Error(args ...any) {}

// Fatal implements log.Interface.
func (n noop) Fatal(args ...any) {}

// Debugf implements log.Interface.
func (n noop) Debugf(msg string, v ...any) {}

// Infof implements log.Interface.
func (n noop) Infof(msg string, v ...any) {}

// Warnf implements log.Interface.
func (n noop) Warnf(msg string, v ...any) {}

// Errorf implements log.Interface.
func (n noop) Errorf(msg string, v ...any) {}

// Fatalf implements log.Interface.
func (n noop) Fatalf(msg string, v ...any) {}

// WithField implements log.Interface.
func (n noop) WithField(string, any) Interface { return n }

// WithFields implements log.Interface.
func (n noop) WithFields(Fielder) Interface { return n }

// WithError implements log.Interface.
func (n noop) WithError(error) Interface { return n }

// Use implements log.Stack
func (n noop) Use(Middleware) {}
