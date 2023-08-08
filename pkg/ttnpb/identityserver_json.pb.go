// Code generated by protoc-gen-go-json. DO NOT EDIT.
// versions:
// - protoc-gen-go-json v1.5.1
// - protoc             v4.22.2
// source: ttn/lorawan/v3/identityserver.proto

package ttnpb

import (
	golang "github.com/TheThingsIndustries/protoc-gen-go-json/golang"
	jsonplugin "github.com/TheThingsIndustries/protoc-gen-go-json/jsonplugin"
)

// MarshalProtoJSON marshals the AuthInfoResponse_APIKeyAccess message to JSON.
func (x *AuthInfoResponse_APIKeyAccess) MarshalProtoJSON(s *jsonplugin.MarshalState) {
	if x == nil {
		s.WriteNil()
		return
	}
	s.WriteObjectStart()
	var wroteField bool
	if x.ApiKey != nil || s.HasField("api_key") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("api_key")
		x.ApiKey.MarshalProtoJSON(s.WithField("api_key"))
	}
	if x.EntityIds != nil || s.HasField("entity_ids") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("entity_ids")
		x.EntityIds.MarshalProtoJSON(s.WithField("entity_ids"))
	}
	s.WriteObjectEnd()
}

// MarshalJSON marshals the AuthInfoResponse_APIKeyAccess to JSON.
func (x *AuthInfoResponse_APIKeyAccess) MarshalJSON() ([]byte, error) {
	return jsonplugin.DefaultMarshalerConfig.Marshal(x)
}

// UnmarshalProtoJSON unmarshals the AuthInfoResponse_APIKeyAccess message from JSON.
func (x *AuthInfoResponse_APIKeyAccess) UnmarshalProtoJSON(s *jsonplugin.UnmarshalState) {
	if s.ReadNil() {
		return
	}
	s.ReadObject(func(key string) {
		switch key {
		default:
			s.ReadAny() // ignore unknown field
		case "api_key", "apiKey":
			if s.ReadNil() {
				x.ApiKey = nil
				return
			}
			x.ApiKey = &APIKey{}
			x.ApiKey.UnmarshalProtoJSON(s.WithField("api_key", true))
		case "entity_ids", "entityIds":
			if s.ReadNil() {
				x.EntityIds = nil
				return
			}
			x.EntityIds = &EntityIdentifiers{}
			x.EntityIds.UnmarshalProtoJSON(s.WithField("entity_ids", true))
		}
	})
}

// UnmarshalJSON unmarshals the AuthInfoResponse_APIKeyAccess from JSON.
func (x *AuthInfoResponse_APIKeyAccess) UnmarshalJSON(b []byte) error {
	return jsonplugin.DefaultUnmarshalerConfig.Unmarshal(b, x)
}

// MarshalProtoJSON marshals the AuthInfoResponse_GatewayToken message to JSON.
func (x *AuthInfoResponse_GatewayToken) MarshalProtoJSON(s *jsonplugin.MarshalState) {
	if x == nil {
		s.WriteNil()
		return
	}
	s.WriteObjectStart()
	var wroteField bool
	if x.GatewayIds != nil || s.HasField("gateway_ids") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("gateway_ids")
		x.GatewayIds.MarshalProtoJSON(s.WithField("gateway_ids"))
	}
	if len(x.Rights) > 0 || s.HasField("rights") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("rights")
		s.WriteArrayStart()
		var wroteElement bool
		for _, element := range x.Rights {
			s.WriteMoreIf(&wroteElement)
			element.MarshalProtoJSON(s)
		}
		s.WriteArrayEnd()
	}
	s.WriteObjectEnd()
}

// MarshalJSON marshals the AuthInfoResponse_GatewayToken to JSON.
func (x *AuthInfoResponse_GatewayToken) MarshalJSON() ([]byte, error) {
	return jsonplugin.DefaultMarshalerConfig.Marshal(x)
}

// UnmarshalProtoJSON unmarshals the AuthInfoResponse_GatewayToken message from JSON.
func (x *AuthInfoResponse_GatewayToken) UnmarshalProtoJSON(s *jsonplugin.UnmarshalState) {
	if s.ReadNil() {
		return
	}
	s.ReadObject(func(key string) {
		switch key {
		default:
			s.ReadAny() // ignore unknown field
		case "gateway_ids", "gatewayIds":
			if s.ReadNil() {
				x.GatewayIds = nil
				return
			}
			x.GatewayIds = &GatewayIdentifiers{}
			x.GatewayIds.UnmarshalProtoJSON(s.WithField("gateway_ids", true))
		case "rights":
			s.AddField("rights")
			if s.ReadNil() {
				x.Rights = nil
				return
			}
			s.ReadArray(func() {
				var v Right
				v.UnmarshalProtoJSON(s)
				x.Rights = append(x.Rights, v)
			})
		}
	})
}

// UnmarshalJSON unmarshals the AuthInfoResponse_GatewayToken from JSON.
func (x *AuthInfoResponse_GatewayToken) UnmarshalJSON(b []byte) error {
	return jsonplugin.DefaultUnmarshalerConfig.Unmarshal(b, x)
}

// MarshalProtoJSON marshals the AuthInfoResponse message to JSON.
func (x *AuthInfoResponse) MarshalProtoJSON(s *jsonplugin.MarshalState) {
	if x == nil {
		s.WriteNil()
		return
	}
	s.WriteObjectStart()
	var wroteField bool
	if x.AccessMethod != nil {
		switch ov := x.AccessMethod.(type) {
		case *AuthInfoResponse_ApiKey:
			s.WriteMoreIf(&wroteField)
			s.WriteObjectField("api_key")
			ov.ApiKey.MarshalProtoJSON(s.WithField("api_key"))
		case *AuthInfoResponse_OauthAccessToken:
			s.WriteMoreIf(&wroteField)
			s.WriteObjectField("oauth_access_token")
			ov.OauthAccessToken.MarshalProtoJSON(s.WithField("oauth_access_token"))
		case *AuthInfoResponse_UserSession:
			s.WriteMoreIf(&wroteField)
			s.WriteObjectField("user_session")
			// NOTE: UserSession does not seem to implement MarshalProtoJSON.
			golang.MarshalMessage(s, ov.UserSession)
		case *AuthInfoResponse_GatewayToken_:
			s.WriteMoreIf(&wroteField)
			s.WriteObjectField("gateway_token")
			ov.GatewayToken.MarshalProtoJSON(s.WithField("gateway_token"))
		}
	}
	if x.UniversalRights != nil || s.HasField("universal_rights") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("universal_rights")
		x.UniversalRights.MarshalProtoJSON(s.WithField("universal_rights"))
	}
	if x.IsAdmin || s.HasField("is_admin") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("is_admin")
		s.WriteBool(x.IsAdmin)
	}
	s.WriteObjectEnd()
}

// MarshalJSON marshals the AuthInfoResponse to JSON.
func (x *AuthInfoResponse) MarshalJSON() ([]byte, error) {
	return jsonplugin.DefaultMarshalerConfig.Marshal(x)
}

// UnmarshalProtoJSON unmarshals the AuthInfoResponse message from JSON.
func (x *AuthInfoResponse) UnmarshalProtoJSON(s *jsonplugin.UnmarshalState) {
	if s.ReadNil() {
		return
	}
	s.ReadObject(func(key string) {
		switch key {
		default:
			s.ReadAny() // ignore unknown field
		case "api_key", "apiKey":
			ov := &AuthInfoResponse_ApiKey{}
			x.AccessMethod = ov
			if s.ReadNil() {
				ov.ApiKey = nil
				return
			}
			ov.ApiKey = &AuthInfoResponse_APIKeyAccess{}
			ov.ApiKey.UnmarshalProtoJSON(s.WithField("api_key", true))
		case "oauth_access_token", "oauthAccessToken":
			ov := &AuthInfoResponse_OauthAccessToken{}
			x.AccessMethod = ov
			if s.ReadNil() {
				ov.OauthAccessToken = nil
				return
			}
			ov.OauthAccessToken = &OAuthAccessToken{}
			ov.OauthAccessToken.UnmarshalProtoJSON(s.WithField("oauth_access_token", true))
		case "user_session", "userSession":
			s.AddField("user_session")
			ov := &AuthInfoResponse_UserSession{}
			x.AccessMethod = ov
			if s.ReadNil() {
				ov.UserSession = nil
				return
			}
			// NOTE: UserSession does not seem to implement UnmarshalProtoJSON.
			var v UserSession
			golang.UnmarshalMessage(s, &v)
			ov.UserSession = &v
		case "gateway_token", "gatewayToken":
			ov := &AuthInfoResponse_GatewayToken_{}
			x.AccessMethod = ov
			if s.ReadNil() {
				ov.GatewayToken = nil
				return
			}
			ov.GatewayToken = &AuthInfoResponse_GatewayToken{}
			ov.GatewayToken.UnmarshalProtoJSON(s.WithField("gateway_token", true))
		case "universal_rights", "universalRights":
			if s.ReadNil() {
				x.UniversalRights = nil
				return
			}
			x.UniversalRights = &Rights{}
			x.UniversalRights.UnmarshalProtoJSON(s.WithField("universal_rights", true))
		case "is_admin", "isAdmin":
			s.AddField("is_admin")
			x.IsAdmin = s.ReadBool()
		}
	})
}

// UnmarshalJSON unmarshals the AuthInfoResponse from JSON.
func (x *AuthInfoResponse) UnmarshalJSON(b []byte) error {
	return jsonplugin.DefaultUnmarshalerConfig.Unmarshal(b, x)
}
