// Code generated by protoc-gen-go-json. DO NOT EDIT.
// versions:
// - protoc-gen-go-json v1.5.1
// - protoc             v4.22.2
// source: ttn/lorawan/v3/events.proto

package ttnpb

import (
	golang "github.com/TheThingsIndustries/protoc-gen-go-json/golang"
	jsonplugin "github.com/TheThingsIndustries/protoc-gen-go-json/jsonplugin"
)

// MarshalProtoJSON marshals the Event message to JSON.
func (x *Event) MarshalProtoJSON(s *jsonplugin.MarshalState) {
	if x == nil {
		s.WriteNil()
		return
	}
	s.WriteObjectStart()
	var wroteField bool
	if x.Name != "" || s.HasField("name") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("name")
		s.WriteString(x.Name)
	}
	if x.Time != nil || s.HasField("time") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("time")
		if x.Time == nil {
			s.WriteNil()
		} else {
			golang.MarshalTimestamp(s, x.Time)
		}
	}
	if len(x.Identifiers) > 0 || s.HasField("identifiers") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("identifiers")
		s.WriteArrayStart()
		var wroteElement bool
		for _, element := range x.Identifiers {
			s.WriteMoreIf(&wroteElement)
			element.MarshalProtoJSON(s.WithField("identifiers"))
		}
		s.WriteArrayEnd()
	}
	if x.Data != nil || s.HasField("data") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("data")
		if x.Data == nil {
			s.WriteNil()
		} else {
			golang.MarshalAny(s, x.Data, true)
		}
	}
	if len(x.CorrelationIds) > 0 || s.HasField("correlation_ids") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("correlation_ids")
		s.WriteStringArray(x.CorrelationIds)
	}
	if x.Origin != "" || s.HasField("origin") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("origin")
		s.WriteString(x.Origin)
	}
	if x.Context != nil || s.HasField("context") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("context")
		s.WriteObjectStart()
		var wroteElement bool
		for k, v := range x.Context {
			s.WriteMoreIf(&wroteElement)
			s.WriteObjectStringField(k)
			s.WriteBytes(v)
		}
		s.WriteObjectEnd()
	}
	if x.Visibility != nil || s.HasField("visibility") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("visibility")
		x.Visibility.MarshalProtoJSON(s.WithField("visibility"))
	}
	if x.Authentication != nil || s.HasField("authentication") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("authentication")
		// NOTE: Event_Authentication does not seem to implement MarshalProtoJSON.
		golang.MarshalMessage(s, x.Authentication)
	}
	if x.RemoteIp != "" || s.HasField("remote_ip") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("remote_ip")
		s.WriteString(x.RemoteIp)
	}
	if x.UserAgent != "" || s.HasField("user_agent") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("user_agent")
		s.WriteString(x.UserAgent)
	}
	if x.UniqueId != "" || s.HasField("unique_id") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("unique_id")
		s.WriteString(x.UniqueId)
	}
	s.WriteObjectEnd()
}

// MarshalJSON marshals the Event to JSON.
func (x *Event) MarshalJSON() ([]byte, error) {
	return jsonplugin.DefaultMarshalerConfig.Marshal(x)
}

// UnmarshalProtoJSON unmarshals the Event message from JSON.
func (x *Event) UnmarshalProtoJSON(s *jsonplugin.UnmarshalState) {
	if s.ReadNil() {
		return
	}
	s.ReadObject(func(key string) {
		switch key {
		default:
			s.ReadAny() // ignore unknown field
		case "name":
			s.AddField("name")
			x.Name = s.ReadString()
		case "time":
			s.AddField("time")
			if s.ReadNil() {
				x.Time = nil
				return
			}
			v := golang.UnmarshalTimestamp(s)
			if s.Err() != nil {
				return
			}
			x.Time = v
		case "identifiers":
			s.AddField("identifiers")
			if s.ReadNil() {
				x.Identifiers = nil
				return
			}
			s.ReadArray(func() {
				if s.ReadNil() {
					x.Identifiers = append(x.Identifiers, nil)
					return
				}
				v := &EntityIdentifiers{}
				v.UnmarshalProtoJSON(s.WithField("identifiers", false))
				if s.Err() != nil {
					return
				}
				x.Identifiers = append(x.Identifiers, v)
			})
		case "data":
			s.AddField("data")
			if s.ReadNil() {
				x.Data = nil
				return
			}
			v := golang.UnmarshalAny(s)
			if s.Err() != nil {
				return
			}
			x.Data = v
		case "correlation_ids", "correlationIds":
			s.AddField("correlation_ids")
			if s.ReadNil() {
				x.CorrelationIds = nil
				return
			}
			x.CorrelationIds = s.ReadStringArray()
		case "origin":
			s.AddField("origin")
			x.Origin = s.ReadString()
		case "context":
			s.AddField("context")
			if s.ReadNil() {
				x.Context = nil
				return
			}
			x.Context = make(map[string][]byte)
			s.ReadStringMap(func(key string) {
				x.Context[key] = s.ReadBytes()
			})
		case "visibility":
			if s.ReadNil() {
				x.Visibility = nil
				return
			}
			x.Visibility = &Rights{}
			x.Visibility.UnmarshalProtoJSON(s.WithField("visibility", true))
		case "authentication":
			s.AddField("authentication")
			if s.ReadNil() {
				x.Authentication = nil
				return
			}
			// NOTE: Event_Authentication does not seem to implement UnmarshalProtoJSON.
			var v Event_Authentication
			golang.UnmarshalMessage(s, &v)
			x.Authentication = &v
		case "remote_ip", "remoteIp":
			s.AddField("remote_ip")
			x.RemoteIp = s.ReadString()
		case "user_agent", "userAgent":
			s.AddField("user_agent")
			x.UserAgent = s.ReadString()
		case "unique_id", "uniqueId":
			s.AddField("unique_id")
			x.UniqueId = s.ReadString()
		}
	})
}

// UnmarshalJSON unmarshals the Event from JSON.
func (x *Event) UnmarshalJSON(b []byte) error {
	return jsonplugin.DefaultUnmarshalerConfig.Unmarshal(b, x)
}

// MarshalProtoJSON marshals the StreamEventsRequest message to JSON.
func (x *StreamEventsRequest) MarshalProtoJSON(s *jsonplugin.MarshalState) {
	if x == nil {
		s.WriteNil()
		return
	}
	s.WriteObjectStart()
	var wroteField bool
	if len(x.Identifiers) > 0 || s.HasField("identifiers") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("identifiers")
		s.WriteArrayStart()
		var wroteElement bool
		for _, element := range x.Identifiers {
			s.WriteMoreIf(&wroteElement)
			element.MarshalProtoJSON(s.WithField("identifiers"))
		}
		s.WriteArrayEnd()
	}
	if x.Tail != 0 || s.HasField("tail") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("tail")
		s.WriteUint32(x.Tail)
	}
	if x.After != nil || s.HasField("after") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("after")
		if x.After == nil {
			s.WriteNil()
		} else {
			golang.MarshalTimestamp(s, x.After)
		}
	}
	if len(x.Names) > 0 || s.HasField("names") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("names")
		s.WriteStringArray(x.Names)
	}
	s.WriteObjectEnd()
}

// MarshalJSON marshals the StreamEventsRequest to JSON.
func (x *StreamEventsRequest) MarshalJSON() ([]byte, error) {
	return jsonplugin.DefaultMarshalerConfig.Marshal(x)
}

// UnmarshalProtoJSON unmarshals the StreamEventsRequest message from JSON.
func (x *StreamEventsRequest) UnmarshalProtoJSON(s *jsonplugin.UnmarshalState) {
	if s.ReadNil() {
		return
	}
	s.ReadObject(func(key string) {
		switch key {
		default:
			s.ReadAny() // ignore unknown field
		case "identifiers":
			s.AddField("identifiers")
			if s.ReadNil() {
				x.Identifiers = nil
				return
			}
			s.ReadArray(func() {
				if s.ReadNil() {
					x.Identifiers = append(x.Identifiers, nil)
					return
				}
				v := &EntityIdentifiers{}
				v.UnmarshalProtoJSON(s.WithField("identifiers", false))
				if s.Err() != nil {
					return
				}
				x.Identifiers = append(x.Identifiers, v)
			})
		case "tail":
			s.AddField("tail")
			x.Tail = s.ReadUint32()
		case "after":
			s.AddField("after")
			if s.ReadNil() {
				x.After = nil
				return
			}
			v := golang.UnmarshalTimestamp(s)
			if s.Err() != nil {
				return
			}
			x.After = v
		case "names":
			s.AddField("names")
			if s.ReadNil() {
				x.Names = nil
				return
			}
			x.Names = s.ReadStringArray()
		}
	})
}

// UnmarshalJSON unmarshals the StreamEventsRequest from JSON.
func (x *StreamEventsRequest) UnmarshalJSON(b []byte) error {
	return jsonplugin.DefaultUnmarshalerConfig.Unmarshal(b, x)
}

// MarshalProtoJSON marshals the FindRelatedEventsResponse message to JSON.
func (x *FindRelatedEventsResponse) MarshalProtoJSON(s *jsonplugin.MarshalState) {
	if x == nil {
		s.WriteNil()
		return
	}
	s.WriteObjectStart()
	var wroteField bool
	if len(x.Events) > 0 || s.HasField("events") {
		s.WriteMoreIf(&wroteField)
		s.WriteObjectField("events")
		s.WriteArrayStart()
		var wroteElement bool
		for _, element := range x.Events {
			s.WriteMoreIf(&wroteElement)
			element.MarshalProtoJSON(s.WithField("events"))
		}
		s.WriteArrayEnd()
	}
	s.WriteObjectEnd()
}

// MarshalJSON marshals the FindRelatedEventsResponse to JSON.
func (x *FindRelatedEventsResponse) MarshalJSON() ([]byte, error) {
	return jsonplugin.DefaultMarshalerConfig.Marshal(x)
}

// UnmarshalProtoJSON unmarshals the FindRelatedEventsResponse message from JSON.
func (x *FindRelatedEventsResponse) UnmarshalProtoJSON(s *jsonplugin.UnmarshalState) {
	if s.ReadNil() {
		return
	}
	s.ReadObject(func(key string) {
		switch key {
		default:
			s.ReadAny() // ignore unknown field
		case "events":
			s.AddField("events")
			if s.ReadNil() {
				x.Events = nil
				return
			}
			s.ReadArray(func() {
				if s.ReadNil() {
					x.Events = append(x.Events, nil)
					return
				}
				v := &Event{}
				v.UnmarshalProtoJSON(s.WithField("events", false))
				if s.Err() != nil {
					return
				}
				x.Events = append(x.Events, v)
			})
		}
	})
}

// UnmarshalJSON unmarshals the FindRelatedEventsResponse from JSON.
func (x *FindRelatedEventsResponse) UnmarshalJSON(b []byte) error {
	return jsonplugin.DefaultUnmarshalerConfig.Unmarshal(b, x)
}
