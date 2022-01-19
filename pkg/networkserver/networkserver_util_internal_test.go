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

package networkserver

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gogo/protobuf/proto"
	pbtypes "github.com/gogo/protobuf/types"
	"github.com/mohae/deepcopy"
	"github.com/smartystreets/assertions"
	clusterauth "go.thethings.network/lorawan-stack/v3/pkg/auth/cluster"
	"go.thethings.network/lorawan-stack/v3/pkg/cluster"
	"go.thethings.network/lorawan-stack/v3/pkg/component"
	componenttest "go.thethings.network/lorawan-stack/v3/pkg/component/test"
	"go.thethings.network/lorawan-stack/v3/pkg/encoding/lorawan"
	"go.thethings.network/lorawan-stack/v3/pkg/errors"
	"go.thethings.network/lorawan-stack/v3/pkg/events"
	"go.thethings.network/lorawan-stack/v3/pkg/frequencyplans"
	"go.thethings.network/lorawan-stack/v3/pkg/log"
	. "go.thethings.network/lorawan-stack/v3/pkg/networkserver/internal"
	. "go.thethings.network/lorawan-stack/v3/pkg/networkserver/internal/test"
	"go.thethings.network/lorawan-stack/v3/pkg/networkserver/mac"
	"go.thethings.network/lorawan-stack/v3/pkg/rpcmetadata"
	"go.thethings.network/lorawan-stack/v3/pkg/task"
	"go.thethings.network/lorawan-stack/v3/pkg/ttnpb"
	"go.thethings.network/lorawan-stack/v3/pkg/types"
	"go.thethings.network/lorawan-stack/v3/pkg/unique"
	"go.thethings.network/lorawan-stack/v3/pkg/util/test"
	"go.thethings.network/lorawan-stack/v3/pkg/util/test/assertions/should"
	"google.golang.org/grpc"
)

const (
	DownlinkProcessTaskName = downlinkProcessTaskName
	DownlinkRetryInterval   = downlinkRetryInterval
	InfrastructureDelay     = infrastructureDelay
	RecentDownlinkCount     = recentDownlinkCount
	RecentUplinkCount       = recentUplinkCount
)

var (
	AppendRecentDownlink                = appendRecentDownlink
	AppendRecentUplink                  = appendRecentUplink
	ApplicationJoinAcceptWithoutAppSKey = applicationJoinAcceptWithoutAppSKey
	ApplyCFList                         = applyCFList
	DownlinkPathsFromMetadata           = downlinkPathsFromMetadata
	JoinResponseWithoutKeys             = joinResponseWithoutKeys

	ErrABPJoinRequest             = errABPJoinRequest
	ErrApplicationDownlinkTooLong = errApplicationDownlinkTooLong
	ErrDecodePayload              = errDecodePayload
	ErrDeviceNotFound             = errDeviceNotFound
	ErrDuplicate                  = errDuplicate
	ErrInvalidAbsoluteTime        = errInvalidAbsoluteTime
	ErrOutdatedData               = errOutdatedData
	ErrRejoinRequest              = errRejoinRequest
	ErrUnsupportedLoRaWANVersion  = errUnsupportedLoRaWANVersion

	EvtClusterJoinAttempt          = evtClusterJoinAttempt
	EvtClusterJoinFail             = evtClusterJoinFail
	EvtClusterJoinSuccess          = evtClusterJoinSuccess
	EvtCreateEndDevice             = evtCreateEndDevice
	EvtDropDataUplink              = evtDropDataUplink
	EvtDropJoinRequest             = evtDropJoinRequest
	EvtForwardDataUplink           = evtForwardDataUplink
	EvtForwardJoinAccept           = evtForwardJoinAccept
	EvtInteropJoinAttempt          = evtInteropJoinAttempt
	EvtInteropJoinFail             = evtInteropJoinFail
	EvtInteropJoinSuccess          = evtInteropJoinSuccess
	EvtProcessDataUplink           = evtProcessDataUplink
	EvtProcessJoinRequest          = evtProcessJoinRequest
	EvtReceiveDataUplink           = evtReceiveDataUplink
	EvtReceiveJoinRequest          = evtReceiveJoinRequest
	EvtScheduleDataDownlinkAttempt = evtScheduleDataDownlinkAttempt
	EvtScheduleDataDownlinkFail    = evtScheduleDataDownlinkFail
	EvtScheduleDataDownlinkSuccess = evtScheduleDataDownlinkSuccess
	EvtScheduleJoinAcceptAttempt   = evtScheduleJoinAcceptAttempt
	EvtScheduleJoinAcceptFail      = evtScheduleJoinAcceptFail
	EvtScheduleJoinAcceptSuccess   = evtScheduleJoinAcceptSuccess
	EvtUpdateEndDevice             = evtUpdateEndDevice

	NewDeviceRegistry           func(context.Context) (DeviceRegistry, func())
	NewApplicationUplinkQueue   func(context.Context) (ApplicationUplinkQueue, func())
	NewDownlinkTaskQueue        func(context.Context) (DownlinkTaskQueue, func())
	NewUplinkDeduplicator       func(context.Context) (UplinkDeduplicator, func())
	NewScheduledDownlinkMatcher func(context.Context) (ScheduledDownlinkMatcher, func())
)

type DownlinkPath = downlinkPath

func NSScheduleWindow() time.Duration {
	return nsScheduleWindow()
}

var JoinRequestCorrelationIDs = [...]string{
	"join-request-correlation-id-1",
	"join-request-correlation-id-2",
	"join-request-correlation-id-3",
}

func MakeJoinRequestPHYPayload(joinEUI, devEUI types.EUI64, devNonce types.DevNonce, mic [4]byte) []byte {
	return []byte{
		/* MHDR */
		0b000_000_00,
		joinEUI[7], joinEUI[6], joinEUI[5], joinEUI[4], joinEUI[3], joinEUI[2], joinEUI[1], joinEUI[0],
		devEUI[7], devEUI[6], devEUI[5], devEUI[4], devEUI[3], devEUI[2], devEUI[1], devEUI[0],
		/* DevNonce */
		devNonce[1], devNonce[0],
		/* MIC */
		mic[0], mic[1], mic[2], mic[3],
	}
}

func MakeJoinRequestDecodedPayload(joinEUI, devEUI types.EUI64, devNonce types.DevNonce, mic [4]byte) *ttnpb.Message {
	return &ttnpb.Message{
		MHdr: &ttnpb.MHDR{
			MType: ttnpb.MType_JOIN_REQUEST,
			Major: ttnpb.Major_LORAWAN_R1,
		},
		Mic: CopyBytes(mic[:]),
		Payload: &ttnpb.Message_JoinRequestPayload{
			JoinRequestPayload: &ttnpb.JoinRequestPayload{
				JoinEui:  *joinEUI.Copy(&types.EUI64{}),
				DevEui:   *devEUI.Copy(&types.EUI64{}),
				DevNonce: deepcopy.Copy(devNonce).(types.DevNonce),
			},
		},
	}
}

type JoinRequestConfig struct {
	DecodePayload bool

	JoinEUI        types.EUI64
	DevEUI         types.EUI64
	DevNonce       types.DevNonce
	DataRate       *ttnpb.DataRate
	DataRateIndex  ttnpb.DataRateIndex
	Frequency      uint64
	ChannelIndex   uint8
	ReceivedAt     time.Time
	RxMetadata     []*ttnpb.RxMetadata
	CorrelationIDs []string
	MIC            [4]byte
}

func MakeJoinRequest(conf JoinRequestConfig) *ttnpb.UplinkMessage {
	return MakeUplinkMessage(UplinkMessageConfig{
		RawPayload: MakeJoinRequestPHYPayload(conf.JoinEUI, conf.DevEUI, conf.DevNonce, conf.MIC),
		Payload: func() *ttnpb.Message {
			if conf.DecodePayload {
				return MakeJoinRequestDecodedPayload(conf.JoinEUI, conf.DevEUI, conf.DevNonce, conf.MIC)
			}
			return nil
		}(),
		DataRate:      conf.DataRate,
		DataRateIndex: conf.DataRateIndex,
		Frequency:     conf.Frequency,
		ChannelIndex:  conf.ChannelIndex,
		ReceivedAt:    conf.ReceivedAt,
		RxMetadata:    conf.RxMetadata,
		CorrelationIDs: func() []string {
			if len(conf.CorrelationIDs) == 0 {
				return JoinRequestCorrelationIDs[:]
			}
			return conf.CorrelationIDs
		}(),
	})
}

type NsJsJoinRequestConfig struct {
	JoinEUI            types.EUI64
	DevEUI             types.EUI64
	DevNonce           types.DevNonce
	MIC                [4]byte
	DevAddr            types.DevAddr
	SelectedMACVersion ttnpb.MACVersion
	NetID              types.NetID
	RX1DataRateOffset  ttnpb.DataRateOffset
	RX2DataRateIndex   ttnpb.DataRateIndex
	RXDelay            ttnpb.RxDelay
	FrequencyPlanID    string
	PHYVersion         ttnpb.PHYVersion
	CorrelationIDs     []string
}

func MakeNsJsJoinRequest(conf NsJsJoinRequestConfig) *ttnpb.JoinRequest {
	return &ttnpb.JoinRequest{
		RawPayload:         MakeJoinRequestPHYPayload(conf.JoinEUI, conf.DevEUI, conf.DevNonce, conf.MIC),
		Payload:            MakeJoinRequestDecodedPayload(conf.JoinEUI, conf.DevEUI, conf.DevNonce, conf.MIC),
		DevAddr:            *conf.DevAddr.Copy(&types.DevAddr{}),
		SelectedMacVersion: conf.SelectedMACVersion,
		NetId:              *conf.NetID.Copy(&types.NetID{}),
		DownlinkSettings: &ttnpb.DLSettings{
			Rx1DrOffset: conf.RX1DataRateOffset,
			Rx2Dr:       conf.RX2DataRateIndex,
			OptNeg:      conf.SelectedMACVersion.Compare(ttnpb.MAC_V1_1) >= 0,
		},
		RxDelay: conf.RXDelay,
		CfList:  frequencyplans.CFList(*test.FrequencyPlan(conf.FrequencyPlanID), conf.PHYVersion),
		CorrelationIds: CopyStrings(func() []string {
			if len(conf.CorrelationIDs) == 0 {
				return JoinRequestCorrelationIDs[:]
			}
			return conf.CorrelationIDs
		}()),
	}
}

func NewISPeer(ctx context.Context, is interface {
	ttnpb.ApplicationAccessServer
}) cluster.Peer {
	return test.Must(test.NewGRPCServerPeer(ctx, is, ttnpb.RegisterApplicationAccessServer)).(cluster.Peer)
}

func NewGSPeer(ctx context.Context, gs interface {
	ttnpb.NsGsServer
}) cluster.Peer {
	return test.Must(test.NewGRPCServerPeer(ctx, gs, ttnpb.RegisterNsGsServer)).(cluster.Peer)
}

func NewJSPeer(ctx context.Context, js interface {
	ttnpb.NsJsServer
}) cluster.Peer {
	return test.Must(test.NewGRPCServerPeer(ctx, js, ttnpb.RegisterNsJsServer)).(cluster.Peer)
}

func NewASPeer(ctx context.Context, as interface {
	ttnpb.NsAsServer
}) cluster.Peer {
	return test.Must(test.NewGRPCServerPeer(ctx, as, ttnpb.RegisterNsAsServer)).(cluster.Peer)
}

var _ InteropClient = MockInteropClient{}

// MockInteropClient is a mock InteropClient used for testing.
type MockInteropClient struct {
	HandleJoinRequestFunc func(context.Context, types.NetID, *ttnpb.JoinRequest) (*ttnpb.JoinResponse, error)
}

// HandleJoinRequest calls HandleJoinRequestFunc if set and panics otherwise.
func (m MockInteropClient) HandleJoinRequest(ctx context.Context, netID types.NetID, req *ttnpb.JoinRequest) (*ttnpb.JoinResponse, error) {
	if m.HandleJoinRequestFunc == nil {
		panic("HandleJoinRequest called, but not set")
	}
	return m.HandleJoinRequestFunc(ctx, netID, req)
}

type InteropClientHandleJoinRequestResponse struct {
	Response *ttnpb.JoinResponse
	Error    error
}

type InteropClientHandleJoinRequestRequest struct {
	Context  context.Context
	NetID    types.NetID
	Request  *ttnpb.JoinRequest
	Response chan<- InteropClientHandleJoinRequestResponse
}

func MakeInteropClientHandleJoinRequestChFunc(reqCh chan<- InteropClientHandleJoinRequestRequest) func(context.Context, types.NetID, *ttnpb.JoinRequest) (*ttnpb.JoinResponse, error) {
	return func(ctx context.Context, netID types.NetID, msg *ttnpb.JoinRequest) (*ttnpb.JoinResponse, error) {
		respCh := make(chan InteropClientHandleJoinRequestResponse)
		reqCh <- InteropClientHandleJoinRequestRequest{
			Context:  ctx,
			NetID:    netID,
			Request:  msg,
			Response: respCh,
		}
		resp := <-respCh
		return resp.Response, resp.Error
	}
}

var _ ttnpb.NsJsServer = &MockNsJsServer{}

type MockNsJsServer struct {
	HandleJoinFunc  func(context.Context, *ttnpb.JoinRequest) (*ttnpb.JoinResponse, error)
	GetNwkSKeysFunc func(context.Context, *ttnpb.SessionKeyRequest) (*ttnpb.NwkSKeysResponse, error)
}

// HandleJoin calls HandleJoinFunc if set and panics otherwise.
func (m MockNsJsServer) HandleJoin(ctx context.Context, req *ttnpb.JoinRequest) (*ttnpb.JoinResponse, error) {
	if m.HandleJoinFunc == nil {
		panic("HandleJoin called, but not set")
	}
	return m.HandleJoinFunc(ctx, req)
}

// GetNwkSKeys calls GetNwkSKeysFunc if set and panics otherwise.
func (m MockNsJsServer) GetNwkSKeys(ctx context.Context, req *ttnpb.SessionKeyRequest) (*ttnpb.NwkSKeysResponse, error) {
	if m.GetNwkSKeysFunc == nil {
		panic("GetNwkSKeys called, but not set")
	}
	return m.GetNwkSKeysFunc(ctx, req)
}

type NsJsHandleJoinResponse struct {
	Response *ttnpb.JoinResponse
	Error    error
}

type NsJsHandleJoinRequest struct {
	Context  context.Context
	Message  *ttnpb.JoinRequest
	Response chan<- NsJsHandleJoinResponse
}

func MakeNsJsHandleJoinChFunc(reqCh chan<- NsJsHandleJoinRequest) func(context.Context, *ttnpb.JoinRequest) (*ttnpb.JoinResponse, error) {
	return func(ctx context.Context, msg *ttnpb.JoinRequest) (*ttnpb.JoinResponse, error) {
		respCh := make(chan NsJsHandleJoinResponse)
		reqCh <- NsJsHandleJoinRequest{
			Context:  ctx,
			Message:  msg,
			Response: respCh,
		}
		resp := <-respCh
		return resp.Response, resp.Error
	}
}

var _ ttnpb.NsJsClient = &MockNsJsClient{}

type MockNsJsClient struct {
	*test.MockClientStream
	HandleJoinFunc  func(context.Context, *ttnpb.JoinRequest, ...grpc.CallOption) (*ttnpb.JoinResponse, error)
	GetNwkSKeysFunc func(context.Context, *ttnpb.SessionKeyRequest, ...grpc.CallOption) (*ttnpb.NwkSKeysResponse, error)
}

// HandleJoin calls HandleJoinFunc if set and panics otherwise.
func (m MockNsJsClient) HandleJoin(ctx context.Context, req *ttnpb.JoinRequest, opts ...grpc.CallOption) (*ttnpb.JoinResponse, error) {
	if m.HandleJoinFunc == nil {
		panic("HandleJoin called, but not set")
	}
	return m.HandleJoinFunc(ctx, req, opts...)
}

// GetNwkSKeys calls GetNwkSKeysFunc if set and panics otherwise.
func (m MockNsJsClient) GetNwkSKeys(ctx context.Context, req *ttnpb.SessionKeyRequest, opts ...grpc.CallOption) (*ttnpb.NwkSKeysResponse, error) {
	if m.GetNwkSKeysFunc == nil {
		panic("GetNwkSKeys called, but not set")
	}
	return m.GetNwkSKeysFunc(ctx, req, opts...)
}

var _ ttnpb.NsGsServer = &MockNsGsServer{}

type MockNsGsServer struct {
	ScheduleDownlinkFunc func(context.Context, *ttnpb.DownlinkMessage) (*ttnpb.ScheduleDownlinkResponse, error)
}

// ScheduleDownlink calls ScheduleDownlinkFunc if set and panics otherwise.
func (m MockNsGsServer) ScheduleDownlink(ctx context.Context, msg *ttnpb.DownlinkMessage) (*ttnpb.ScheduleDownlinkResponse, error) {
	if m.ScheduleDownlinkFunc == nil {
		panic("ScheduleDownlink called, but not set")
	}
	return m.ScheduleDownlinkFunc(ctx, msg)
}

type NsGsScheduleDownlinkResponse struct {
	Response *ttnpb.ScheduleDownlinkResponse
	Error    error
}

type NsGsScheduleDownlinkRequest struct {
	Context  context.Context
	Message  *ttnpb.DownlinkMessage
	Response chan<- NsGsScheduleDownlinkResponse
}

func MakeNsGsScheduleDownlinkChFunc(reqCh chan<- NsGsScheduleDownlinkRequest) func(context.Context, *ttnpb.DownlinkMessage) (*ttnpb.ScheduleDownlinkResponse, error) {
	return func(ctx context.Context, msg *ttnpb.DownlinkMessage) (*ttnpb.ScheduleDownlinkResponse, error) {
		respCh := make(chan NsGsScheduleDownlinkResponse)
		reqCh <- NsGsScheduleDownlinkRequest{
			Context:  ctx,
			Message:  msg,
			Response: respCh,
		}
		resp := <-respCh
		return resp.Response, resp.Error
	}
}

var _ ttnpb.NsAsServer = &MockNsAsServer{}

type MockNsAsServer struct {
	HandleUplinkFunc func(context.Context, *ttnpb.NsAsHandleUplinkRequest) error
}

// ScheduleDownlink calls HandleUplinkFunc if set and panics otherwise.
func (m MockNsAsServer) HandleUplink(ctx context.Context, req *ttnpb.NsAsHandleUplinkRequest) (*pbtypes.Empty, error) {
	if m.HandleUplinkFunc == nil {
		panic("HandleUplink called, but not set")
	}
	return ttnpb.Empty, m.HandleUplinkFunc(ctx, req)
}

type NsAsHandleUplinkRequest struct {
	Context  context.Context
	Request  *ttnpb.NsAsHandleUplinkRequest
	Response chan<- error
}

func MakeNsAsHandleUplinkChFunc(reqCh chan<- NsAsHandleUplinkRequest) func(context.Context, *ttnpb.NsAsHandleUplinkRequest) error {
	return func(ctx context.Context, req *ttnpb.NsAsHandleUplinkRequest) error {
		respCh := make(chan error)
		reqCh <- NsAsHandleUplinkRequest{
			Context:  ctx,
			Request:  req,
			Response: respCh,
		}
		return <-respCh
	}
}

type InteropClientEnvironment struct {
	HandleJoinRequest <-chan InteropClientHandleJoinRequestRequest
}

func AssertInteropClientHandleJoinRequestRequest(ctx context.Context, reqCh <-chan InteropClientHandleJoinRequestRequest, assert func(context.Context, types.NetID, *ttnpb.JoinRequest) bool, resp InteropClientHandleJoinRequestResponse) bool {
	t := test.MustTFromContext(ctx)
	t.Helper()
	select {
	case <-ctx.Done():
		t.Error("Timed out while waiting for InteropClient.HandleJoinRequest to be called")
		return false

	case req := <-reqCh:
		if !assert(req.Context, req.NetID, req.Request) {
			return false
		}
		select {
		case <-ctx.Done():
			t.Error("Timed out while waiting for InteropClient.HandleJoinRequest response to be processed")
			return false

		case req.Response <- resp:
			return true
		}
	}
}

func AssertNsAsHandleUplinkRequest(ctx context.Context, reqCh <-chan NsAsHandleUplinkRequest, assert func(ctx, reqCtx context.Context, req *ttnpb.NsAsHandleUplinkRequest) bool, err error) bool {
	t := test.MustTFromContext(ctx)
	t.Helper()
	select {
	case <-ctx.Done():
		t.Error("Timed out while waiting for NsAs.HandleUplink to be called")
		return false

	case req := <-reqCh:
		t.Log("NsAs.HandleUplink called")
		if !assert(ctx, req.Context, req.Request) {
			return false
		}
		select {
		case req.Response <- err:
			return true

		case <-ctx.Done():
			t.Error("Timed out while waiting for NsAs.HandleUplink response to be processed")
			return false
		}
	}
}

func AssertNetworkServerClose(ctx context.Context, ns *NetworkServer) bool {
	t := test.MustTFromContext(ctx)
	t.Helper()
	if !test.WaitContext(ctx, ns.Close) {
		t.Error("Timed out while waiting for Network Server to gracefully close")
		return false
	}
	return true
}

type TestClusterEnvironment struct {
	Auth    <-chan test.ClusterAuthRequest
	GetPeer <-chan test.ClusterGetPeerRequest
}

type TestEnvironment struct {
	Config

	Cluster       TestClusterEnvironment
	Events        <-chan test.EventPubSubPublishRequest
	InteropClient *InteropClientEnvironment

	*grpc.ClientConn
}

func (env TestEnvironment) AssertListApplicationRights(ctx context.Context, appID *ttnpb.ApplicationIdentifiers, authType, authValue string, rights ...ttnpb.Right) bool {
	t, a := test.MustNewTFromContext(ctx)
	t.Helper()

	listRightsCh := make(chan test.ApplicationAccessListRightsRequest)
	defer func() {
		close(listRightsCh)
	}()

	if !a.So(test.AssertClusterGetPeerRequest(ctx, env.Cluster.GetPeer,
		func(ctx, _ context.Context, role ttnpb.ClusterRole, ids cluster.EntityIdentifiers) (test.ClusterGetPeerResponse, bool) {
			_, a := test.MustNewTFromContext(ctx)
			return test.ClusterGetPeerResponse{
					Peer: NewISPeer(ctx, &test.MockApplicationAccessServer{
						ListRightsFunc: test.MakeApplicationAccessListRightsChFunc(listRightsCh),
					}),
				}, test.AllTrue(
					a.So(role, should.Equal, ttnpb.ClusterRole_ACCESS),
					a.So(ids, should.BeNil),
				)
		},
	), should.BeTrue) {
		return false
	}
	return a.So(test.AssertListApplicationRightsRequest(ctx, listRightsCh,
		func(ctx, reqCtx context.Context, ids *ttnpb.ApplicationIdentifiers) bool {
			_, a := test.MustNewTFromContext(ctx)
			md := rpcmetadata.FromIncomingContext(reqCtx)
			return test.AllTrue(
				a.So(md.AuthType, should.Equal, authType),
				a.So(md.AuthValue, should.Equal, authValue),
				a.So(ids, should.Resemble, appID),
			)
		}, rights...,
	), should.BeTrue)
}

func (env TestEnvironment) AssertSetDevice(ctx context.Context, create bool, req *ttnpb.SetEndDeviceRequest, rights ...ttnpb.Right) (*ttnpb.EndDevice, error, bool) {
	t, a := test.MustNewTFromContext(ctx)
	t.Helper()

	const (
		authType  = "Bearer"
		authValue = "set-key"
	)
	var (
		dev *ttnpb.EndDevice
		err error
	)
	reqCtx, cancel := context.WithCancel(ctx)
	go func() {
		dev, err = ttnpb.NewNsEndDeviceRegistryClient(env.ClientConn).Set(
			reqCtx,
			req,
			grpc.PerRPCCredentials(rpcmetadata.MD{
				AuthType:      authType,
				AuthValue:     authValue,
				AllowInsecure: true,
			}),
		)
		cancel()
	}()

	if !a.So(env.AssertListApplicationRights(reqCtx, req.EndDevice.Ids.ApplicationIds, authType, authValue, rights...), should.BeTrue) {
		t.Error("ListRights assertion failed")
		return nil, err, false
	}

	action := "create"
	expectedEvent := EvtCreateEndDevice.BindData(nil)
	if !create {
		action = "update"
		expectedEvent = EvtUpdateEndDevice.BindData(req.FieldMask.GetPaths())
	}
	select {
	case <-ctx.Done():
		t.Errorf("Timed out while waiting for device %s event to be published or Set call to return", action)
		return nil, err, false

	case <-reqCtx.Done():
		if err == nil {
			t.Errorf("Device %s event was not published", action)
			return nil, nil, false
		}

	case ev := <-env.Events:
		if !a.So(ev.Event, should.ResembleEvent, expectedEvent.New(
			events.ContextWithCorrelationID(reqCtx, ev.Event.CorrelationIDs()...),
			events.WithIdentifiers(req.EndDevice.Ids),
		)) {
			t.Errorf("Failed to assert device %s event", action)
			return nil, err, false
		}
		close(ev.Response)
	}

	select {
	case <-ctx.Done():
		t.Error("Timed out while waiting for Set call to return")
		return nil, err, false

	case <-reqCtx.Done():
		return dev, err, true
	}
}

func (env TestEnvironment) AssertGetDevice(ctx context.Context, req *ttnpb.GetEndDeviceRequest, rights ...ttnpb.Right) (*ttnpb.EndDevice, error, bool) {
	t, a := test.MustNewTFromContext(ctx)
	t.Helper()

	const (
		authType  = "Bearer"
		authValue = "get-key"
	)
	var (
		dev *ttnpb.EndDevice
		err error
	)
	reqCtx, cancel := context.WithCancel(ctx)
	go func() {
		dev, err = ttnpb.NewNsEndDeviceRegistryClient(env.ClientConn).Get(
			reqCtx,
			req,
			grpc.PerRPCCredentials(rpcmetadata.MD{
				AuthType:      authType,
				AuthValue:     authValue,
				AllowInsecure: true,
			}),
		)
		cancel()
	}()

	if !a.So(env.AssertListApplicationRights(reqCtx, req.EndDeviceIds.ApplicationIds, authType, authValue, rights...), should.BeTrue) {
		t.Error("ListRights assertion failed")
		return nil, nil, false
	}

	select {
	case <-ctx.Done():
		t.Error("Timed out while waiting for Get call to return")
		return nil, nil, false

	case <-reqCtx.Done():
		return dev, err, true
	}
}

func (env TestEnvironment) AssertResetFactoryDefaults(ctx context.Context, req *ttnpb.ResetAndGetEndDeviceRequest, rights ...ttnpb.Right) (*ttnpb.EndDevice, error, bool) {
	t, a := test.MustNewTFromContext(ctx)
	t.Helper()

	const (
		authType  = "Bearer"
		authValue = "reset-key"
	)
	var (
		dev *ttnpb.EndDevice
		err error
	)
	reqCtx, cancel := context.WithCancel(ctx)
	go func() {
		dev, err = ttnpb.NewNsEndDeviceRegistryClient(env.ClientConn).ResetFactoryDefaults(
			reqCtx,
			req,
			grpc.PerRPCCredentials(rpcmetadata.MD{
				AuthType:      authType,
				AuthValue:     authValue,
				AllowInsecure: true,
			}),
		)
		cancel()
	}()

	if !a.So(env.AssertListApplicationRights(reqCtx, req.EndDeviceIds.ApplicationIds, authType, authValue, rights...), should.BeTrue) {
		t.Error("ListRights assertion failed")
		return nil, nil, false
	}

	select {
	case <-ctx.Done():
		t.Error("Timed out while waiting for ResetFactoryDefaults call to return")
		return nil, nil, false

	case <-reqCtx.Done():
		return dev, err, true
	}
}

func (env TestEnvironment) AssertNsAsHandleUplink(ctx context.Context, appID *ttnpb.ApplicationIdentifiers, assert func(context.Context, ...*ttnpb.ApplicationUp) bool, err error) bool {
	test.MustTFromContext(ctx).Helper()
	return test.RunSubtestFromContext(ctx, test.SubtestConfig{
		Name: "NsAs.HandleUplink",
		Func: func(ctx context.Context, t *testing.T, a *assertions.Assertion) {
			t.Helper()

			handleUplinkCh := make(chan NsAsHandleUplinkRequest)
			defer func() {
				close(handleUplinkCh)
			}()
			if !a.So(test.AssertClusterGetPeerRequest(ctx, env.Cluster.GetPeer,
				func(ctx, reqCtx context.Context, role ttnpb.ClusterRole, ids cluster.EntityIdentifiers) (test.ClusterGetPeerResponse, bool) {
					_, a := test.MustNewTFromContext(ctx)
					return test.ClusterGetPeerResponse{
							Peer: NewASPeer(ctx, &MockNsAsServer{
								HandleUplinkFunc: MakeNsAsHandleUplinkChFunc(handleUplinkCh),
							}),
						}, test.AllTrue(
							a.So(role, should.Equal, ttnpb.ClusterRole_APPLICATION_SERVER),
							a.So(ids, should.BeNil),
						)
				},
			), should.BeTrue) {
				t.Error("Application Server peer look-up assertion failed")
				return
			}
			if !a.So(test.AssertClusterAuthRequest(ctx, env.Cluster.Auth, &grpc.EmptyCallOption{}), should.BeTrue) {
				t.Error("Cluster.Auth call assertion failed")
				return
			}

			if !a.So(AssertNsAsHandleUplinkRequest(ctx, handleUplinkCh, func(ctx, reqCtx context.Context, req *ttnpb.NsAsHandleUplinkRequest) bool {
				return test.AllTrue(
					a.So(events.CorrelationIDsFromContext(reqCtx), should.NotBeEmpty),
					assert(ctx, req.ApplicationUps...),
				)
			}, err), should.BeTrue) {
				t.Error("Application uplink assertion failed")
				return
			}
		},
	})
}

type DownlinkPathWithPeerIndex struct {
	DownlinkPath
	PeerIndex uint
}

func MakeDownlinkPathsWithPeerIndex(downlinkPaths []DownlinkPath, peerIdxs ...uint) []DownlinkPathWithPeerIndex {
	if len(downlinkPaths) != len(peerIdxs) {
		panic("mismatch in path and index count")
	}
	paths := []DownlinkPathWithPeerIndex{}
	for i, path := range downlinkPaths {
		paths = append(paths, DownlinkPathWithPeerIndex{
			DownlinkPath: path,
			PeerIndex:    peerIdxs[i],
		})
	}
	return paths
}

func (env TestEnvironment) AssertLegacyScheduleDownlink(ctx context.Context, paths []DownlinkPathWithPeerIndex, asserts ...func(ctx, reqCtx context.Context, down *ttnpb.DownlinkMessage) (NsGsScheduleDownlinkResponse, bool)) bool {
	test.MustTFromContext(ctx).Helper()
	return test.RunSubtestFromContext(ctx, test.SubtestConfig{
		Name: "NsGs.ScheduleDownlink",
		Func: func(ctx context.Context, t *testing.T, a *assertions.Assertion) {
			t.Helper()

			if len(asserts) > len(paths) {
				panic("invalid assertion count")
			}
			if len(paths) == 0 {
				panic("no paths")
			}

			type Peer struct {
				cluster.Peer
				ScheduleDownlink <-chan NsGsScheduleDownlinkRequest
			}

			peerByIdx := map[uint]Peer{}
			peerByIDs := map[string]Peer{}
			var peerSequence []uint
			for _, path := range paths {
				if path.PeerIndex == 0 {
					continue
				}
				if len(peerSequence) == 0 || peerSequence[len(peerSequence)-1] != path.PeerIndex {
					peerSequence = append(peerSequence, path.PeerIndex)
				}
				uid := unique.ID(ctx, *path.GatewayIdentifiers)
				peer, ok := peerByIdx[path.PeerIndex]
				if ok {
					peerByIDs[uid] = peer
					continue
				}
				scheduleDownlinkCh := make(chan NsGsScheduleDownlinkRequest)
				peer = Peer{
					Peer: NewGSPeer(ctx, &MockNsGsServer{
						ScheduleDownlinkFunc: MakeNsGsScheduleDownlinkChFunc(scheduleDownlinkCh),
					}),
					ScheduleDownlink: scheduleDownlinkCh,
				}
				peerByIdx[path.PeerIndex] = peer
				peerByIDs[uid] = peer
			}

			expectedIDs := func() (ids []*ttnpb.GatewayIdentifiers) {
				for _, path := range paths {
					ids = append(ids, path.GatewayIdentifiers)
				}
				return ids
			}()
			var reqIDs []*ttnpb.GatewayIdentifiers
			for range paths {
				if !a.So(test.AssertClusterGetPeerRequest(ctx, env.Cluster.GetPeer, func(ctx, reqCtx context.Context, role ttnpb.ClusterRole, ids cluster.EntityIdentifiers) (test.ClusterGetPeerResponse, bool) {
					_, a := test.MustNewTFromContext(ctx)
					gtwIDs := ids.GetEntityIdentifiers().GetGatewayIds()
					if !test.AllTrue(
						a.So(events.CorrelationIDsFromContext(reqCtx), should.NotBeEmpty),
						a.So(role, should.Equal, ttnpb.ClusterRole_GATEWAY_SERVER),
						a.So(gtwIDs, should.NotBeNil),
					) {
						return test.ClusterGetPeerResponse{
							Error: errors.New("assertion failed"),
						}, false
					}
					found := false
					for _, expectedID := range expectedIDs {
						if proto.Equal(expectedID, gtwIDs) {
							found = true
						}
					}
					if !a.So(found, should.BeTrue) {
						t.Errorf("Gateway Server peer requested for unknown gateway IDs: %v.\nExpected one of %v", gtwIDs, expectedIDs)
						return test.ClusterGetPeerResponse{
							Error: errors.New("assertion failed"),
						}, false
					}
					reqIDs = append(reqIDs, gtwIDs)
					peer, ok := peerByIDs[unique.ID(ctx, *gtwIDs)]
					if !ok {
						return test.ClusterGetPeerResponse{
							Error: errPeerNotFound.New(),
						}, true
					}
					return test.ClusterGetPeerResponse{
						Peer: peer,
					}, true
				}), should.BeTrue) {
					t.Error("Gateway Server peer look-up assertion failed")
					return
				}
			}
			ok := true
			for i := range reqIDs {
				ok = ok && a.So(reqIDs[i], should.Resemble, expectedIDs[i])
			}
			if !ok || !a.So(len(reqIDs), should.Equal, len(expectedIDs)) {
				t.Errorf("Gateway peers by incorrect gateway IDs were requested: %v.\nExpected peers for following gateway IDs to be requested: %v", reqIDs, expectedIDs)
			}

			if len(asserts) > len(peerSequence) {
				panic(fmt.Errorf("mismatch in assertion count and ScheduleDownlink calls: %d assertions, %d ScheduleDownlink calls; peer sequence: %v", len(asserts), len(peerSequence), peerSequence))
			}

			for i, assert := range asserts {
				if !a.So(test.AssertClusterAuthRequest(
					ctx,
					env.Cluster.Auth,
					&grpc.EmptyCallOption{},
				), should.BeTrue) {
					t.Errorf("Failed to assert Cluster.Auth request for schedule attempt number %d", i)
					return
				}
				select {
				case <-ctx.Done():
					t.Errorf("Timed out while waiting for NsGs.ScheduleDownlink to be called for schedule attempt number %d", i)
					return
				case req := <-peerByIdx[peerSequence[i]].ScheduleDownlink:
					resp, ok := assert(ctx, req.Context, req.Message)
					if !a.So(ok, should.BeTrue) {
						t.Errorf("NsGs.ScheduleDownlink request assertion failed for schedule attempt number %d", i)
						return
					}
					select {
					case <-ctx.Done():
						t.Errorf("Timed out while waiting for NsGs.ScheduleDownlink response to be processed for schedule attempt number %d", i)
						return

					case req.Response <- resp:
					}
				}
			}
		},
	})
}

var errPeerNotFound = errors.DefineNotFound("test_peer", "test peer not found")

type DownlinkSchedulingAssertionConfig struct {
	SetRX1          bool
	SetRX2          bool
	FrequencyPlanID string
	PHYVersion      ttnpb.PHYVersion
	MACState        *ttnpb.MACState
	Session         *ttnpb.Session
	Class           ttnpb.Class
	RX1Delay        ttnpb.RxDelay
	Uplink          *ttnpb.UplinkMessage
	Priority        ttnpb.TxSchedulePriority
	AbsoluteTime    *time.Time
	FixedPaths      []*ttnpb.GatewayAntennaIdentifiers
	Payload         []byte
	CorrelationIDs  []string
	PeerIndexes     []uint
	Responses       []NsGsScheduleDownlinkResponse
}

func (env TestEnvironment) AssertScheduleDownlink(ctx context.Context, conf DownlinkSchedulingAssertionConfig) (*ttnpb.DownlinkMessage, bool) {
	t, a := test.MustNewTFromContext(ctx)
	t.Helper()
	var lastDown *ttnpb.DownlinkMessage
	return lastDown, a.So(test.RunSubtestFromContext(ctx, test.SubtestConfig{
		Name: "NsGs.ScheduleDownlink",
		Func: func(ctx context.Context, t *testing.T, a *assertions.Assertion) {
			t.Helper()

			fp := test.FrequencyPlan(conf.FrequencyPlanID)
			phy := LoRaWANBands[fp.BandID][conf.PHYVersion]

			var downlinkPaths []DownlinkPath
			if conf.Uplink != nil {
				downlinkPaths = DownlinkPathsFromMetadata(ctx, conf.Uplink.RxMetadata...)
			} else {
				for i := range conf.FixedPaths {
					downlinkPaths = append(downlinkPaths, DownlinkPath{
						GatewayIdentifiers: conf.FixedPaths[i].GatewayIds,
						DownlinkPath: &ttnpb.DownlinkPath{
							Path: &ttnpb.DownlinkPath_Fixed{
								Fixed: conf.FixedPaths[i],
							},
						},
					})
				}
			}
			if len(downlinkPaths) == 0 {
				panic("no paths")
			}

			type Peer struct {
				cluster.Peer
				ScheduleDownlink <-chan NsGsScheduleDownlinkRequest
			}
			type ExpectedAttempt struct {
				PeerIndex    uint
				RequestPaths []*ttnpb.DownlinkPath
			}
			peerByIdx := map[uint]*Peer{}
			peerByIDs := map[string]*Peer{}
			var expectedAttempts []ExpectedAttempt
			for i, path := range downlinkPaths {
				if len(conf.PeerIndexes) <= i || conf.PeerIndexes[i] == 0 {
					continue
				}
				peer, ok := peerByIdx[conf.PeerIndexes[i]]
				if !ok {
					scheduleDownlinkCh := make(chan NsGsScheduleDownlinkRequest)
					peer = &Peer{
						Peer: NewGSPeer(ctx, &MockNsGsServer{
							ScheduleDownlinkFunc: MakeNsGsScheduleDownlinkChFunc(scheduleDownlinkCh),
						}),
						ScheduleDownlink: scheduleDownlinkCh,
					}
					peerByIdx[conf.PeerIndexes[i]] = peer
				}
				peerByIDs[unique.ID(ctx, path.GatewayIdentifiers)] = peer
				if len(expectedAttempts) == 0 || expectedAttempts[len(expectedAttempts)-1].PeerIndex != conf.PeerIndexes[i] {
					expectedAttempts = append(expectedAttempts, ExpectedAttempt{
						PeerIndex:    conf.PeerIndexes[i],
						RequestPaths: []*ttnpb.DownlinkPath{path.DownlinkPath},
					})
				} else {
					n := len(expectedAttempts)
					expectedAttempts[n].RequestPaths = append(expectedAttempts[n].RequestPaths, path.DownlinkPath)
				}
			}

			expectedIDs := func() (ids []*ttnpb.GatewayIdentifiers) {
				for _, path := range downlinkPaths {
					ids = append(ids, path.GatewayIdentifiers)
				}
				return ids
			}()
			var reqIDs []*ttnpb.GatewayIdentifiers
			for range downlinkPaths {
				if !a.So(test.AssertClusterGetPeerRequest(ctx, env.Cluster.GetPeer, func(ctx, reqCtx context.Context, role ttnpb.ClusterRole, ids cluster.EntityIdentifiers) (test.ClusterGetPeerResponse, bool) {
					_, a := test.MustNewTFromContext(ctx)
					gtwIDs := ids.GetEntityIdentifiers().GetGatewayIds()
					if !test.AllTrue(
						a.So(events.CorrelationIDsFromContext(reqCtx), should.NotBeEmpty),
						a.So(role, should.Equal, ttnpb.ClusterRole_GATEWAY_SERVER),
						a.So(gtwIDs, should.NotBeNil),
					) {
						return test.ClusterGetPeerResponse{
							Error: errors.New("assertion failed"),
						}, false
					}
					found := false
					for _, expectedID := range expectedIDs {
						if proto.Equal(expectedID, gtwIDs) {
							found = true
						}
					}
					if !a.So(found, should.BeTrue) {
						t.Errorf("Gateway Server peer requested for unknown gateway IDs: %v.\nExpected one of %v", gtwIDs, expectedIDs)
						return test.ClusterGetPeerResponse{
							Error: errors.New("assertion failed"),
						}, false
					}
					reqIDs = append(reqIDs, gtwIDs)
					peer, ok := peerByIDs[unique.ID(ctx, gtwIDs)]
					if !ok {
						return test.ClusterGetPeerResponse{
							Error: errPeerNotFound.New(),
						}, true
					}
					return test.ClusterGetPeerResponse{
						Peer: peer,
					}, true
				}), should.BeTrue) {
					t.Error("Gateway Server peer look-up assertion failed")
					return
				}
			}
			ok := true
			for i := range reqIDs {
				ok = ok && a.So(reqIDs[i], should.Resemble, expectedIDs[i])
			}
			if !ok || !a.So(len(reqIDs), should.Equal, len(expectedIDs)) {
				t.Errorf("Gateway peers by incorrect gateway IDs were requested: %v.\nExpected peers for following gateway IDs to be requested: %v", reqIDs, expectedIDs)
			}

			if len(conf.Responses) > len(expectedAttempts) {
				panic(fmt.Errorf("mismatch in response count and expected attempt count: %d responses, %d expected attempts; expected attempts: %v", len(conf.Responses), len(expectedAttempts), expectedAttempts))
			}

			expectedCIDs := conf.CorrelationIDs
			if conf.Uplink != nil {
				expectedCIDs = append(expectedCIDs, conf.Uplink.CorrelationIds...)
			}
			for i, expectedAttempt := range expectedAttempts {
				if !a.So(test.AssertClusterAuthRequest(
					ctx,
					env.Cluster.Auth,
					&grpc.EmptyCallOption{},
				), should.BeTrue) {
					t.Errorf("Failed to assert Cluster.Auth request for schedule attempt number %d", i)
					return
				}
				select {
				case <-ctx.Done():
					t.Errorf("Timed out while waiting for NsGs.ScheduleDownlink to be called for schedule attempt number %d", i)
					return
				case req := <-peerByIdx[expectedAttempt.PeerIndex].ScheduleDownlink:
					lastDown = req.Message

					if !test.AllTrue(
						a.So(req.Message.CorrelationIds, should.BeProperSupersetOfElementsFunc, test.StringEqual, expectedCIDs),
						a.So(req.Message, should.Resemble, &ttnpb.DownlinkMessage{
							RawPayload: conf.Payload,
							Settings: &ttnpb.DownlinkMessage_Request{
								Request: func() *ttnpb.TxRequest {
									txReq := &ttnpb.TxRequest{
										Class:           conf.Class,
										DownlinkPaths:   expectedAttempt.RequestPaths,
										Priority:        conf.Priority,
										FrequencyPlanId: conf.FrequencyPlanID,
										AbsoluteTime:    ttnpb.ProtoTime(conf.AbsoluteTime),
									}
									if conf.SetRX1 {
										drIdx, _, _ := phy.FindUplinkDataRate(conf.Uplink.Settings.DataRate)
										txReq.Rx1Delay = conf.RX1Delay
										rx1DRIdx := test.Must(phy.Rx1DataRate(
											drIdx,
											conf.MACState.CurrentParameters.Rx1DataRateOffset,
											conf.MACState.CurrentParameters.DownlinkDwellTime.GetValue()),
										).(ttnpb.DataRateIndex)
										rx1DR := phy.DataRates[rx1DRIdx]
										txReq.Rx1DataRate = rx1DR.Rate
										txReq.Rx1Frequency = conf.MACState.CurrentParameters.Channels[test.Must(phy.Rx1Channel(uint8(conf.Uplink.DeviceChannelIndex))).(uint8)].DownlinkFrequency
									}
									if conf.SetRX2 {
										rx2DRIdx := conf.MACState.CurrentParameters.Rx2DataRateIndex
										rx2DR := phy.DataRates[rx2DRIdx]
										txReq.Rx2DataRate = rx2DR.Rate
										txReq.Rx2Frequency = conf.MACState.CurrentParameters.Rx2Frequency
									}
									return txReq
								}(),
							},
							CorrelationIds: req.Message.CorrelationIds,
						}),
					) {
						if !bytes.Equal(req.Message.RawPayload, conf.Payload) {
							actual := &ttnpb.Message{}
							expected := &ttnpb.Message{}
							a.So(lorawan.UnmarshalMessage(req.Message.RawPayload, actual), should.BeNil)
							a.So(lorawan.UnmarshalMessage(conf.Payload, expected), should.BeNil)
							a.So(actual, should.Resemble, expected)
							if aPld, ePld := actual.GetMacPayload(), expected.GetMacPayload(); !conf.MACState.LorawanVersion.EncryptFOpts() &&
								aPld != nil && ePld != nil &&
								!bytes.Equal(aPld.FHdr.FOpts, ePld.FHdr.FOpts) {
								macCommands := func(b []byte) (cmds []*ttnpb.MACCommand) {
									for r := bytes.NewReader(b); r.Len() > 0; {
										cmd := &ttnpb.MACCommand{}
										if !a.So(lorawan.DefaultMACCommands.ReadDownlink(*phy, r, cmd), should.BeNil) {
											return nil
										}
										cmds = append(cmds, cmd)
									}
									return cmds
								}
								a.So(macCommands(aPld.FHdr.FOpts), should.Resemble, macCommands(ePld.FHdr.FOpts))
							}
						}
						t.Errorf("NsGs.ScheduleDownlink request assertion failed for schedule attempt number %d", i)
						return
					}
					select {
					case <-ctx.Done():
						t.Errorf("Timed out while waiting for NsGs.ScheduleDownlink response to be processed for schedule attempt number %d", i)
						return

					case req.Response <- conf.Responses[i]:
					}
				}
			}
		},
	}), should.BeTrue)
}

func (env TestEnvironment) AssertScheduleJoinAccept(ctx context.Context, dev *ttnpb.EndDevice) (*ttnpb.EndDevice, bool) {
	t, a := test.MustNewTFromContext(ctx)
	t.Helper()
	dev = CopyEndDevice(dev)
	return dev, a.So(test.RunSubtestFromContext(ctx, test.SubtestConfig{
		Name: "Join-accept",
		Func: func(ctx context.Context, t *testing.T, a *assertions.Assertion) {
			t.Helper()

			fp := test.FrequencyPlan(dev.FrequencyPlanId)
			phy := LoRaWANBands[fp.BandID][dev.LorawanPhyVersion]

			scheduledDown, ok := env.AssertScheduleDownlink(ctx, DownlinkSchedulingAssertionConfig{
				SetRX1:          true,
				SetRX2:          true,
				FrequencyPlanID: dev.FrequencyPlanId,
				PHYVersion:      dev.LorawanPhyVersion,
				MACState:        dev.PendingMacState,
				Session:         dev.PendingSession,
				Class:           ttnpb.Class_CLASS_A,
				RX1Delay:        ttnpb.RxDelay(phy.JoinAcceptDelay1.Seconds()),
				Uplink:          LastUplink(dev.PendingMacState.RecentUplinks...),
				Priority:        ttnpb.TxSchedulePriority_HIGHEST,
				Payload:         dev.PendingMacState.QueuedJoinAccept.Payload,
				CorrelationIDs:  dev.PendingMacState.QueuedJoinAccept.CorrelationIds,
				PeerIndexes:     []uint{1},
				Responses: []NsGsScheduleDownlinkResponse{
					{
						Response: &ttnpb.ScheduleDownlinkResponse{},
					},
				},
			})
			if !a.So(ok, should.BeTrue) {
				t.Error("Join-accept scheduling assertion failed")
				return
			}
			a.So(env.Events, should.ReceiveEventsResembling,
				EvtScheduleJoinAcceptAttempt.With(
					events.WithData(&ttnpb.DownlinkMessage{
						RawPayload: dev.PendingMacState.QueuedJoinAccept.Payload,
						Payload: &ttnpb.Message{
							MHdr: &ttnpb.MHDR{
								MType: ttnpb.MType_JOIN_ACCEPT,
								Major: ttnpb.Major_LORAWAN_R1,
							},
							Payload: &ttnpb.Message_JoinAcceptPayload{
								JoinAcceptPayload: &ttnpb.JoinAcceptPayload{
									NetId:      dev.PendingMacState.QueuedJoinAccept.NetId,
									DevAddr:    dev.PendingMacState.QueuedJoinAccept.DevAddr,
									DlSettings: dev.PendingMacState.QueuedJoinAccept.Request.DownlinkSettings,
									RxDelay:    dev.PendingMacState.QueuedJoinAccept.Request.RxDelay,
									CfList:     dev.PendingMacState.QueuedJoinAccept.Request.CfList,
								},
							},
						},
						Settings:       scheduledDown.Settings,
						CorrelationIds: scheduledDown.CorrelationIds,
					}),
					events.WithIdentifiers(dev.Ids),
				).New(ctx),
				EvtScheduleJoinAcceptSuccess.With(
					events.WithData(&ttnpb.ScheduleDownlinkResponse{
						Delay: ttnpb.ProtoDurationPtr(0),
					}),
					events.WithIdentifiers(dev.Ids),
				).New(events.ContextWithCorrelationID(ctx, scheduledDown.CorrelationIds...)),
			)
			dev.PendingSession = &ttnpb.Session{
				DevAddr: dev.PendingMacState.QueuedJoinAccept.DevAddr,
				Keys:    dev.PendingMacState.QueuedJoinAccept.Keys,
			}
			dev.PendingMacState.PendingJoinRequest = dev.PendingMacState.QueuedJoinAccept.Request
			dev.PendingMacState.QueuedJoinAccept = nil
			dev.PendingMacState.RxWindowsAvailable = false
			dev.PendingMacState.RecentDownlinks = AppendRecentDownlink(dev.PendingMacState.RecentDownlinks, scheduledDown, RecentDownlinkCount)
		},
	}), should.BeTrue)
}

type DataDownlinkAssertionConfig struct {
	SetRX1         bool
	SetRX2         bool
	Device         *ttnpb.EndDevice
	Class          ttnpb.Class
	Priority       ttnpb.TxSchedulePriority
	AbsoluteTime   *time.Time
	FixedPaths     []*ttnpb.GatewayAntennaIdentifiers
	RawPayload     []byte
	Payload        *ttnpb.Message
	CorrelationIDs []string
	PeerIndexes    []uint
	Responses      []NsGsScheduleDownlinkResponse
}

func (env TestEnvironment) AssertScheduleDataDownlink(ctx context.Context, conf DataDownlinkAssertionConfig) (*ttnpb.EndDevice, bool) {
	t, a := test.MustNewTFromContext(ctx)
	t.Helper()
	dev := CopyEndDevice(conf.Device)
	return dev, a.So(test.RunSubtestFromContext(ctx, test.SubtestConfig{
		Name: "Data downlink",
		Func: func(ctx context.Context, t *testing.T, a *assertions.Assertion) {
			t.Helper()

			scheduledDown, ok := env.AssertScheduleDownlink(ctx, DownlinkSchedulingAssertionConfig{
				SetRX1:          conf.SetRX1,
				SetRX2:          conf.SetRX2,
				FrequencyPlanID: dev.FrequencyPlanId,
				PHYVersion:      dev.LorawanPhyVersion,
				MACState:        dev.MacState,
				Session:         dev.Session,
				Class:           conf.Class,
				RX1Delay:        dev.MacState.CurrentParameters.Rx1Delay,
				Uplink:          LastUplink(dev.MacState.RecentUplinks...),
				Priority:        conf.Priority,
				Payload:         conf.RawPayload,
				PeerIndexes:     conf.PeerIndexes,
				Responses:       conf.Responses,
			})
			a.So(ok, should.BeTrue)
			a.So(env.Events, should.ReceiveEventsResembling,
				EvtScheduleDataDownlinkAttempt.With(
					events.WithData(&ttnpb.DownlinkMessage{
						RawPayload:     conf.RawPayload,
						Payload:        conf.Payload,
						Settings:       scheduledDown.Settings,
						CorrelationIds: scheduledDown.CorrelationIds,
					}),
					events.WithIdentifiers(dev.Ids),
				).New(ctx),
				EvtScheduleDataDownlinkSuccess.With(
					events.WithData(&ttnpb.ScheduleDownlinkResponse{
						Delay: ttnpb.ProtoDurationPtr(0),
					}),
					events.WithIdentifiers(dev.Ids),
				).New(events.ContextWithCorrelationID(ctx, scheduledDown.CorrelationIds...)),
			)
			dev.MacState.RecentDownlinks = AppendRecentDownlink(dev.MacState.RecentDownlinks, scheduledDown, RecentDownlinkCount)
		},
	}), should.BeTrue)
}

func (env TestEnvironment) AssertHandleDeviceUplink(ctx context.Context, assert func(context.Context, func(...events.Event) bool) (func(context.Context, error) bool, bool), ups ...*ttnpb.UplinkMessage) bool {
	t, a := test.MustNewTFromContext(ctx)
	t.Helper()
	return a.So(test.RunSubtestFromContext(ctx, test.SubtestConfig{
		Name: "GsNs.HandleUplink",
		Func: func(ctx context.Context, t *testing.T, a *assertions.Assertion) {
			t.Helper()

			errCh := make(chan error, len(ups))
			wg := &sync.WaitGroup{}
			wg.Add(len(ups) - 1)
			go func() {
				t.Logf("Call GsNs.HandleUplink with first uplink: %v", ups[0])
				_, err := ttnpb.NewGsNsClient(env.ClientConn).HandleUplink(ctx, ups[0])
				t.Logf("First GsNs.HandleUplink returned %v", err)
				errCh <- err
				wg.Wait()
				close(errCh)
			}()
			for _, up := range ups[1:] {
				up := up
				time.AfterFunc(env.Config.DeduplicationWindow/2, func() {
					t.Logf("Call GsNs.HandleUplink with duplicate uplink: %v", up)
					_, err := ttnpb.NewGsNsClient(env.ClientConn).HandleUplink(ctx, up)
					t.Logf("Duplicate GsNs.HandleUplink returned %v", err)
					errCh <- err
					wg.Done()
				})
			}
			assertError, ok := assert(ctx, func(expectedEvs ...events.Event) bool {
				return a.So(test.RunSubtestFromContext(ctx, test.SubtestConfig{
					Name: "uplink handling events",
					Func: func(ctx context.Context, t *testing.T, a *assertions.Assertion) {
						t.Helper()

						a.So(test.AssertEventPubSubPublishRequests(ctx, env.Events, len(expectedEvs), func(evs ...events.Event) bool {
							if !a.So(evs, should.HaveSameElementsFunc, test.MakeEventEqual(test.EventEqualConfig{
								Identifiers:    true,
								Origin:         true,
								Context:        true,
								Visibility:     true,
								Authentication: true,
								RemoteIP:       true,
								UserAgent:      true,
							}), expectedEvs) {
								printEvents := func(evs []events.Event) string {
									var s string
									for i, ev := range evs {
										s += fmt.Sprintf("\nevent %d: %s", i, ev)
									}
									return s
								}
								t.Errorf("Uplink event assertion failed.\nGot events: %s\nExpected events: %s", printEvents(evs), printEvents(expectedEvs))
								return false
							}
							return true
						}), should.BeTrue)
					},
				}), should.BeTrue)
			})
			if !a.So(ok, should.BeTrue) {
				t.Error("Uplink handling assertion failed")
				return
			}
			for range ups[1:] {
				select {
				case <-ctx.Done():
					t.Error("Timed out while waiting for duplicate HandleUplink to return")
					return

				case err := <-errCh:
					if !a.So(err, should.BeNil) {
						t.Errorf("Failed to handle duplicate uplink: %s", err)
						return
					}
				}
			}
			select {
			case <-ctx.Done():
				t.Error("Timed out while waiting for HandleUplink to return")
				return
			case err := <-errCh:
				var ok bool
				if assertError == nil {
					ok = a.So(err, should.BeNil)
				} else {
					ok = a.So(assertError(ctx, err), should.BeTrue)
				}
				if !ok {
					t.Errorf("HandleUplink error assertion failed")
					return
				}
			}
		},
	}), should.BeTrue)
}

func (env TestEnvironment) AssertHandleDeviceUplinkSuccess(ctx context.Context, assert func(context.Context, func(...events.Event) bool) bool, ups ...*ttnpb.UplinkMessage) bool {
	t, a := test.MustNewTFromContext(ctx)
	t.Helper()
	return a.So(env.AssertHandleDeviceUplink(
		ctx,
		func(ctx context.Context, assertEvents func(...events.Event) bool) (func(context.Context, error) bool, bool) {
			_, a := test.MustNewTFromContext(ctx)
			return nil, a.So(assert(ctx, assertEvents), should.BeTrue)
		},
		ups...,
	), should.BeTrue)
}

func (env TestEnvironment) AssertHandleJoinRequest(ctx context.Context, conf JoinRequestConfig, assert func(ctx context.Context, assertEvents func(...events.Event) bool, ups ...*ttnpb.UplinkMessage) bool, duplicateMDs ...[]*ttnpb.RxMetadata) bool {
	t, a := test.MustNewTFromContext(ctx)
	t.Helper()
	return a.So(test.RunSubtestFromContext(ctx, test.SubtestConfig{
		Name: "Join-request",
		Func: func(ctx context.Context, t *testing.T, a *assertions.Assertion) {
			t.Helper()

			ups := []*ttnpb.UplinkMessage{MakeJoinRequest(conf)}
			for _, mds := range duplicateMDs {
				mds := mds
				duplicateConf := conf
				duplicateConf.RxMetadata = mds
				ups = append(ups, MakeJoinRequest(duplicateConf))
			}
			a.So(env.AssertHandleDeviceUplinkSuccess(ctx, func(ctx context.Context, assertEvents func(...events.Event) bool) bool {
				_, a := test.MustNewTFromContext(ctx)
				return a.So(assert(ctx, assertEvents, ups...), should.BeTrue)
			}, ups...), should.BeTrue)
		},
	}), should.BeTrue)
}

func (env TestEnvironment) AssertNsJsJoin(ctx context.Context, getPeerAssert func(ctx, reqCtx context.Context, ids cluster.EntityIdentifiers) bool, joinAssert func(ctx, reqCtx context.Context, msg *ttnpb.JoinRequest) bool, joinResp *ttnpb.JoinResponse, err error) bool {
	test.MustTFromContext(ctx).Helper()
	return test.RunSubtestFromContext(ctx, test.SubtestConfig{
		Name: "NsJs.HandleJoin",
		Func: func(ctx context.Context, t *testing.T, a *assertions.Assertion) {
			t.Helper()

			joinReqCh := make(chan NsJsHandleJoinRequest)
			if !a.So(test.AssertClusterGetPeerRequest(ctx, env.Cluster.GetPeer, func(ctx, reqCtx context.Context, role ttnpb.ClusterRole, ids cluster.EntityIdentifiers) (test.ClusterGetPeerResponse, bool) {
				_, a := test.MustNewTFromContext(ctx)
				return test.ClusterGetPeerResponse{
						Peer: NewJSPeer(ctx, &MockNsJsServer{
							HandleJoinFunc: MakeNsJsHandleJoinChFunc(joinReqCh),
						}),
					}, test.AllTrue(
						a.So(role, should.Equal, ttnpb.ClusterRole_JOIN_SERVER),
						getPeerAssert(ctx, reqCtx, ids),
					)
			}), should.BeTrue) {
				t.Error("Join Server peer look-up assertion failed")
				return
			}
			if !a.So(test.AssertClusterAuthRequest(ctx, env.Cluster.Auth, &grpc.EmptyCallOption{}), should.BeTrue) {
				t.Error("Cluster.Auth call assertion failed")
				return
			}
			select {
			case <-ctx.Done():
				t.Error("Timed out while waiting for NsJs.HandleJoin to be called")
				return

			case req := <-joinReqCh:
				if !a.So(joinAssert(ctx, req.Context, req.Message), should.BeTrue) {
					return
				}
				select {
				case <-ctx.Done():
					t.Error("Timed out while waiting for NsJs.HandleJoin response to be processed")
					return

				case req.Response <- NsJsHandleJoinResponse{
					Response: joinResp,
					Error:    err,
				}:
				}
			}
		},
	})
}

type JoinAssertionConfig struct {
	Device         *ttnpb.EndDevice
	ChannelIndex   uint8
	DataRateIndex  ttnpb.DataRateIndex
	RxMetadatas    [][]*ttnpb.RxMetadata
	CorrelationIDs []string

	ClusterResponse *NsJsHandleJoinResponse
	InteropResponse *InteropClientHandleJoinRequestResponse
}

func (env TestEnvironment) AssertJoin(ctx context.Context, conf JoinAssertionConfig) (*ttnpb.EndDevice, bool) {
	t, a := test.MustNewTFromContext(ctx)
	t.Helper()

	fp := test.FrequencyPlan(conf.Device.FrequencyPlanId)
	phy := LoRaWANBands[fp.BandID][conf.Device.LorawanPhyVersion]
	upCh := phy.UplinkChannels[conf.ChannelIndex]
	upDR := phy.DataRates[conf.DataRateIndex].Rate

	devNonce := types.DevNonce{0x42, 0x42}
	mic := [4]byte{0x42, 0x42, 0x42, 0x42}

	start := time.Now().UTC()

	upConf := JoinRequestConfig{
		JoinEUI:        *conf.Device.Ids.JoinEui,
		DevEUI:         *conf.Device.Ids.DevEui,
		DevNonce:       devNonce,
		DataRate:       upDR,
		Frequency:      upCh.Frequency,
		RxMetadata:     conf.RxMetadatas[0],
		CorrelationIDs: conf.CorrelationIDs,
		MIC:            mic,
	}
	var (
		dev      *ttnpb.EndDevice
		joinReq  *ttnpb.JoinRequest
		joinResp *ttnpb.JoinResponse
	)
	if !a.So(env.AssertHandleJoinRequest(
		ctx,
		upConf,
		func(ctx context.Context, assertEvents func(...events.Event) bool, ups ...*ttnpb.UplinkMessage) bool {
			t, a := test.MustNewTFromContext(ctx)
			t.Helper()

			defaultMACSettings := env.Config.DefaultMACSettings.Parse()

			defaultLoRaWANVersion := mac.DeviceDefaultLoRaWANVersion(conf.Device)

			defaultRX1DROffset := mac.DeviceDefaultRX1DataRateOffset(conf.Device, defaultMACSettings)
			defaultRX2DRIdx := mac.DeviceDefaultRX2DataRateIndex(conf.Device, phy, defaultMACSettings)
			defaultRX2Freq := mac.DeviceDefaultRX2Frequency(conf.Device, phy, defaultMACSettings)

			desiredRX1Delay := mac.DeviceDesiredRX1Delay(conf.Device, phy, defaultMACSettings)
			desiredRX1DROffset := mac.DeviceDesiredRX1DataRateOffset(conf.Device, defaultMACSettings)
			desiredRX2DRIdx := mac.DeviceDesiredRX2DataRateIndex(conf.Device, phy, fp, defaultMACSettings)

			deduplicatedUpConf := upConf
			deduplicatedUpConf.DecodePayload = true
			deduplicatedUpConf.ChannelIndex = conf.ChannelIndex
			deduplicatedUpConf.DataRateIndex = conf.DataRateIndex
			for _, up := range ups[1:] {
				deduplicatedUpConf.RxMetadata = append(deduplicatedUpConf.RxMetadata, up.RxMetadata...)
			}
			if conf.ClusterResponse != nil {
				if !a.So(env.AssertNsJsJoin(
					ctx,
					func(ctx, reqCtx context.Context, peerIDs cluster.EntityIdentifiers) bool {
						return test.AllTrue(
							a.So(events.CorrelationIDsFromContext(reqCtx), should.BeProperSupersetOfElementsFunc, test.StringEqual, ups[0].CorrelationIds),
							a.So(peerIDs, should.BeNil),
						)
					},
					func(ctx, reqCtx context.Context, req *ttnpb.JoinRequest) bool {
						joinReq = req
						return test.AllTrue(
							a.So(events.CorrelationIDsFromContext(reqCtx), should.NotBeEmpty),
							a.So(req.DevAddr, should.NotBeEmpty),
							a.So(req.DevAddr.NwkID(), should.Resemble, env.Config.NetID.ID()),
							a.So(req.DevAddr.NetIDType(), should.Equal, env.Config.NetID.Type()),
							a.So(req.CorrelationIds, should.BeProperSupersetOfElementsFunc, test.StringEqual, ups[0].CorrelationIds),
							a.So(req, should.Resemble, MakeNsJsJoinRequest(NsJsJoinRequestConfig{
								JoinEUI:            *conf.Device.Ids.JoinEui,
								DevEUI:             *conf.Device.Ids.DevEui,
								DevNonce:           devNonce,
								MIC:                mic,
								DevAddr:            req.DevAddr,
								SelectedMACVersion: defaultLoRaWANVersion,
								NetID:              env.Config.NetID,
								RX1DataRateOffset:  defaultRX1DROffset,
								RX2DataRateIndex:   defaultRX2DRIdx,
								RXDelay:            desiredRX1Delay,
								FrequencyPlanID:    conf.Device.FrequencyPlanId,
								PHYVersion:         conf.Device.LorawanPhyVersion,
								CorrelationIDs:     req.CorrelationIds,
							})),
						)
					},
					conf.ClusterResponse.Response,
					conf.ClusterResponse.Error,
				), should.BeTrue) {
					return false
				}
				if conf.ClusterResponse.Error == nil {
					joinResp = conf.ClusterResponse.Response
				}
			}
			if conf.InteropResponse != nil {
				t.Fatal("Interop join assertion not implemented yet")
				return false
			}

			dev = CopyEndDevice(conf.Device)
			dev.PendingMacState = &ttnpb.MACState{
				CurrentParameters: &ttnpb.MACParameters{
					MaxEirp:                    phy.DefaultMaxEIRP,
					AdrDataRateIndex:           ttnpb.DataRateIndex_DATA_RATE_0,
					AdrNbTrans:                 1,
					Rx1Delay:                   mac.DeviceDefaultRX1Delay(dev, phy, defaultMACSettings),
					Rx1DataRateOffset:          defaultRX1DROffset,
					Rx2DataRateIndex:           defaultRX2DRIdx,
					Rx2Frequency:               defaultRX2Freq,
					MaxDutyCycle:               mac.DeviceDefaultMaxDutyCycle(dev, defaultMACSettings),
					RejoinTimePeriodicity:      ttnpb.RejoinTimeExponent_REJOIN_TIME_0,
					RejoinCountPeriodicity:     ttnpb.RejoinCountExponent_REJOIN_COUNT_16,
					PingSlotFrequency:          mac.DeviceDefaultPingSlotFrequency(dev, phy, defaultMACSettings),
					BeaconFrequency:            mac.DeviceDefaultBeaconFrequency(dev, defaultMACSettings),
					Channels:                   mac.DeviceDefaultChannels(dev, phy, defaultMACSettings),
					AdrAckLimitExponent:        &ttnpb.ADRAckLimitExponentValue{Value: phy.ADRAckLimit},
					AdrAckDelayExponent:        &ttnpb.ADRAckDelayExponentValue{Value: phy.ADRAckDelay},
					PingSlotDataRateIndexValue: mac.DeviceDefaultPingSlotDataRateIndexValue(dev, phy, defaultMACSettings),
				},
				DesiredParameters: &ttnpb.MACParameters{
					MaxEirp:                    mac.DeviceDesiredMaxEIRP(dev, phy, fp, defaultMACSettings),
					AdrDataRateIndex:           ttnpb.DataRateIndex_DATA_RATE_0,
					AdrNbTrans:                 1,
					Rx1Delay:                   desiredRX1Delay,
					Rx1DataRateOffset:          desiredRX1DROffset,
					Rx2DataRateIndex:           desiredRX2DRIdx,
					Rx2Frequency:               mac.DeviceDesiredRX2Frequency(dev, phy, fp, defaultMACSettings),
					MaxDutyCycle:               mac.DeviceDesiredMaxDutyCycle(dev, defaultMACSettings),
					RejoinTimePeriodicity:      ttnpb.RejoinTimeExponent_REJOIN_TIME_0,
					RejoinCountPeriodicity:     ttnpb.RejoinCountExponent_REJOIN_COUNT_16,
					PingSlotFrequency:          mac.DeviceDesiredPingSlotFrequency(dev, phy, fp, defaultMACSettings),
					BeaconFrequency:            mac.DeviceDesiredBeaconFrequency(dev, defaultMACSettings),
					Channels:                   mac.DeviceDesiredChannels(dev, phy, fp, defaultMACSettings),
					UplinkDwellTime:            mac.DeviceDesiredUplinkDwellTime(fp),
					DownlinkDwellTime:          mac.DeviceDesiredDownlinkDwellTime(fp),
					AdrAckLimitExponent:        mac.DeviceDesiredADRAckLimitExponent(dev, phy, defaultMACSettings),
					AdrAckDelayExponent:        mac.DeviceDesiredADRAckDelayExponent(dev, phy, defaultMACSettings),
					PingSlotDataRateIndexValue: mac.DeviceDesiredPingSlotDataRateIndexValue(dev, phy, fp, defaultMACSettings),
				},
				DeviceClass:    test.Must(mac.DeviceDefaultClass(dev)).(ttnpb.Class),
				LorawanVersion: defaultLoRaWANVersion,
				QueuedJoinAccept: &ttnpb.MACState_JoinAccept{
					Payload: joinResp.RawPayload,
					DevAddr: joinReq.DevAddr,
					NetId:   joinReq.NetId,
					Request: &ttnpb.MACState_JoinRequest{
						DownlinkSettings: joinReq.DownlinkSettings,
						RxDelay:          joinReq.RxDelay,
						CfList:           joinReq.CfList,
					},
					Keys: func() *ttnpb.SessionKeys {
						keys := &ttnpb.SessionKeys{
							SessionKeyId: joinResp.SessionKeys.SessionKeyId,
							FNwkSIntKey:  joinResp.SessionKeys.FNwkSIntKey,
							NwkSEncKey:   joinResp.SessionKeys.NwkSEncKey,
							SNwkSIntKey:  joinResp.SessionKeys.SNwkSIntKey,
						}
						if !joinReq.DownlinkSettings.OptNeg {
							keys.NwkSEncKey = keys.FNwkSIntKey
							keys.SNwkSIntKey = keys.FNwkSIntKey
						}
						return keys
					}(),
					CorrelationIds: joinResp.CorrelationIds,
				},
				RxWindowsAvailable: true,
				RecentUplinks: []*ttnpb.UplinkMessage{
					MakeJoinRequest(deduplicatedUpConf),
				},
			}
			return a.So(assertEvents(events.Builders(func() []events.Builder {
				evBuilders := []events.Builder{
					EvtReceiveJoinRequest,
				}
				for range ups[1:] {
					evBuilders = append(evBuilders,
						EvtReceiveJoinRequest,
						EvtDropJoinRequest.With(events.WithData(ErrDuplicate)),
					)
				}
				if conf.ClusterResponse != nil {
					evBuilders = append(evBuilders,
						EvtClusterJoinAttempt,
					)
					if conf.ClusterResponse.Error == nil {
						evBuilders = append(evBuilders,
							EvtClusterJoinSuccess.With(events.WithData(JoinResponseWithoutKeys(conf.ClusterResponse.Response))),
						)
					}
				}
				return append(evBuilders,
					EvtProcessJoinRequest,
				)
			}()).New(
				ctx,
				events.WithIdentifiers(conf.Device.Ids),
			)...), should.BeTrue)
		},
		conf.RxMetadatas[1:]...,
	), should.BeTrue) {
		return nil, false
	}
	dev, ok := env.AssertScheduleJoinAccept(ctx, dev)
	if !ok {
		t.Error("Join-accept scheduling assertion failed")
		return nil, false
	}

	idsWithDevAddr := &ttnpb.EndDeviceIdentifiers{}
	if err := idsWithDevAddr.SetFields(conf.Device.Ids, ttnpb.EndDeviceIdentifiersFieldPathsNested...); !a.So(err, should.BeNil) {
		t.Error("Failed to set identifiers")
		return nil, false
	}
	idsWithDevAddr.DevAddr = &joinReq.DevAddr

	var appUp *ttnpb.ApplicationUp
	if !a.So(env.AssertNsAsHandleUplink(ctx, conf.Device.Ids.ApplicationIds, func(ctx context.Context, ups ...*ttnpb.ApplicationUp) bool {
		_, a := test.MustNewTFromContext(ctx)
		if !a.So(ups, should.HaveLength, 1) {
			return false
		}
		up := ups[0]
		recvAt := up.GetJoinAccept().GetReceivedAt()
		appUp = up
		return test.AllTrue(
			a.So(up.CorrelationIds, should.HaveSameElementsDeep, append(joinReq.CorrelationIds, joinResp.CorrelationIds...)),
			a.So([]time.Time{start, *ttnpb.StdTime(recvAt), time.Now()}, should.BeChronological),
			a.So(up, should.Resemble, &ttnpb.ApplicationUp{
				EndDeviceIds:   idsWithDevAddr,
				CorrelationIds: up.CorrelationIds,
				Up: &ttnpb.ApplicationUp_JoinAccept{
					JoinAccept: &ttnpb.ApplicationJoinAccept{
						AppSKey:      joinResp.SessionKeys.AppSKey,
						SessionKeyId: joinResp.SessionKeys.SessionKeyId,
						ReceivedAt:   recvAt,
					},
				},
			}),
		)
	}, nil), should.BeTrue) {
		t.Error("Failed to send join-accept to Application Server")
		return nil, false
	}
	return dev, a.So(env.Events, should.ReceiveEventFunc, test.MakeEventEqual(test.EventEqualConfig{
		Identifiers:    true,
		Data:           true,
		Origin:         true,
		Context:        true,
		Visibility:     true,
		Authentication: true,
		RemoteIP:       true,
		UserAgent:      true,
	}),
		EvtForwardJoinAccept.NewWithIdentifiersAndData(ctx, idsWithDevAddr, &ttnpb.ApplicationUp{
			EndDeviceIds:   idsWithDevAddr,
			CorrelationIds: appUp.CorrelationIds,
			Up: &ttnpb.ApplicationUp_JoinAccept{
				JoinAccept: ApplicationJoinAcceptWithoutAppSKey(appUp.GetJoinAccept()),
			},
		}),
	)
}

type DataUplinkAssertionConfig struct {
	Device         *ttnpb.EndDevice
	ChannelIndex   uint8
	DataRateIndex  ttnpb.DataRateIndex
	RxMetadatas    [][]*ttnpb.RxMetadata
	CorrelationIDs []string

	Confirmed    bool
	Pending      bool
	FRMPayload   []byte
	FOpts        []byte
	FCtrl        *ttnpb.FCtrl
	FCntDelta    uint32
	ConfFCntDown uint32
	FPort        uint8

	EventBuilders []events.Builder
}

func (env TestEnvironment) AssertHandleDataUplink(ctx context.Context, conf DataUplinkAssertionConfig) (*ttnpb.EndDevice, bool) {
	t, a := test.MustNewTFromContext(ctx)
	t.Helper()

	dev := CopyEndDevice(conf.Device)
	return dev, a.So(test.RunSubtestFromContext(ctx, test.SubtestConfig{
		Name: "Data uplink",
		Func: func(ctx context.Context, t *testing.T, a *assertions.Assertion) {
			t.Helper()

			start := time.Now().UTC()
			upConf := WithDeviceDataUplinkConfig(dev, conf.Pending, conf.DataRateIndex, conf.ChannelIndex, conf.FCntDelta)(DataUplinkConfig{
				Confirmed:      conf.Confirmed,
				FCtrl:          conf.FCtrl,
				ConfFCntDown:   conf.ConfFCntDown,
				FPort:          conf.FPort,
				FRMPayload:     conf.FRMPayload,
				FOpts:          conf.FOpts,
				RxMetadata:     conf.RxMetadatas[0],
				CorrelationIDs: conf.CorrelationIDs,
			})

			deduplicatedUpConf := upConf
			deduplicatedUpConf.DecodePayload = true
			deduplicatedUpConf.Matched = true
			ups := []*ttnpb.UplinkMessage{MakeDataUplink(upConf)}
			for _, mds := range conf.RxMetadatas[1:] {
				mds := mds
				duplicateConf := upConf
				duplicateConf.RxMetadata = mds
				ups = append(ups, MakeDataUplink(duplicateConf))
				deduplicatedUpConf.RxMetadata = append(deduplicatedUpConf.RxMetadata, mds...)
			}
			if !a.So(env.AssertHandleDeviceUplinkSuccess(ctx, func(ctx context.Context, assertEvents func(...events.Event) bool) bool {
				t, a := test.MustNewTFromContext(ctx)
				t.Helper()
				if !a.So(assertEvents(events.Builders(func() []events.Builder {
					evBuilders := []events.Builder{
						EvtReceiveDataUplink,
					}
					for range ups[1:] {
						evBuilders = append(evBuilders,
							EvtReceiveDataUplink,
							EvtDropDataUplink.With(events.WithData(ErrDuplicate)),
						)
					}
					return append(
						append(
							evBuilders,
							conf.EventBuilders...,
						),
						EvtProcessDataUplink,
					)
				}()).New(
					ctx,
					events.WithIdentifiers(dev.Ids),
				)...), should.BeTrue) {
					t.Error("Uplink event assertion failed")
					return false
				}
				return true
			}, ups...), should.BeTrue) {
				t.Error("Data uplink send assertion failed")
				return
			}

			deduplicatedUp := MakeDataUplink(deduplicatedUpConf)
			if conf.Pending {
				dev.MacState = dev.PendingMacState
				dev.MacState.CurrentParameters.Rx1Delay = dev.PendingMacState.PendingJoinRequest.RxDelay
				dev.MacState.CurrentParameters.Rx1DataRateOffset = dev.PendingMacState.PendingJoinRequest.DownlinkSettings.Rx1DrOffset
				dev.MacState.CurrentParameters.Rx2DataRateIndex = dev.PendingMacState.PendingJoinRequest.DownlinkSettings.Rx2Dr
				dev.MacState.PendingJoinRequest = nil
				dev.Session = dev.PendingSession
				dev.PendingMacState = nil
				dev.PendingSession = nil
			}
			dev.MacState.RecentUplinks = AppendRecentUplink(dev.MacState.RecentUplinks, deduplicatedUp, RecentUplinkCount)
			var appUp *ttnpb.ApplicationUp
			if !a.So(env.AssertNsAsHandleUplink(ctx, conf.Device.Ids.ApplicationIds, func(ctx context.Context, ups ...*ttnpb.ApplicationUp) bool {
				_, a := test.MustNewTFromContext(ctx)
				if !a.So(ups, should.HaveLength, 1) {
					return false
				}
				up := ups[0]
				recvAt := up.GetUplinkMessage().GetReceivedAt()
				appUp = up
				return test.AllTrue(
					a.So(up.CorrelationIds, should.BeProperSupersetOfElementsFunc, test.StringEqual, deduplicatedUp.CorrelationIds),
					a.So(up.GetUplinkMessage().GetRxMetadata(), should.HaveSameElementsDeep, deduplicatedUp.RxMetadata),
					a.So([]time.Time{start, *ttnpb.StdTime(recvAt), time.Now()}, should.BeChronological),
					a.So(up, should.Resemble, &ttnpb.ApplicationUp{
						EndDeviceIds:   dev.Ids,
						CorrelationIds: up.CorrelationIds,
						Up: &ttnpb.ApplicationUp_UplinkMessage{
							UplinkMessage: &ttnpb.ApplicationUplink{
								Confirmed:    conf.Confirmed,
								FPort:        deduplicatedUp.Payload.GetMacPayload().FPort,
								FrmPayload:   deduplicatedUp.Payload.GetMacPayload().FrmPayload,
								ReceivedAt:   up.GetUplinkMessage().GetReceivedAt(),
								RxMetadata:   up.GetUplinkMessage().GetRxMetadata(),
								Settings:     deduplicatedUp.Settings,
								SessionKeyId: upConf.SessionKeys.SessionKeyId,
								NetworkIds:   up.GetUplinkMessage().GetNetworkIds(),
							},
						},
					}),
				)
			}, nil), should.BeTrue) {
				t.Error("Application Server data uplink forwarding assertion failed")
				return
			}
			if !a.So(env.Events, should.ReceiveEventFunc, test.MakeEventEqual(test.EventEqualConfig{
				Identifiers:    true,
				Data:           true,
				Origin:         true,
				Context:        true,
				Visibility:     true,
				Authentication: true,
				RemoteIP:       true,
				UserAgent:      true,
			}),
				EvtForwardDataUplink.New(
					ctx,
					events.WithIdentifiers(dev.Ids),
					events.WithData(appUp),
				),
			) {
				t.Error("Application Server forwarding event assertion failed")
			}
		},
	}), should.BeTrue)
}

func DownlinkProtoPaths(paths ...DownlinkPath) (pbs []*ttnpb.DownlinkPath) {
	for _, p := range paths {
		pbs = append(pbs, p.DownlinkPath)
	}
	return pbs
}

func StartTaskExclude(names ...string) task.StartTaskFunc {
	return func(conf *task.Config) {
		for _, name := range names {
			if strings.HasPrefix(conf.ID, name) {
				return
			}
		}
		task.DefaultStartTask(conf)
	}
}

type TestConfig struct {
	NetworkServer        Config
	NetworkServerOptions []Option
	Component            component.Config
	TaskStarter          task.Starter
}

func StartTest(ctx context.Context, conf TestConfig) (*NetworkServer, context.Context, TestEnvironment, func()) {
	tb := test.MustTBFromContext(ctx)
	tb.Helper()

	authCh := make(chan test.ClusterAuthRequest)
	getPeerCh := make(chan test.ClusterGetPeerRequest)
	eventsPublishCh := make(chan test.EventPubSubPublishRequest)

	var closeFuncs []func()
	closeFuncs = append(closeFuncs, test.SetDefaultEventsPubSub(&test.MockEventPubSub{
		PublishFunc: test.MakeEventPubSubPublishChFunc(eventsPublishCh),
	}))
	if conf.NetworkServer.DeduplicationWindow == 0 {
		conf.NetworkServer.DeduplicationWindow = time.Nanosecond
	}
	if conf.NetworkServer.CooldownWindow == 0 {
		conf.NetworkServer.CooldownWindow = conf.NetworkServer.DeduplicationWindow + time.Nanosecond
	}
	if conf.NetworkServer.ApplicationUplinkQueue.NumConsumers == 0 {
		conf.NetworkServer.ApplicationUplinkQueue.NumConsumers = 1
	}
	if conf.NetworkServer.DownlinkTaskQueue.NumConsumers == 0 {
		conf.NetworkServer.DownlinkTaskQueue.NumConsumers = 1
	}

	cmpOpts := []component.Option{
		component.WithClusterNew(func(context.Context, *cluster.Config, ...cluster.Option) (cluster.Cluster, error) {
			return &test.MockCluster{
				AuthFunc:    test.MakeClusterAuthChFunc(authCh),
				GetPeerFunc: test.MakeClusterGetPeerChFunc(getPeerCh),
				JoinFunc:    test.ClusterJoinNilFunc,
				WithVerifiedSourceFunc: func(ctx context.Context) context.Context {
					return clusterauth.NewContext(ctx, nil)
				},
			}, nil
		}),
		component.WithGRPCLogger(log.Noop),
	}
	if conf.TaskStarter != nil {
		cmpOpts = append(cmpOpts, component.WithTaskStarter(conf.TaskStarter))
	}

	if conf.NetworkServer.Devices == nil {
		v, closeFn := NewDeviceRegistry(ctx)
		if closeFn != nil {
			closeFuncs = append(closeFuncs, closeFn)
		}
		conf.NetworkServer.Devices = v
	}
	if conf.NetworkServer.ApplicationUplinkQueue.Queue == nil {
		v, closeFn := NewApplicationUplinkQueue(ctx)
		if closeFn != nil {
			closeFuncs = append(closeFuncs, closeFn)
		}
		conf.NetworkServer.ApplicationUplinkQueue.Queue = v
	}
	if conf.NetworkServer.DownlinkTaskQueue.Queue == nil {
		v, closeFn := NewDownlinkTaskQueue(ctx)
		if closeFn != nil {
			closeFuncs = append(closeFuncs, closeFn)
		}
		conf.NetworkServer.DownlinkTaskQueue.Queue = v
	}
	if conf.NetworkServer.UplinkDeduplicator == nil {
		v, closeFn := NewUplinkDeduplicator(ctx)
		if closeFn != nil {
			closeFuncs = append(closeFuncs, closeFn)
		}
		conf.NetworkServer.UplinkDeduplicator = v
	}
	if conf.NetworkServer.ScheduledDownlinkMatcher == nil {
		v, closeFn := NewScheduledDownlinkMatcher(ctx)
		if closeFn != nil {
			closeFuncs = append(closeFuncs, closeFn)
		}
		conf.NetworkServer.ScheduledDownlinkMatcher = v
	}

	ns := test.Must(New(
		componenttest.NewComponent(tb, &conf.Component, cmpOpts...),
		&conf.NetworkServer,
		conf.NetworkServerOptions...,
	)).(*NetworkServer)

	env := TestEnvironment{
		Config: conf.NetworkServer,

		Cluster: TestClusterEnvironment{
			Auth:    authCh,
			GetPeer: getPeerCh,
		},
		Events: eventsPublishCh,
	}
	if ns.interopClient == nil {
		handleJoinCh := make(chan InteropClientHandleJoinRequestRequest)
		ns.interopClient = &MockInteropClient{
			HandleJoinRequestFunc: MakeInteropClientHandleJoinRequestChFunc(handleJoinCh),
		}
		env.InteropClient = &InteropClientEnvironment{
			HandleJoinRequest: handleJoinCh,
		}
		closeFuncs = append(closeFuncs, func() {
			select {
			case req := <-handleJoinCh:
				tb.Errorf("InteropClient.HandleJoin call missed: %+v", req)
			default:
				close(handleJoinCh)
			}
		})
	}

	componenttest.StartComponent(tb, ns.Component)
	env.ClientConn = ns.LoopbackConn()

	ctx, cancel := context.WithCancel(ctx)
	return ns, ctx, env, func() {
		cancel()
		ns.Close()
		for _, f := range closeFuncs {
			f()
		}
		select {
		case <-authCh:
			tb.Error("Cluster.Auth call missed")
		default:
			close(authCh)
		}
		select {
		case req := <-getPeerCh:
			tb.Errorf("Cluster.GetPeer call missed: (role: %+v, identifiers: %+v)", req.Role, req.Identifiers)
		default:
			close(getPeerCh)
		}
		select {
		case req := <-eventsPublishCh:
			tb.Errorf("events.Publish call missed: %+v", req.Event)
		default:
			close(eventsPublishCh)
		}
	}
}

func LogEvents(t *testing.T, ch <-chan test.EventPubSubPublishRequest) {
	for ev := range ch {
		t.Logf("Event %s published with data %v", ev.Event.Name(), ev.Event.Data())
		ev.Response <- struct{}{}
	}
}

var MACStateOptions = test.MACStateOptions

func MakeMACState(dev *ttnpb.EndDevice, defaults ttnpb.MACSettings, opts ...test.MACStateOption) *ttnpb.MACState {
	v := MACStateOptions.Compose(opts...)(*test.Must(mac.NewState(dev, test.FrequencyPlanStore, defaults)).(*ttnpb.MACState))
	return &v
}

type SessionOptionNamespace struct{ test.SessionOptionNamespace }

func (o SessionOptionNamespace) WithDefaultQueuedApplicationDownlinks() test.SessionOption {
	return func(x ttnpb.Session) ttnpb.Session {
		x.QueuedApplicationDownlinks = DefaultApplicationDownlinkQueue[:]
		return x
	}
}

var SessionOptions SessionOptionNamespace

func MakeSession(macVersion ttnpb.MACVersion, wrapKeys, withID bool, opts ...test.SessionOption) *ttnpb.Session {
	return test.MakeSession(
		SessionOptions.WithKeys(MakeSessionKeys(macVersion, wrapKeys, withID)),
		SessionOptions.Compose(opts...),
	)
}

type EndDeviceOptionNamespace struct{ test.EndDeviceOptionNamespace }

func (o EndDeviceOptionNamespace) SendJoinRequest(defaults ttnpb.MACSettings, wrapKeys bool) test.EndDeviceOption {
	return func(x ttnpb.EndDevice) ttnpb.EndDevice {
		if !x.SupportsJoin {
			panic("join request requested for non-OTAA device")
		}
		phy := Band(x.FrequencyPlanId, x.LorawanPhyVersion)
		drIdx := func() ttnpb.DataRateIndex {
			for idx := ttnpb.DataRateIndex_DATA_RATE_0; idx <= ttnpb.DataRateIndex_DATA_RATE_15; idx++ {
				if _, ok := phy.DataRates[idx]; ok {
					return idx
				}
			}
			panic("no data rates")
		}()
		macState := MakeMACState(&x, defaults,
			MACStateOptions.WithRxWindowsAvailable(true),
			MACStateOptions.WithRecentUplinks(
				MakeJoinRequest(JoinRequestConfig{
					DecodePayload:  true,
					JoinEUI:        *x.Ids.JoinEui,
					DevEUI:         *x.Ids.DevEui,
					CorrelationIDs: []string{"join-request"},
					MIC:            [4]byte{0x42, 0xff, 0xff, 0xff},
					DataRateIndex:  drIdx,
					DataRate:       phy.DataRates[drIdx].Rate, // TODO: Remove (https://github.com/TheThingsNetwork/lorawan-stack/issues/3997)
					Frequency:      phy.UplinkChannels[0].Frequency,
				}),
			),
		)
		return o.WithPendingMacState(MACStatePtr(MACStateOptions.WithQueuedJoinAccept(&ttnpb.MACState_JoinAccept{
			Payload: bytes.Repeat([]byte{0xff}, 17),
			Request: &ttnpb.MACState_JoinRequest{
				DownlinkSettings: &ttnpb.DLSettings{
					Rx1DrOffset: macState.DesiredParameters.Rx1DataRateOffset,
					Rx2Dr:       macState.DesiredParameters.Rx2DataRateIndex,
					OptNeg:      x.LorawanVersion.Compare(ttnpb.MAC_V1_1) >= 0,
				},
				RxDelay: macState.DesiredParameters.Rx1Delay,
				CfList:  frequencyplans.CFList(*test.FrequencyPlan(x.FrequencyPlanId), x.LorawanPhyVersion),
			},
			Keys:           MakeSessionKeys(x.LorawanVersion, wrapKeys, true),
			DevAddr:        test.DefaultDevAddr,
			NetId:          test.DefaultNetID,
			CorrelationIds: []string{"join-request"},
		})(*macState)))(x)
	}
}

func (o EndDeviceOptionNamespace) SendJoinAccept(priority ttnpb.TxSchedulePriority) test.EndDeviceOption {
	return func(x ttnpb.EndDevice) ttnpb.EndDevice {
		if !x.SupportsJoin {
			panic("join accept requested for non-OTAA device")
		}
		if x.PendingMacState == nil {
			panic("PendingMACState is nil")
		}
		return o.Compose(
			o.WithPendingSession(&ttnpb.Session{
				DevAddr: x.PendingMacState.QueuedJoinAccept.DevAddr,
				Keys: &ttnpb.SessionKeys{
					SessionKeyId: x.PendingMacState.QueuedJoinAccept.Keys.SessionKeyId,
					FNwkSIntKey:  x.PendingMacState.QueuedJoinAccept.Keys.FNwkSIntKey,
					SNwkSIntKey:  x.PendingMacState.QueuedJoinAccept.Keys.SNwkSIntKey,
					NwkSEncKey:   x.PendingMacState.QueuedJoinAccept.Keys.NwkSEncKey,
				},
			}),
			o.WithPendingMACStateOptions(
				MACStateOptions.WithPendingJoinRequest(x.PendingMacState.QueuedJoinAccept.Request),
				MACStateOptions.WithQueuedJoinAccept(nil),
				MACStateOptions.WithRxWindowsAvailable(false),
				MACStateOptions.AppendRecentDownlinks(&ttnpb.DownlinkMessage{
					RawPayload: x.PendingMacState.QueuedJoinAccept.Payload,
					Payload: &ttnpb.Message{
						MHdr: &ttnpb.MHDR{
							MType: ttnpb.MType_JOIN_ACCEPT,
							Major: ttnpb.Major_LORAWAN_R1,
						},
						Payload: &ttnpb.Message_JoinAcceptPayload{
							JoinAcceptPayload: &ttnpb.JoinAcceptPayload{
								NetId:      x.PendingMacState.QueuedJoinAccept.NetId,
								DevAddr:    x.PendingMacState.QueuedJoinAccept.DevAddr,
								DlSettings: x.PendingMacState.QueuedJoinAccept.Request.DownlinkSettings,
								RxDelay:    x.PendingMacState.QueuedJoinAccept.Request.RxDelay,
								CfList:     x.PendingMacState.QueuedJoinAccept.Request.CfList,
							},
						},
					},
					EndDeviceIds: x.Ids,
					Settings: &ttnpb.DownlinkMessage_Request{
						Request: &ttnpb.TxRequest{
							Class:           ttnpb.Class_CLASS_A,
							Priority:        priority,
							FrequencyPlanId: x.FrequencyPlanId,
							Rx1Delay:        ttnpb.RxDelay(Band(x.FrequencyPlanId, x.LorawanPhyVersion).JoinAcceptDelay1 / time.Second),
							Rx2DataRate: &ttnpb.DataRate{
								Modulation: &ttnpb.DataRate_Lora{
									Lora: &ttnpb.LoRaDataRate{
										Bandwidth:       125000,
										SpreadingFactor: 12 - uint32(x.PendingMacState.CurrentParameters.Rx2DataRateIndex),
									},
								},
							},
							Rx2Frequency: x.PendingMacState.CurrentParameters.Rx2Frequency,
							// TODO: Generate RX1 transmission parameters if necessary.
							// https://github.com/TheThingsNetwork/lorawan-stack/issues/3142
						},
					},
					CorrelationIds: []string{"join-accept"},
				}),
			),
		)(x)
	}
}

func (o EndDeviceOptionNamespace) Activate(defaults ttnpb.MACSettings, wrapKeys bool, sessionOpts []test.SessionOption, macStateOpts ...test.MACStateOption) test.EndDeviceOption {
	return func(x ttnpb.EndDevice) ttnpb.EndDevice {
		if !x.SupportsJoin {
			macState := MakeMACState(&x, defaults, macStateOpts...)
			ses := MakeSession(macState.LorawanVersion, wrapKeys, false, sessionOpts...)
			return o.Compose(
				o.WithMacState(macState),
				o.WithSession(ses),
				o.WithEndDeviceIdentifiersOptions(
					test.EndDeviceIdentifiersOptions.WithDevAddr(&ses.DevAddr),
				),
			)(x)
		}
		return o.Compose(
			o.SendJoinRequest(defaults, wrapKeys),
			o.SendJoinAccept(ttnpb.TxSchedulePriority_HIGHEST),
			// TODO: Send uplink including MAC commands depending on the version.
			// https://github.com/TheThingsNetwork/lorawan-stack/issues/3142
			func(x ttnpb.EndDevice) ttnpb.EndDevice {
				return o.Compose(
					o.WithEndDeviceIdentifiersOptions(
						test.EndDeviceIdentifiersOptions.WithDevAddr(&x.PendingSession.DevAddr),
					),
					o.WithMacState(x.PendingMacState),
					o.WithSession(x.PendingSession),
				)(x)
			},
			o.WithMACStateOptions(MACStateOptions.WithPendingJoinRequest(nil)),
			o.WithPendingMacState(nil),
			o.WithPendingSession(nil),
		)(x)
	}
}

var EndDeviceOptions EndDeviceOptionNamespace

func MakeEndDevice(opts ...test.EndDeviceOption) *ttnpb.EndDevice {
	return test.MakeEndDevice(
		EndDeviceOptions.WithDefaultFrequencyPlanID(),
		EndDeviceOptions.WithDefaultLoRaWANVersion(),
		EndDeviceOptions.WithDefaultLoRaWANPHYVersion(),
		EndDeviceOptions.Compose(opts...),
	)
}

func MakeOTAAEndDevice(opts ...test.EndDeviceOption) *ttnpb.EndDevice {
	return MakeEndDevice(
		EndDeviceOptions.WithDefaultJoinEUI(),
		EndDeviceOptions.WithDefaultDevEUI(),
		EndDeviceOptions.WithSupportsJoin(true),
		EndDeviceOptions.Compose(opts...),
	)
}

func MakeABPEndDevice(defaults ttnpb.MACSettings, wrapKeys bool, sessionOpts []test.SessionOption, macStateOpts []test.MACStateOption, opts ...test.EndDeviceOption) *ttnpb.EndDevice {
	return MakeEndDevice(
		EndDeviceOptions.Compose(opts...),
		func(x ttnpb.EndDevice) ttnpb.EndDevice {
			if x.Multicast || x.Ids.DevEui != nil && !x.Ids.DevEui.IsZero() || !x.LorawanVersion.RequireDevEUIForABP() {
				return x
			}
			return EndDeviceOptions.WithDefaultDevEUI()(x)
		},
		EndDeviceOptions.Activate(defaults, wrapKeys, sessionOpts, macStateOpts...),
	)
}

func MakeMulticastEndDevice(class ttnpb.Class, defaults ttnpb.MACSettings, wrapKeys bool, sessionOpts []test.SessionOption, macStateOpts []test.MACStateOption, opts ...test.EndDeviceOption) *ttnpb.EndDevice {
	return MakeABPEndDevice(defaults, wrapKeys, sessionOpts, macStateOpts,
		EndDeviceOptions.WithMulticast(true),
		func() test.EndDeviceOption {
			switch class {
			case ttnpb.Class_CLASS_B:
				return EndDeviceOptions.WithSupportsClassB(true)
			case ttnpb.Class_CLASS_C:
				return EndDeviceOptions.WithSupportsClassC(true)
			default:
				panic(fmt.Sprintf("invalid multicast device class: %v", class))
			}
		}(),
		EndDeviceOptions.Compose(opts...),
	)
}

func MakeEndDevicePaths(paths ...string) []string {
	return ttnpb.AddFields([]string{
		"frequency_plan_id",
		"ids.application_ids",
		"ids.device_id",
		"lorawan_phy_version",
		"lorawan_version",
	},
		paths...,
	)
}

func MakeOTAAEndDevicePaths(paths ...string) []string {
	return MakeEndDevicePaths(append([]string{
		"ids.dev_eui",
		"ids.join_eui",
		"supports_join",
	}, paths...)...)
}

func MakeABPEndDevicePaths(withDevEUI bool, paths ...string) []string {
	if withDevEUI {
		paths = append([]string{
			"ids.dev_eui",
		}, paths...)
	}
	return MakeEndDevicePaths(append([]string{
		"session.dev_addr",
		"session.keys.f_nwk_s_int_key.key",
		"session.keys.nwk_s_enc_key.key",
		"session.keys.s_nwk_s_int_key.key",
		"session.keys.session_key_id",
	}, paths...)...)
}

func MakeMulticastEndDevicePaths(supportsClassB, supportsClassC bool, paths ...string) []string {
	paths = append([]string{
		"multicast",
	}, paths...)
	if supportsClassB {
		paths = append(paths,
			"supports_class_b",
		)
	}
	if supportsClassC {
		paths = append(paths,
			"supports_class_c",
		)
	}
	return MakeABPEndDevicePaths(false, paths...)
}

type SetDeviceRequest struct {
	*ttnpb.EndDevice
	Paths []string
}

func MakeSetDeviceRequest(deviceOpts []test.EndDeviceOption, paths ...string) *SetDeviceRequest {
	return &SetDeviceRequest{
		EndDevice: MakeEndDevice(deviceOpts...),
		Paths:     MakeEndDevicePaths(paths...),
	}
}

func MakeOTAASetDeviceRequest(deviceOpts []test.EndDeviceOption, paths ...string) *SetDeviceRequest {
	return &SetDeviceRequest{
		EndDevice: MakeOTAAEndDevice(deviceOpts...),
		Paths:     MakeOTAAEndDevicePaths(paths...),
	}
}

func MakeABPSetDeviceRequest(defaults ttnpb.MACSettings, sessionOpts []test.SessionOption, macStateOpts []test.MACStateOption, deviceOpts []test.EndDeviceOption, paths ...string) *SetDeviceRequest {
	dev := MakeABPEndDevice(defaults, false, sessionOpts, macStateOpts, deviceOpts...)
	return &SetDeviceRequest{
		EndDevice: dev,
		Paths:     MakeABPEndDevicePaths(!dev.Multicast && dev.LorawanVersion.RequireDevEUIForABP(), paths...),
	}
}

func MakeMulticastSetDeviceRequest(class ttnpb.Class, defaults ttnpb.MACSettings, sessionOpts []test.SessionOption, macStateOpts []test.MACStateOption, deviceOpts []test.EndDeviceOption, paths ...string) *SetDeviceRequest {
	dev := MakeMulticastEndDevice(class, defaults, false, sessionOpts, macStateOpts, deviceOpts...)
	return &SetDeviceRequest{
		EndDevice: dev,
		Paths:     MakeMulticastEndDevicePaths(dev.SupportsClassB, dev.SupportsClassC, paths...),
	}
}

type ContextualEndDevice struct {
	context.Context
	*ttnpb.EndDevice
}

func MustCreateDevice(ctx context.Context, r DeviceRegistry, dev *ttnpb.EndDevice) (*ttnpb.EndDevice, context.Context) {
	dev, ctx, err := CreateDevice(ctx, r, dev, ttnpb.RPCFieldMaskPaths["/ttn.lorawan.v3.NsEndDeviceRegistry/Set"].Allowed...)
	test.Must(nil, err)
	return dev, ctx
}

var _ DownlinkTaskQueue = MockDownlinkTaskQueue{}

// MockDownlinkTaskQueue is a mock DownlinkTaskQueue used for testing.
type MockDownlinkTaskQueue struct {
	AddFunc func(ctx context.Context, devID *ttnpb.EndDeviceIdentifiers, t time.Time, replace bool) error
	PopFunc func(ctx context.Context, f func(context.Context, *ttnpb.EndDeviceIdentifiers, time.Time) (time.Time, error)) error
}

// Add calls AddFunc if set and panics otherwise.
func (m MockDownlinkTaskQueue) Add(ctx context.Context, devID *ttnpb.EndDeviceIdentifiers, t time.Time, replace bool) error {
	if m.AddFunc == nil {
		panic("Add called, but not set")
	}
	return m.AddFunc(ctx, devID, t, replace)
}

// Pop calls PopFunc if set and panics otherwise.
func (m MockDownlinkTaskQueue) Pop(ctx context.Context, consumerID string, f func(context.Context, *ttnpb.EndDeviceIdentifiers, time.Time) (time.Time, error)) error {
	if m.PopFunc == nil {
		panic("Pop called, but not set")
	}
	return m.PopFunc(ctx, f)
}

var _ DeviceRegistry = MockDeviceRegistry{}

// MockDeviceRegistry is a mock DeviceRegistry used for testing.
type MockDeviceRegistry struct {
	GetByIDFunc func(ctx context.Context, appID *ttnpb.ApplicationIdentifiers, devID string, paths []string) (*ttnpb.EndDevice, context.Context, error)
	SetByIDFunc func(ctx context.Context, appID *ttnpb.ApplicationIdentifiers, devID string, paths []string, f func(context.Context, *ttnpb.EndDevice) (*ttnpb.EndDevice, []string, error)) (*ttnpb.EndDevice, context.Context, error)
}

// GetByEUI panics.
func (m MockDeviceRegistry) GetByEUI(ctx context.Context, joinEUI, devEUI types.EUI64, paths []string) (*ttnpb.EndDevice, context.Context, error) {
	panic("GetByEUI must not be called")
}

// GetByID calls GetByIDFunc if set and panics otherwise.
func (m MockDeviceRegistry) GetByID(ctx context.Context, appID *ttnpb.ApplicationIdentifiers, devID string, paths []string) (*ttnpb.EndDevice, context.Context, error) {
	if m.GetByIDFunc == nil {
		panic("GetByID called, but not set")
	}
	return m.GetByIDFunc(ctx, appID, devID, paths)
}

// SetByID calls SetByIDFunc if set and panics otherwise.
func (m MockDeviceRegistry) SetByID(ctx context.Context, appID *ttnpb.ApplicationIdentifiers, devID string, paths []string, f func(context.Context, *ttnpb.EndDevice) (*ttnpb.EndDevice, []string, error)) (*ttnpb.EndDevice, context.Context, error) {
	if m.SetByIDFunc == nil {
		panic("SetByID called, but not set")
	}
	return m.SetByIDFunc(ctx, appID, devID, paths, f)
}

// RangeByUplinkMatches panics.
func (m MockDeviceRegistry) RangeByUplinkMatches(context.Context, *ttnpb.UplinkMessage, time.Duration, func(context.Context, *UplinkMatch) (bool, error)) error {
	panic("RangeByUplinkMatches must not be called")
}

// Range panics.
func (m MockDeviceRegistry) Range(ctx context.Context, paths []string, f func(context.Context, *ttnpb.EndDeviceIdentifiers, *ttnpb.EndDevice) bool) error {
	panic("Range must not be called")
}
