// Code generated by protoc-gen-fieldmask. DO NOT EDIT.

package ttnpb

import (
	"bytes"
	"errors"
	"fmt"
	"net"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gogo/protobuf/types"
)

// ensure the imports are used
var (
	_ = bytes.MinRead
	_ = errors.New("")
	_ = fmt.Print
	_ = utf8.UTFMax
	_ = (*regexp.Regexp)(nil)
	_ = (*strings.Reader)(nil)
	_ = net.IPv4len
	_ = time.Duration(0)
	_ = (*url.URL)(nil)
	_ = (*mail.Address)(nil)
	_ = types.DynamicAny{}
)

// define the regex for a UUID once up-front
var _contact_info_uuidPattern = regexp.MustCompile("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")

// ValidateFields checks the field values on ContactInfo with the rules defined
// in the proto definition for this message. If any rules are violated, an
// error is returned.
func (m *ContactInfo) ValidateFields(paths ...string) error {
	if m == nil {
		return nil
	}

	if len(paths) == 0 {
		paths = ContactInfoFieldPathsNested
	}

	for name, subs := range _processPaths(append(paths[:0:0], paths...)) {
		_ = subs
		switch name {
		case "contact_type":

			if _, ok := ContactType_name[int32(m.GetContactType())]; !ok {
				return ContactInfoValidationError{
					field:  "contact_type",
					reason: "value must be one of the defined enum values",
				}
			}

		case "contact_method":

			if _, ok := ContactMethod_name[int32(m.GetContactMethod())]; !ok {
				return ContactInfoValidationError{
					field:  "contact_method",
					reason: "value must be one of the defined enum values",
				}
			}

		case "value":

			if utf8.RuneCountInString(m.GetValue()) > 256 {
				return ContactInfoValidationError{
					field:  "value",
					reason: "value length must be at most 256 runes",
				}
			}

		case "public":
			// no validation rules for Public
		case "validated_at":

			if v, ok := interface{}(m.GetValidatedAt()).(interface{ ValidateFields(...string) error }); ok {
				if err := v.ValidateFields(subs...); err != nil {
					return ContactInfoValidationError{
						field:  "validated_at",
						reason: "embedded message failed validation",
						cause:  err,
					}
				}
			}

		default:
			return ContactInfoValidationError{
				field:  name,
				reason: "invalid field path",
			}
		}
	}
	return nil
}

// ContactInfoValidationError is the validation error returned by
// ContactInfo.ValidateFields if the designated constraints aren't met.
type ContactInfoValidationError struct {
	field  string
	reason string
	cause  error
	key    bool
}

// Field function returns field value.
func (e ContactInfoValidationError) Field() string { return e.field }

// Reason function returns reason value.
func (e ContactInfoValidationError) Reason() string { return e.reason }

// Cause function returns cause value.
func (e ContactInfoValidationError) Cause() error { return e.cause }

// Key function returns key value.
func (e ContactInfoValidationError) Key() bool { return e.key }

// ErrorName returns error name.
func (e ContactInfoValidationError) ErrorName() string { return "ContactInfoValidationError" }

// Error satisfies the builtin error interface
func (e ContactInfoValidationError) Error() string {
	cause := ""
	if e.cause != nil {
		cause = fmt.Sprintf(" | caused by: %v", e.cause)
	}

	key := ""
	if e.key {
		key = "key for "
	}

	return fmt.Sprintf(
		"invalid %sContactInfo.%s: %s%s",
		key,
		e.field,
		e.reason,
		cause)
}

var _ error = ContactInfoValidationError{}

var _ interface {
	Field() string
	Reason() string
	Key() bool
	Cause() error
	ErrorName() string
} = ContactInfoValidationError{}

// ValidateFields checks the field values on ContactInfoValidation with the
// rules defined in the proto definition for this message. If any rules are
// violated, an error is returned.
func (m *ContactInfoValidation) ValidateFields(paths ...string) error {
	if m == nil {
		return nil
	}

	if len(paths) == 0 {
		paths = ContactInfoValidationFieldPathsNested
	}

	for name, subs := range _processPaths(append(paths[:0:0], paths...)) {
		_ = subs
		switch name {
		case "id":

			if l := utf8.RuneCountInString(m.GetId()); l < 1 || l > 64 {
				return ContactInfoValidationValidationError{
					field:  "id",
					reason: "value length must be between 1 and 64 runes, inclusive",
				}
			}

		case "token":

			if l := utf8.RuneCountInString(m.GetToken()); l < 1 || l > 64 {
				return ContactInfoValidationValidationError{
					field:  "token",
					reason: "value length must be between 1 and 64 runes, inclusive",
				}
			}

		case "entity":

			if v, ok := interface{}(m.GetEntity()).(interface{ ValidateFields(...string) error }); ok {
				if err := v.ValidateFields(subs...); err != nil {
					return ContactInfoValidationValidationError{
						field:  "entity",
						reason: "embedded message failed validation",
						cause:  err,
					}
				}
			}

		case "contact_info":

			for idx, item := range m.GetContactInfo() {
				_, _ = idx, item

				if v, ok := interface{}(item).(interface{ ValidateFields(...string) error }); ok {
					if err := v.ValidateFields(subs...); err != nil {
						return ContactInfoValidationValidationError{
							field:  fmt.Sprintf("contact_info[%v]", idx),
							reason: "embedded message failed validation",
							cause:  err,
						}
					}
				}

			}

		case "created_at":

			if v, ok := interface{}(m.GetCreatedAt()).(interface{ ValidateFields(...string) error }); ok {
				if err := v.ValidateFields(subs...); err != nil {
					return ContactInfoValidationValidationError{
						field:  "created_at",
						reason: "embedded message failed validation",
						cause:  err,
					}
				}
			}

		case "expires_at":

			if v, ok := interface{}(m.GetExpiresAt()).(interface{ ValidateFields(...string) error }); ok {
				if err := v.ValidateFields(subs...); err != nil {
					return ContactInfoValidationValidationError{
						field:  "expires_at",
						reason: "embedded message failed validation",
						cause:  err,
					}
				}
			}

		default:
			return ContactInfoValidationValidationError{
				field:  name,
				reason: "invalid field path",
			}
		}
	}
	return nil
}

// ContactInfoValidationValidationError is the validation error returned by
// ContactInfoValidation.ValidateFields if the designated constraints aren't met.
type ContactInfoValidationValidationError struct {
	field  string
	reason string
	cause  error
	key    bool
}

// Field function returns field value.
func (e ContactInfoValidationValidationError) Field() string { return e.field }

// Reason function returns reason value.
func (e ContactInfoValidationValidationError) Reason() string { return e.reason }

// Cause function returns cause value.
func (e ContactInfoValidationValidationError) Cause() error { return e.cause }

// Key function returns key value.
func (e ContactInfoValidationValidationError) Key() bool { return e.key }

// ErrorName returns error name.
func (e ContactInfoValidationValidationError) ErrorName() string {
	return "ContactInfoValidationValidationError"
}

// Error satisfies the builtin error interface
func (e ContactInfoValidationValidationError) Error() string {
	cause := ""
	if e.cause != nil {
		cause = fmt.Sprintf(" | caused by: %v", e.cause)
	}

	key := ""
	if e.key {
		key = "key for "
	}

	return fmt.Sprintf(
		"invalid %sContactInfoValidation.%s: %s%s",
		key,
		e.field,
		e.reason,
		cause)
}

var _ error = ContactInfoValidationValidationError{}

var _ interface {
	Field() string
	Reason() string
	Key() bool
	Cause() error
	ErrorName() string
} = ContactInfoValidationValidationError{}
