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

package metadata

import (
	"context"
	"time"

	"go.thethings.network/lorawan-stack/v3/pkg/ttnpb"
)

// allowedFieldMaskPaths defines the allowed field mask paths that can be accessed for end devices from this package.
// Calls to the entity registry require an IS roundtrip call which can be cross-continental. This must be done for a
// high volume of end devices, so we want to limit the amount of data that is being transferred.
var allowedFieldMaskPaths = []string{
	"attributes",
	"locations",
}

// EndDeviceRegistry interface for the identity server.
type EndDeviceRegistry interface {
	// Get returns an end device from the entity registry by its identifiers.
	Get(ctx context.Context, ids *ttnpb.EndDeviceIdentifiers, paths []string) (*ttnpb.EndDevice, error)
	// Set creates, updates or deletes an end device from the entity registry by its identifiers.
	Set(
		ctx context.Context,
		ids *ttnpb.EndDeviceIdentifiers,
		paths []string,
		f func(*ttnpb.EndDevice) (*ttnpb.EndDevice, []string, error),
	) (*ttnpb.EndDevice, error)
}

type noopEndDeviceRegistry struct{}

// Get implements EndDeviceRegistry.
func (noopEndDeviceRegistry) Get(
	_ context.Context,
	_ *ttnpb.EndDeviceIdentifiers,
	_ []string,
) (*ttnpb.EndDevice, error) {
	return &ttnpb.EndDevice{}, nil // nolint: nilnil
}

// Set implements EndDeviceRegistry.
func (noopEndDeviceRegistry) Set(
	_ context.Context,
	_ *ttnpb.EndDeviceIdentifiers,
	_ []string,
	f func(*ttnpb.EndDevice) (*ttnpb.EndDevice, []string, error),
) (*ttnpb.EndDevice, error) {
	if f == nil {
		return &ttnpb.EndDevice{}, nil // nolint: nilnil
	}

	endDevice, _, err := f(&ttnpb.EndDevice{})
	return endDevice, err
}

// NewNoopEndDeviceRegistry returns a noop EndDeviceRegistry.
func NewNoopEndDeviceRegistry() EndDeviceRegistry {
	return noopEndDeviceRegistry{}
}

type metricsEndDeviceRegistry struct {
	inner EndDeviceRegistry
}

// Get implements EndDeviceRegistry.
func (m *metricsEndDeviceRegistry) Get(
	ctx context.Context,
	ids *ttnpb.EndDeviceIdentifiers,
	paths []string,
) (*ttnpb.EndDevice, error) {
	registerMetadataRegistryRetrieval(ctx, endDeviceLabel)
	return m.inner.Get(ctx, ids, paths)
}

// Set implements EndDeviceRegistry.
func (m *metricsEndDeviceRegistry) Set(
	ctx context.Context,
	ids *ttnpb.EndDeviceIdentifiers,
	paths []string,
	f func(*ttnpb.EndDevice) (*ttnpb.EndDevice, []string, error),
) (*ttnpb.EndDevice, error) {
	registerMetadataRegistryUpdate(ctx, endDeviceLabel)
	return m.inner.Set(ctx, ids, paths, f)
}

// NewMetricsEndDeviceRegistry returns an EndDeviceRegistry that collects metrics.
func NewMetricsEndDeviceRegistry(inner EndDeviceRegistry) EndDeviceRegistry {
	return &metricsEndDeviceRegistry{
		inner: inner,
	}
}

type clusterEndDeviceRegistry struct {
	ClusterPeerAccess
	timeout time.Duration
}

// Get implements EndDeviceRegistry.
func (c clusterEndDeviceRegistry) Get(
	ctx context.Context,
	ids *ttnpb.EndDeviceIdentifiers,
	paths []string,
) (*ttnpb.EndDevice, error) {
	paths, err := processEndDeviceFieldMaskPaths(paths)
	if err != nil {
		return nil, err
	}

	cc, err := c.GetPeerConn(ctx, ttnpb.ClusterRole_ENTITY_REGISTRY, nil)
	if err != nil {
		return nil, err
	}

	cl := ttnpb.NewEndDeviceRegistryClient(cc)
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	dev, err := cl.Get(ctx, &ttnpb.GetEndDeviceRequest{
		EndDeviceIds: ids,
		FieldMask:    ttnpb.FieldMask(paths...),
	}, c.WithClusterAuth())
	if err != nil {
		return nil, err
	}

	return dev, nil
}

// Set implements EndDeviceRegistry.
func (c clusterEndDeviceRegistry) Set(
	ctx context.Context,
	ids *ttnpb.EndDeviceIdentifiers,
	paths []string,
	f func(*ttnpb.EndDevice) (*ttnpb.EndDevice, []string, error),
) (*ttnpb.EndDevice, error) {
	paths, err := processEndDeviceFieldMaskPaths(paths)
	if err != nil {
		return nil, err
	}

	cc, err := c.GetPeerConn(ctx, ttnpb.ClusterRole_ENTITY_REGISTRY, nil)
	if err != nil {
		return nil, err
	}

	cl := ttnpb.NewEndDeviceRegistryClient(cc)
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	dev, err := cl.Get(ctx, &ttnpb.GetEndDeviceRequest{
		EndDeviceIds: ids,
		FieldMask:    ttnpb.FieldMask(paths...),
	}, c.WithClusterAuth())
	if err != nil {
		return nil, err
	}

	dev, paths, err = f(dev)
	if err != nil || dev == nil {
		return nil, err
	}
	dev, err = cl.Update(ctx, &ttnpb.UpdateEndDeviceRequest{
		EndDevice: dev,
		FieldMask: ttnpb.FieldMask(paths...),
	}, c.WithClusterAuth())
	if err != nil {
		return nil, err
	}

	return dev, nil
}

// NewClusterEndDeviceRegistry returns an EndDeviceRegistry connected to the entity registry of the Identity Server.
func NewClusterEndDeviceRegistry(cluster ClusterPeerAccess, timeout time.Duration) EndDeviceRegistry {
	return &clusterEndDeviceRegistry{
		ClusterPeerAccess: cluster,
		timeout:           timeout,
	}
}

func processEndDeviceFieldMaskPaths(paths []string) ([]string, error) {
	if len(paths) == 0 {
		return allowedFieldMaskPaths, nil
	}

	if err := validateEndDevicePaths(paths); err != nil {
		return nil, err
	}

	return paths, nil
}

func validateEndDevicePaths(paths []string) error {
	allowedFieldMaskSet := ttnpb.FieldMaskPathsSet(allowedFieldMaskPaths)
	if ok, firstNotAllowedPath := ttnpb.FieldMaskPathsSetContainsAll(allowedFieldMaskSet, paths...); !ok {
		return errFieldMaskPathNotSupported.WithAttributes("path", firstNotAllowedPath)
	}

	return nil
}
