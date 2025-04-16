// Copyright © 2021 The Things Network Foundation, The Things Industries B.V.
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

	"github.com/prometheus/client_golang/prometheus"
	"go.thethings.network/lorawan-stack/v3/pkg/metrics"
)

const (
	subsystem      = "as_metadata"
	metadataLabel  = "metadata"
	locationLabel  = "location"
	endDeviceLabel = "end_device"
)

var metaMetrics = &metadataMetrics{
	registryRetrievals: metrics.NewCounterVec(
		prometheus.CounterOpts{
			Subsystem: subsystem,
			Name:      "registry_retrievals_total",
			Help:      "Total number of metadata registry retrievals",
		},
		[]string{metadataLabel},
	),
	registryUpdates: metrics.NewCounterVec(
		prometheus.CounterOpts{
			Subsystem: subsystem,
			Name:      "registry_updates_total",
			Help:      "Total number of metadata registry updates",
		},
		[]string{metadataLabel},
	),
}

func init() {
	metrics.MustRegister(metaMetrics)
}

type metadataMetrics struct {
	registryRetrievals *prometheus.CounterVec
	registryUpdates    *prometheus.CounterVec
}

func (m metadataMetrics) Describe(ch chan<- *prometheus.Desc) {
	m.registryRetrievals.Describe(ch)
	m.registryUpdates.Describe(ch)
}

func (m metadataMetrics) Collect(ch chan<- prometheus.Metric) {
	m.registryRetrievals.Collect(ch)
	m.registryUpdates.Collect(ch)
}

func registerMetadataRegistryRetrieval(_ context.Context, metadata string) {
	metaMetrics.registryRetrievals.WithLabelValues(metadata).Inc()
}

func registerMetadataRegistryUpdate(_ context.Context, metadata string) {
	metaMetrics.registryUpdates.WithLabelValues(metadata).Inc()
}
