// Code generated by protoc-gen-gogo. DO NOT EDIT.
// source: lorawan-stack/api/gateway_configuration.proto

package ttnpb

import (
	context "context"
	fmt "fmt"
	_ "github.com/envoyproxy/protoc-gen-validate/validate"
	proto "github.com/gogo/protobuf/proto"
	_ "google.golang.org/genproto/googleapis/api/annotations"
	grpc "google.golang.org/grpc"
	codes "google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
	math "math"
)

// Reference imports to suppress errors if they are not otherwise used.
var _ = proto.Marshal
var _ = fmt.Errorf
var _ = math.Inf

// This is a compile-time assertion to ensure that this generated file
// is compatible with the proto package it is being compiled against.
// A compilation error at this line likely means your copy of the
// proto package needs to be updated.
const _ = proto.GoGoProtoPackageIsVersion3 // please upgrade the proto package

type GetGatewayConfigurationRequest struct {
	GatewayIds           *GatewayIdentifiers `protobuf:"bytes,1,opt,name=gateway_ids,json=gatewayIds,proto3" json:"gateway_ids,omitempty"`
	Format               string              `protobuf:"bytes,2,opt,name=format,proto3" json:"format,omitempty"`
	Type                 string              `protobuf:"bytes,3,opt,name=type,proto3" json:"type,omitempty"`
	Filename             string              `protobuf:"bytes,4,opt,name=filename,proto3" json:"filename,omitempty"`
	XXX_NoUnkeyedLiteral struct{}            `json:"-"`
	XXX_unrecognized     []byte              `json:"-"`
	XXX_sizecache        int32               `json:"-"`
}

func (m *GetGatewayConfigurationRequest) Reset()         { *m = GetGatewayConfigurationRequest{} }
func (m *GetGatewayConfigurationRequest) String() string { return proto.CompactTextString(m) }
func (*GetGatewayConfigurationRequest) ProtoMessage()    {}
func (*GetGatewayConfigurationRequest) Descriptor() ([]byte, []int) {
	return fileDescriptor_8b59222464c10014, []int{0}
}
func (m *GetGatewayConfigurationRequest) XXX_Unmarshal(b []byte) error {
	return xxx_messageInfo_GetGatewayConfigurationRequest.Unmarshal(m, b)
}
func (m *GetGatewayConfigurationRequest) XXX_Marshal(b []byte, deterministic bool) ([]byte, error) {
	return xxx_messageInfo_GetGatewayConfigurationRequest.Marshal(b, m, deterministic)
}
func (m *GetGatewayConfigurationRequest) XXX_Merge(src proto.Message) {
	xxx_messageInfo_GetGatewayConfigurationRequest.Merge(m, src)
}
func (m *GetGatewayConfigurationRequest) XXX_Size() int {
	return xxx_messageInfo_GetGatewayConfigurationRequest.Size(m)
}
func (m *GetGatewayConfigurationRequest) XXX_DiscardUnknown() {
	xxx_messageInfo_GetGatewayConfigurationRequest.DiscardUnknown(m)
}

var xxx_messageInfo_GetGatewayConfigurationRequest proto.InternalMessageInfo

func (m *GetGatewayConfigurationRequest) GetGatewayIds() *GatewayIdentifiers {
	if m != nil {
		return m.GatewayIds
	}
	return nil
}

func (m *GetGatewayConfigurationRequest) GetFormat() string {
	if m != nil {
		return m.Format
	}
	return ""
}

func (m *GetGatewayConfigurationRequest) GetType() string {
	if m != nil {
		return m.Type
	}
	return ""
}

func (m *GetGatewayConfigurationRequest) GetFilename() string {
	if m != nil {
		return m.Filename
	}
	return ""
}

type GetGatewayConfigurationResponse struct {
	Contents             []byte   `protobuf:"bytes,1,opt,name=contents,proto3" json:"contents,omitempty"`
	XXX_NoUnkeyedLiteral struct{} `json:"-"`
	XXX_unrecognized     []byte   `json:"-"`
	XXX_sizecache        int32    `json:"-"`
}

func (m *GetGatewayConfigurationResponse) Reset()         { *m = GetGatewayConfigurationResponse{} }
func (m *GetGatewayConfigurationResponse) String() string { return proto.CompactTextString(m) }
func (*GetGatewayConfigurationResponse) ProtoMessage()    {}
func (*GetGatewayConfigurationResponse) Descriptor() ([]byte, []int) {
	return fileDescriptor_8b59222464c10014, []int{1}
}
func (m *GetGatewayConfigurationResponse) XXX_Unmarshal(b []byte) error {
	return xxx_messageInfo_GetGatewayConfigurationResponse.Unmarshal(m, b)
}
func (m *GetGatewayConfigurationResponse) XXX_Marshal(b []byte, deterministic bool) ([]byte, error) {
	return xxx_messageInfo_GetGatewayConfigurationResponse.Marshal(b, m, deterministic)
}
func (m *GetGatewayConfigurationResponse) XXX_Merge(src proto.Message) {
	xxx_messageInfo_GetGatewayConfigurationResponse.Merge(m, src)
}
func (m *GetGatewayConfigurationResponse) XXX_Size() int {
	return xxx_messageInfo_GetGatewayConfigurationResponse.Size(m)
}
func (m *GetGatewayConfigurationResponse) XXX_DiscardUnknown() {
	xxx_messageInfo_GetGatewayConfigurationResponse.DiscardUnknown(m)
}

var xxx_messageInfo_GetGatewayConfigurationResponse proto.InternalMessageInfo

func (m *GetGatewayConfigurationResponse) GetContents() []byte {
	if m != nil {
		return m.Contents
	}
	return nil
}

func init() {
	proto.RegisterType((*GetGatewayConfigurationRequest)(nil), "ttn.lorawan.v3.GetGatewayConfigurationRequest")
	proto.RegisterType((*GetGatewayConfigurationResponse)(nil), "ttn.lorawan.v3.GetGatewayConfigurationResponse")
}

func init() {
	proto.RegisterFile("lorawan-stack/api/gateway_configuration.proto", fileDescriptor_8b59222464c10014)
}

var fileDescriptor_8b59222464c10014 = []byte{
	// 484 bytes of a gzipped FileDescriptorProto
	0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xff, 0xa4, 0x93, 0xc1, 0x6e, 0x13, 0x31,
	0x10, 0x86, 0xb5, 0x4b, 0xa9, 0x82, 0x8b, 0x10, 0xf2, 0x85, 0x55, 0x40, 0x50, 0xd2, 0xa0, 0xa6,
	0xa8, 0x6b, 0x43, 0x72, 0x02, 0x09, 0x2a, 0x96, 0x43, 0x0b, 0x12, 0x42, 0x84, 0x5b, 0xaa, 0xb6,
	0x72, 0x36, 0x13, 0xc7, 0x4a, 0x62, 0x2f, 0xf6, 0x24, 0x21, 0x84, 0x5c, 0x38, 0x72, 0xe5, 0x01,
	0x38, 0x20, 0xf1, 0x16, 0x9c, 0x78, 0x04, 0x5e, 0x81, 0xa7, 0xc8, 0x09, 0x75, 0xb3, 0x69, 0x13,
	0xa5, 0x45, 0xa0, 0xde, 0xc6, 0xf2, 0xfc, 0xdf, 0x8c, 0x67, 0x7e, 0x93, 0xb0, 0x63, 0xac, 0x18,
	0x08, 0x1d, 0x3a, 0x14, 0x71, 0x9b, 0x8b, 0x44, 0x71, 0x29, 0x10, 0x06, 0x62, 0x78, 0x14, 0x1b,
	0xdd, 0x54, 0xb2, 0x67, 0x05, 0x2a, 0xa3, 0x59, 0x62, 0x0d, 0x1a, 0x7a, 0x0d, 0x51, 0xb3, 0x4c,
	0xc2, 0xfa, 0x95, 0xfc, 0x33, 0xa9, 0xb0, 0xd5, 0xab, 0xb3, 0xd8, 0x74, 0x39, 0xe8, 0xbe, 0x19,
	0x26, 0xd6, 0xbc, 0x1f, 0xf2, 0x34, 0x39, 0x0e, 0x25, 0xe8, 0xb0, 0x2f, 0x3a, 0xaa, 0x21, 0x10,
	0xf8, 0x52, 0x30, 0x45, 0xe6, 0x6f, 0x49, 0x63, 0x64, 0x07, 0xd2, 0xd2, 0x42, 0x6b, 0x83, 0x69,
	0x3d, 0x97, 0xdd, 0x6e, 0x2c, 0xf7, 0xa7, 0x1a, 0xa0, 0x51, 0x35, 0x15, 0xd8, 0x2c, 0xa9, 0xf0,
	0xc3, 0x27, 0xb7, 0x77, 0x01, 0x77, 0xa7, 0x8d, 0x3f, 0x9f, 0xef, 0xbb, 0x0a, 0xef, 0x7a, 0xe0,
	0x90, 0xbe, 0x22, 0x6b, 0xb3, 0x77, 0xa9, 0x86, 0x0b, 0xbc, 0x75, 0xaf, 0xb4, 0x56, 0x2e, 0xb0,
	0xc5, 0xe7, 0xb0, 0x8c, 0xf0, 0xe2, 0xb4, 0x42, 0x94, 0x9b, 0x44, 0x97, 0x3f, 0x7b, 0xfe, 0x75,
	0xaf, 0x4a, 0xe4, 0xec, 0xd6, 0xd1, 0x88, 0xac, 0x36, 0x8d, 0xed, 0x0a, 0x0c, 0xfc, 0x75, 0xaf,
	0x74, 0x25, 0xba, 0x3f, 0x89, 0x36, 0xed, 0xbd, 0xa0, 0x58, 0xbe, 0x7b, 0xb8, 0x2f, 0xc2, 0x0f,
	0x0f, 0xc2, 0x47, 0x07, 0xa5, 0x9d, 0xc7, 0xfb, 0xe1, 0xc1, 0xce, 0xec, 0xb8, 0x35, 0x2a, 0x6f,
	0x8f, 0x8b, 0x1f, 0x0f, 0x8b, 0xd5, 0x4c, 0x49, 0x9f, 0x92, 0x15, 0x1c, 0x26, 0x10, 0x5c, 0xfa,
	0x6f, 0x42, 0xaa, 0xa3, 0x7b, 0x24, 0xd7, 0x54, 0x1d, 0xd0, 0xa2, 0x0b, 0xc1, 0x4a, 0xca, 0xd8,
	0x9e, 0x44, 0x5b, 0x76, 0x33, 0x28, 0x96, 0x37, 0x16, 0x19, 0xec, 0xe8, 0x2c, 0xca, 0x89, 0xba,
	0xf0, 0x84, 0xdc, 0x39, 0x77, 0x7c, 0x2e, 0x31, 0xda, 0x01, 0xcd, 0x93, 0x5c, 0x6c, 0x34, 0x82,
	0xc6, 0xe9, 0xf0, 0xae, 0x56, 0x4f, 0xce, 0xe5, 0x9f, 0x3e, 0xb9, 0x79, 0x96, 0xf8, 0x2d, 0xd8,
	0xbe, 0x8a, 0x81, 0x7e, 0xf3, 0xc9, 0x8d, 0x73, 0xf8, 0x94, 0x2d, 0xad, 0xe0, 0xaf, 0x7b, 0xcc,
	0xf3, 0x7f, 0xce, 0x9f, 0x36, 0x5e, 0xf8, 0xee, 0x7d, 0xfa, 0xf5, 0xfb, 0x8b, 0xff, 0xd5, 0xab,
	0xbd, 0xa4, 0x7b, 0x5c, 0xc6, 0x6e, 0xe6, 0x6f, 0xc7, 0x17, 0x0c, 0xce, 0x47, 0x73, 0xfe, 0x60,
	0xa7, 0xf1, 0x98, 0x8f, 0xa6, 0xfb, 0x3a, 0x0e, 0xb2, 0x81, 0x8d, 0x6b, 0x6f, 0xe8, 0xeb, 0x0b,
	0xb2, 0x8e, 0x57, 0x38, 0x8f, 0x8c, 0x1e, 0xd6, 0xb8, 0x34, 0x0c, 0x5b, 0x80, 0x2d, 0xa5, 0xa5,
	0x63, 0x1a, 0x70, 0x60, 0x6c, 0x9b, 0x2f, 0x7e, 0x80, 0x7e, 0x85, 0x27, 0x6d, 0xc9, 0x11, 0x75,
	0x52, 0xaf, 0xaf, 0xa6, 0xf6, 0xaf, 0xfc, 0x09, 0x00, 0x00, 0xff, 0xff, 0xae, 0xd5, 0x50, 0xf4,
	0xc5, 0x03, 0x00, 0x00,
}

// Reference imports to suppress errors if they are not otherwise used.
var _ context.Context
var _ grpc.ClientConn

// This is a compile-time assertion to ensure that this generated file
// is compatible with the grpc package it is being compiled against.
const _ = grpc.SupportPackageIsVersion4

// GatewayConfigurationServiceClient is the client API for GatewayConfigurationService service.
//
// For semantics around ctx use and closing/ending streaming RPCs, please refer to https://godoc.org/google.golang.org/grpc#ClientConn.NewStream.
type GatewayConfigurationServiceClient interface {
	GetGatewayConfiguration(ctx context.Context, in *GetGatewayConfigurationRequest, opts ...grpc.CallOption) (*GetGatewayConfigurationResponse, error)
}

type gatewayConfigurationServiceClient struct {
	cc *grpc.ClientConn
}

func NewGatewayConfigurationServiceClient(cc *grpc.ClientConn) GatewayConfigurationServiceClient {
	return &gatewayConfigurationServiceClient{cc}
}

func (c *gatewayConfigurationServiceClient) GetGatewayConfiguration(ctx context.Context, in *GetGatewayConfigurationRequest, opts ...grpc.CallOption) (*GetGatewayConfigurationResponse, error) {
	out := new(GetGatewayConfigurationResponse)
	err := c.cc.Invoke(ctx, "/ttn.lorawan.v3.GatewayConfigurationService/GetGatewayConfiguration", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// GatewayConfigurationServiceServer is the server API for GatewayConfigurationService service.
type GatewayConfigurationServiceServer interface {
	GetGatewayConfiguration(context.Context, *GetGatewayConfigurationRequest) (*GetGatewayConfigurationResponse, error)
}

// UnimplementedGatewayConfigurationServiceServer can be embedded to have forward compatible implementations.
type UnimplementedGatewayConfigurationServiceServer struct {
}

func (*UnimplementedGatewayConfigurationServiceServer) GetGatewayConfiguration(ctx context.Context, req *GetGatewayConfigurationRequest) (*GetGatewayConfigurationResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method GetGatewayConfiguration not implemented")
}

func RegisterGatewayConfigurationServiceServer(s *grpc.Server, srv GatewayConfigurationServiceServer) {
	s.RegisterService(&_GatewayConfigurationService_serviceDesc, srv)
}

func _GatewayConfigurationService_GetGatewayConfiguration_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(GetGatewayConfigurationRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(GatewayConfigurationServiceServer).GetGatewayConfiguration(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/ttn.lorawan.v3.GatewayConfigurationService/GetGatewayConfiguration",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(GatewayConfigurationServiceServer).GetGatewayConfiguration(ctx, req.(*GetGatewayConfigurationRequest))
	}
	return interceptor(ctx, in, info, handler)
}

var _GatewayConfigurationService_serviceDesc = grpc.ServiceDesc{
	ServiceName: "ttn.lorawan.v3.GatewayConfigurationService",
	HandlerType: (*GatewayConfigurationServiceServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "GetGatewayConfiguration",
			Handler:    _GatewayConfigurationService_GetGatewayConfiguration_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "lorawan-stack/api/gateway_configuration.proto",
}