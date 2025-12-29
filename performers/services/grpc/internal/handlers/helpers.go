package handlers

import (
	"context"
    "github.com/jackc/pgx/v5/pgtype"
)

// IsAuthenticated checks if the request is authenticated
func IsAuthenticated(ctx context.Context) bool {
	_, ok := ctx.Value("user_id").(string)
	return ok
}

func toInt32Ptr(i pgtype.Int4) *int32 {
	if i.Valid {
		val := i.Int32
		return &val
	}
	return nil
}

func toStringPtr(s pgtype.Text) *string {
	if s.Valid {
		val := s.String
		return &val
	}
	return nil
}

func toBoolPtr(b pgtype.Bool) *bool {
	if b.Valid {
		val := b.Bool
		return &val
	}
	return nil
}

func toInt64PtrFromOptional(i pgtype.Int8) *int64 {
	if i.Valid {
		val := i.Int64
		return &val
	}
	return nil
}

func getStringValue(s *string) string {
	if s != nil {
		return *s
	}
	return ""
}
