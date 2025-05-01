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

package networkserver

import (
	"context"
	"fmt"
	"strings"

	"go.thethings.network/lorawan-stack/v3/pkg/errors"
	"go.thethings.network/lorawan-stack/v3/pkg/ttnpb"
)

type setDeviceState struct {
	Device *ttnpb.EndDevice

	paths     []string
	extraSets []string
	extraGets []string

	pathsCache     map[string]bool
	extraSetsCache map[string]bool
	extraGetsCache map[string]bool

	zeroPaths map[string]bool
	onGet     []func(*ttnpb.EndDevice) error
}

// hasAnyField caches the result of ttnpb.HasAnyField in the provided cache map
// in order to avoid redundant lookups.
//
// NOTE: If the search paths are not bottom level fields, hasAnyField may have unexpected
// results, as ttnpb.HasAnyField does not consider higher search paths as being part of
// the requested paths - i.e ttnpb.HasAnyField([]string{"a.b"}, "a") == false.
func hasAnyField(fs []string, cache map[string]bool, paths ...string) bool {
	for _, p := range paths {
		for i := len(p); i > 0; i = strings.LastIndex(p[:i], ".") {
			p := p[:i]
			v, ok := cache[p]
			if !ok {
				continue
			}
			if !v {
				continue
			}
			return true
		}
		v := ttnpb.HasAnyField(fs, p)
		cache[p] = v
		if v {
			return v
		}
	}
	return false
}

func (st *setDeviceState) hasPathField(paths ...string) bool {
	return hasAnyField(st.paths, st.pathsCache, paths...)
}

func (st *setDeviceState) HasSetField(paths ...string) bool {
	return st.hasPathField(paths...) || hasAnyField(st.extraSets, st.extraSetsCache, paths...)
}

func (st *setDeviceState) HasGetField(paths ...string) bool {
	return st.hasPathField(paths...) || hasAnyField(st.extraGets, st.extraGetsCache, paths...)
}

func addFields(hasField func(...string) bool, selected []string, cache map[string]bool, paths ...string) []string {
	for _, p := range paths {
		if hasField(p) {
			continue
		}
		cache[p] = true
		selected = append(selected, p)
	}
	return selected
}

func (st *setDeviceState) AddSetFields(paths ...string) {
	st.extraSets = addFields(st.HasSetField, st.extraSets, st.extraSetsCache, paths...)
}

func (st *setDeviceState) AddGetFields(paths ...string) {
	st.extraGets = addFields(st.HasGetField, st.extraGets, st.extraGetsCache, paths...)
}

func (st *setDeviceState) SetFields() []string {
	return append(st.paths, st.extraSets...)
}

func (st *setDeviceState) GetFields() []string {
	return append(st.paths, st.extraGets...)
}

// WithField calls f when path is available.
func (st *setDeviceState) WithField(f func(*ttnpb.EndDevice) error, path string) error {
	if st.HasSetField(path) {
		return f(st.Device)
	}
	st.AddGetFields(path)
	st.onGet = append(st.onGet, func(stored *ttnpb.EndDevice) error {
		return f(stored)
	})
	return nil
}

// WithFields calls f when all paths in paths are available.
func (st *setDeviceState) WithFields(f func(map[string]*ttnpb.EndDevice) error, paths ...string) error {
	storedPaths := make([]string, 0, len(paths))
	m := make(map[string]*ttnpb.EndDevice, len(paths))
	for _, p := range paths {
		if st.HasSetField(p) {
			m[p] = st.Device
		} else {
			storedPaths = append(storedPaths, p)
		}
	}
	if len(storedPaths) == 0 {
		return f(m)
	}
	st.AddGetFields(storedPaths...)
	st.onGet = append(st.onGet, func(stored *ttnpb.EndDevice) error {
		if stored == nil {
			return f(m)
		}
		for _, p := range storedPaths {
			m[p] = stored
		}
		return f(m)
	})
	return nil
}

// ValidateField ensures that isValid(dev), where dev is the device containing path evaluates to true.
func (st *setDeviceState) ValidateField(isValid func(*ttnpb.EndDevice) bool, path string) error {
	return st.WithField(func(dev *ttnpb.EndDevice) error {
		if !isValid(dev) {
			return newInvalidFieldValueError(path)
		}
		return nil
	}, path)
}

var errFieldNotZero = errors.DefineInvalidArgument("field_not_zero", "field `{name}` is not zero")

// ValidateFieldIsZero ensures that path is zero.
func (st *setDeviceState) ValidateFieldIsZero(path string) error {
	if st.HasSetField(path) {
		if !st.Device.FieldIsZero(path) {
			return newInvalidFieldValueError(path).WithCause(errFieldNotZero.WithAttributes("name", path))
		}
		return nil
	}
	v, ok := st.zeroPaths[path]
	if !ok {
		st.zeroPaths[path] = true
		st.AddGetFields(path)
		return nil
	}
	if !v {
		panic(fmt.Sprintf("path `%s` requested to be both zero and not zero", path))
	}
	return nil
}

var errFieldIsZero = errors.DefineInvalidArgument("field_is_zero", "field `{name}` is zero")

// ValidateFieldIsNotZero ensures that path is not zero.
func (st *setDeviceState) ValidateFieldIsNotZero(path string) error {
	if st.HasSetField(path) {
		if st.Device.FieldIsZero(path) {
			return newInvalidFieldValueError(path).WithCause(errFieldIsZero.WithAttributes("name", path))
		}
		return nil
	}
	v, ok := st.zeroPaths[path]
	if !ok {
		st.zeroPaths[path] = false
		st.AddGetFields(path)
		return nil
	}
	if v {
		panic(fmt.Sprintf("path `%s` requested to be both zero and not zero", path))
	}
	return nil
}

// ValidateFieldsAreZero ensures that each p in paths is zero.
func (st *setDeviceState) ValidateFieldsAreZero(paths ...string) error {
	for _, p := range paths {
		if err := st.ValidateFieldIsZero(p); err != nil {
			return err
		}
	}
	return nil
}

// ValidateFieldsAreNotZero ensures none of p in paths is zero.
func (st *setDeviceState) ValidateFieldsAreNotZero(paths ...string) error {
	for _, p := range paths {
		if err := st.ValidateFieldIsNotZero(p); err != nil {
			return err
		}
	}
	return nil
}

// The ValidateFields calls isValid with a map path -> *ttnpb.EndDevice, where the value stored under the key
// is either a pointer to stored device or to device being set in request, depending on the request fieldmask.
// The isValid is only executed once all fields are present. That means that if request sets all fields in paths
// The isValid is executed immediately, otherwise it is called later (after device fetch) by SetFunc.
func (st *setDeviceState) ValidateFields(
	isValid func(map[string]*ttnpb.EndDevice) (bool, string),
	paths ...string,
) error {
	return st.WithFields(func(m map[string]*ttnpb.EndDevice) error {
		ok, p := isValid(m)
		if !ok {
			return newInvalidFieldValueError(p)
		}
		return nil
	}, paths...)
}

// ValidateSetField validates the field iff path is being set in request.
func (st *setDeviceState) ValidateSetField(isValid func() bool, path string) error {
	if !st.HasSetField(path) {
		return nil
	}
	if !isValid() {
		return newInvalidFieldValueError(path)
	}
	return nil
}

// ValidateSetField is like ValidateSetField, but allows the validator callback to return an error
// and propagates it to the caller as the cause.
func (st *setDeviceState) ValidateSetFieldWithCause(isValid func() error, path string) error {
	if !st.HasSetField(path) {
		return nil
	}
	if err := isValid(); err != nil {
		return newInvalidFieldValueError(path).WithCause(err)
	}
	return nil
}

// ValidateSetFields validates the fields iff at least one of p in paths is being set in request.
func (st *setDeviceState) ValidateSetFields(
	isValid func(map[string]*ttnpb.EndDevice) (bool, string),
	paths ...string,
) error {
	if !st.HasSetField(paths...) {
		return nil
	}
	return st.ValidateFields(isValid, paths...)
}

// SetFunc is the function meant to be passed to SetByID.
func (st *setDeviceState) SetFunc(f func(context.Context, *ttnpb.EndDevice) error) func(context.Context, *ttnpb.EndDevice) (*ttnpb.EndDevice, []string, error) { // nolint: lll
	return func(ctx context.Context, stored *ttnpb.EndDevice) (*ttnpb.EndDevice, []string, error) {
		for p, shouldBeZero := range st.zeroPaths {
			if stored.FieldIsZero(p) != shouldBeZero {
				return nil, nil, newInvalidFieldValueError(p)
			}
		}
		for _, g := range st.onGet {
			if err := g(stored); err != nil {
				return nil, nil, err
			}
		}
		if err := f(ctx, stored); err != nil {
			return nil, nil, err
		}
		return st.Device, st.SetFields(), nil
	}
}

func newSetDeviceState(dev *ttnpb.EndDevice, paths ...string) *setDeviceState {
	return &setDeviceState{
		Device: dev,
		paths:  paths,

		pathsCache:     make(map[string]bool),
		extraSetsCache: make(map[string]bool),
		extraGetsCache: make(map[string]bool),

		zeroPaths: make(map[string]bool),
	}
}
