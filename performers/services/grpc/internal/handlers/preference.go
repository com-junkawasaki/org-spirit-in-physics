package handlers

import (
	"context"
	"sync"

	"connectrpc.com/connect"
	preferencev1 "github.com/spirit-in-physics/services/grpc/gen/proto/preference/v1"
)

type PreferenceHandler struct {
	mu          sync.RWMutex
	preferences map[string]*preferencev1.Preference
}

func NewPreferenceHandler() *PreferenceHandler {
	return &PreferenceHandler{
		preferences: make(map[string]*preferencev1.Preference),
	}
}

func (h *PreferenceHandler) GetPreference(
	ctx context.Context,
	req *connect.Request[preferencev1.GetPreferenceRequest],
) (*connect.Response[preferencev1.GetPreferenceResponse], error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	pref, ok := h.preferences[req.Msg.UserId]
	if !ok {
		// Return default preference if not found
		pref = &preferencev1.Preference{
			UserId:   req.Msg.UserId,
			Theme:    "system",
			Language: "en",
		}
	}

	return connect.NewResponse(&preferencev1.GetPreferenceResponse{
		Preference: pref,
	}), nil
}

func (h *PreferenceHandler) UpdatePreference(
	ctx context.Context,
	req *connect.Request[preferencev1.UpdatePreferenceRequest],
) (*connect.Response[preferencev1.UpdatePreferenceResponse], error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	pref, ok := h.preferences[req.Msg.UserId]
	if !ok {
		pref = &preferencev1.Preference{
			UserId:   req.Msg.UserId,
			Theme:    "system",
			Language: "en",
		}
	}

	if req.Msg.Theme != nil {
		pref.Theme = *req.Msg.Theme
	}
	if req.Msg.Language != nil {
		pref.Language = *req.Msg.Language
	}

	h.preferences[req.Msg.UserId] = pref

	return connect.NewResponse(&preferencev1.UpdatePreferenceResponse{
		Preference: pref,
	}), nil
}
