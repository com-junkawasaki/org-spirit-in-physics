package handlers_test

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	preferencev1 "github.com/spirit-in-physics/services/grpc/gen/proto/preference/v1"
	"github.com/spirit-in-physics/services/grpc/internal/handlers"
)

func TestPreferenceHandler(t *testing.T) {
	handler := handlers.NewPreferenceHandler()

	t.Run("Update and Get Preference", func(t *testing.T) {
		userID := "user-123"
		ctx := context.Background()

		// Update
		updateReq := connect.NewRequest(&preferencev1.UpdatePreferenceRequest{
			UserId:   userID,
			Theme:    stringPtr("dark"),
			Language: stringPtr("ja"),
		})
		updateRes, err := handler.UpdatePreference(ctx, updateReq)
		require.NoError(t, err)
		assert.Equal(t, userID, updateRes.Msg.Preference.UserId)
		assert.Equal(t, "dark", updateRes.Msg.Preference.Theme)
		assert.Equal(t, "ja", updateRes.Msg.Preference.Language)

		// Get
		getReq := connect.NewRequest(&preferencev1.GetPreferenceRequest{
			UserId: userID,
		})
		getRes, err := handler.GetPreference(ctx, getReq)
		require.NoError(t, err)
		assert.Equal(t, userID, getRes.Msg.Preference.UserId)
		assert.Equal(t, "dark", getRes.Msg.Preference.Theme)
		assert.Equal(t, "ja", getRes.Msg.Preference.Language)
	})
}

func stringPtr(s string) *string {
	return &s
}
