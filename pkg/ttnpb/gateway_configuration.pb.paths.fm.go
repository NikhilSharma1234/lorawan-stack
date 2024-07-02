// Code generated by protoc-gen-fieldmask. DO NOT EDIT.

package ttnpb

var GetGatewayConfigurationRequestFieldPathsNested = []string{
	"filename",
	"format",
	"gateway_ids",
	"gateway_ids.eui",
	"gateway_ids.gateway_id",
	"type",
}

var GetGatewayConfigurationRequestFieldPathsTopLevel = []string{
	"filename",
	"format",
	"gateway_ids",
	"type",
}
var GetGatewayConfigurationResponseFieldPathsNested = []string{
	"contents",
}

var GetGatewayConfigurationResponseFieldPathsTopLevel = []string{
	"contents",
}
var UpdateManagedGatewayRequestFieldPathsNested = []string{
	"field_mask",
	"gateway",
	"gateway.cellular_imei",
	"gateway.cellular_imsi",
	"gateway.ethernet_mac_address",
	"gateway.ethernet_profile_id",
	"gateway.ids",
	"gateway.ids.eui",
	"gateway.ids.gateway_id",
	"gateway.version_ids",
	"gateway.version_ids.brand_id",
	"gateway.version_ids.firmware_version",
	"gateway.version_ids.hardware_version",
	"gateway.version_ids.model_id",
	"gateway.version_ids.runtime_version",
	"gateway.wifi_mac_address",
	"gateway.wifi_profile_id",
}

var UpdateManagedGatewayRequestFieldPathsTopLevel = []string{
	"field_mask",
	"gateway",
}
var CreateManagedGatewayWiFiProfileRequestFieldPathsNested = []string{
	"collaborator",
	"collaborator.ids",
	"collaborator.ids.organization_ids",
	"collaborator.ids.organization_ids.organization_id",
	"collaborator.ids.user_ids",
	"collaborator.ids.user_ids.email",
	"collaborator.ids.user_ids.user_id",
	"profile",
	"profile.network_interface_addresses",
	"profile.network_interface_addresses.dns_servers",
	"profile.network_interface_addresses.gateway",
	"profile.network_interface_addresses.ip_addresses",
	"profile.network_interface_addresses.subnet_mask",
	"profile.password",
	"profile.profile_id",
	"profile.profile_name",
	"profile.ssid",
}

var CreateManagedGatewayWiFiProfileRequestFieldPathsTopLevel = []string{
	"collaborator",
	"profile",
}
var UpdateManagedGatewayWiFiProfileRequestFieldPathsNested = []string{
	"collaborator",
	"collaborator.ids",
	"collaborator.ids.organization_ids",
	"collaborator.ids.organization_ids.organization_id",
	"collaborator.ids.user_ids",
	"collaborator.ids.user_ids.email",
	"collaborator.ids.user_ids.user_id",
	"field_mask",
	"profile",
	"profile.network_interface_addresses",
	"profile.network_interface_addresses.dns_servers",
	"profile.network_interface_addresses.gateway",
	"profile.network_interface_addresses.ip_addresses",
	"profile.network_interface_addresses.subnet_mask",
	"profile.password",
	"profile.profile_id",
	"profile.profile_name",
	"profile.ssid",
}

var UpdateManagedGatewayWiFiProfileRequestFieldPathsTopLevel = []string{
	"collaborator",
	"field_mask",
	"profile",
}
var ListManagedGatewayWiFiProfilesRequestFieldPathsNested = []string{
	"collaborator",
	"collaborator.ids",
	"collaborator.ids.organization_ids",
	"collaborator.ids.organization_ids.organization_id",
	"collaborator.ids.user_ids",
	"collaborator.ids.user_ids.email",
	"collaborator.ids.user_ids.user_id",
	"field_mask",
	"limit",
	"page",
}

var ListManagedGatewayWiFiProfilesRequestFieldPathsTopLevel = []string{
	"collaborator",
	"field_mask",
	"limit",
	"page",
}
var GetManagedGatewayWiFiProfileRequestFieldPathsNested = []string{
	"collaborator",
	"collaborator.ids",
	"collaborator.ids.organization_ids",
	"collaborator.ids.organization_ids.organization_id",
	"collaborator.ids.user_ids",
	"collaborator.ids.user_ids.email",
	"collaborator.ids.user_ids.user_id",
	"field_mask",
	"profile_id",
}

var GetManagedGatewayWiFiProfileRequestFieldPathsTopLevel = []string{
	"collaborator",
	"field_mask",
	"profile_id",
}
var DeleteManagedGatewayWiFiProfileRequestFieldPathsNested = []string{
	"collaborator",
	"collaborator.ids",
	"collaborator.ids.organization_ids",
	"collaborator.ids.organization_ids.organization_id",
	"collaborator.ids.user_ids",
	"collaborator.ids.user_ids.email",
	"collaborator.ids.user_ids.user_id",
	"profile_id",
}

var DeleteManagedGatewayWiFiProfileRequestFieldPathsTopLevel = []string{
	"collaborator",
	"profile_id",
}
var CreateManagedGatewayEthernetProfileRequestFieldPathsNested = []string{
	"collaborator",
	"collaborator.ids",
	"collaborator.ids.organization_ids",
	"collaborator.ids.organization_ids.organization_id",
	"collaborator.ids.user_ids",
	"collaborator.ids.user_ids.email",
	"collaborator.ids.user_ids.user_id",
	"profile",
	"profile.network_interface_addresses",
	"profile.network_interface_addresses.dns_servers",
	"profile.network_interface_addresses.gateway",
	"profile.network_interface_addresses.ip_addresses",
	"profile.network_interface_addresses.subnet_mask",
	"profile.profile_id",
	"profile.profile_name",
}

var CreateManagedGatewayEthernetProfileRequestFieldPathsTopLevel = []string{
	"collaborator",
	"profile",
}
var UpdateManagedGatewayEthernetProfileRequestFieldPathsNested = []string{
	"collaborator",
	"collaborator.ids",
	"collaborator.ids.organization_ids",
	"collaborator.ids.organization_ids.organization_id",
	"collaborator.ids.user_ids",
	"collaborator.ids.user_ids.email",
	"collaborator.ids.user_ids.user_id",
	"field_mask",
	"profile",
	"profile.network_interface_addresses",
	"profile.network_interface_addresses.dns_servers",
	"profile.network_interface_addresses.gateway",
	"profile.network_interface_addresses.ip_addresses",
	"profile.network_interface_addresses.subnet_mask",
	"profile.profile_id",
	"profile.profile_name",
}

var UpdateManagedGatewayEthernetProfileRequestFieldPathsTopLevel = []string{
	"collaborator",
	"field_mask",
	"profile",
}
var ListManagedGatewayEthernetProfilesRequestFieldPathsNested = []string{
	"collaborator",
	"collaborator.ids",
	"collaborator.ids.organization_ids",
	"collaborator.ids.organization_ids.organization_id",
	"collaborator.ids.user_ids",
	"collaborator.ids.user_ids.email",
	"collaborator.ids.user_ids.user_id",
	"field_mask",
	"limit",
	"page",
}

var ListManagedGatewayEthernetProfilesRequestFieldPathsTopLevel = []string{
	"collaborator",
	"field_mask",
	"limit",
	"page",
}
var GetManagedGatewayEthernetProfileRequestFieldPathsNested = []string{
	"collaborator",
	"collaborator.ids",
	"collaborator.ids.organization_ids",
	"collaborator.ids.organization_ids.organization_id",
	"collaborator.ids.user_ids",
	"collaborator.ids.user_ids.email",
	"collaborator.ids.user_ids.user_id",
	"field_mask",
	"profile_id",
}

var GetManagedGatewayEthernetProfileRequestFieldPathsTopLevel = []string{
	"collaborator",
	"field_mask",
	"profile_id",
}
var DeleteManagedGatewayEthernetProfileRequestFieldPathsNested = []string{
	"collaborator",
	"collaborator.ids",
	"collaborator.ids.organization_ids",
	"collaborator.ids.organization_ids.organization_id",
	"collaborator.ids.user_ids",
	"collaborator.ids.user_ids.email",
	"collaborator.ids.user_ids.user_id",
	"profile_id",
}

var DeleteManagedGatewayEthernetProfileRequestFieldPathsTopLevel = []string{
	"collaborator",
	"profile_id",
}
