package handlers

import (
	"context"
	"database/sql"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/spirit-in-physics/services/grpc/gen/proto/participant/v1"
	"github.com/spirit-in-physics/services/grpc/internal/db"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// ParticipantHandler handles participant service requests
type ParticipantHandler struct {
	queries *db.Queries
}

// NewParticipantHandler creates a new ParticipantHandler
func NewParticipantHandler(queries *db.Queries) *ParticipantHandler {
	return &ParticipantHandler{
		queries: queries,
	}
}

// GetParticipants returns all participants
func (h *ParticipantHandler) GetParticipants(
	ctx context.Context,
	req *connect.Request[participantv1.GetParticipantsRequest],
) (*connect.Response[participantv1.GetParticipantsResponse], error) {
	var isPublic *bool
	if req.Msg.IsPublic != nil {
		isPublic = req.Msg.IsPublic
	}

	var participants []db.Participant
	var err error
	if isPublic != nil {
		participants, err = h.queries.GetParticipants(ctx, *isPublic)
	} else {
		// Get all participants (both public and private)
		// This requires a different query or we pass nil
		participants, err = h.queries.GetParticipants(ctx, true) // Default to public for now
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	resp := &participantv1.GetParticipantsResponse{
		Participants: make([]*participantv1.Participant, 0, len(participants)),
	}

	for _, p := range participants {
		resp.Participants = append(resp.Participants, &participantv1.Participant{
			Id:         p.ID.String(),
			Age:        toInt32Ptr(p.Age),
			Gender:     toStringPtr(p.Gender),
			Handedness: toStringPtr(p.Handedness),
			IsPublic:   p.IsPublic,
			CreatedAt:  timestamppb.New(p.CreatedAt),
			UpdatedAt:  timestamppb.New(p.UpdatedAt),
		})
	}

	return connect.NewResponse(resp), nil
}

// GetParticipant returns a participant by ID
func (h *ParticipantHandler) GetParticipant(
	ctx context.Context,
	req *connect.Request[participantv1.GetParticipantRequest],
) (*connect.Response[participantv1.GetParticipantResponse], error) {
	participantID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	participant, err := h.queries.GetParticipant(ctx, participantID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	resp := &participantv1.GetParticipantResponse{
		Participant: &participantv1.Participant{
			Id:         participant.ID.String(),
			Age:        toInt32Ptr(participant.Age),
			Gender:     toStringPtr(participant.Gender),
			Handedness: toStringPtr(participant.Handedness),
			IsPublic:   participant.IsPublic,
			CreatedAt:  timestamppb.New(participant.CreatedAt),
			UpdatedAt:  timestamppb.New(participant.UpdatedAt),
		},
	}

	return connect.NewResponse(resp), nil
}

// CreateParticipant creates a new participant
func (h *ParticipantHandler) CreateParticipant(
	ctx context.Context,
	req *connect.Request[participantv1.CreateParticipantRequest],
) (*connect.Response[participantv1.CreateParticipantResponse], error) {
	participantID := uuid.New()
	if req.Msg.Id != nil && *req.Msg.Id != "" {
		var err error
		participantID, err = uuid.Parse(*req.Msg.Id)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
	}

	isPublic := true
	if req.Msg.IsPublic != nil {
		isPublic = *req.Msg.IsPublic
	}

	// Convert protobuf Timestamp to time.Time
	agreedAt := req.Msg.AgreedAt.AsTime()
	now := agreedAt
	if now.IsZero() {
		now = time.Now()
	}

	participant, err := h.queries.CreateParticipant(ctx, db.CreateParticipantParams{
		ID:        participantID,
		IsPublic:  isPublic,
		CreatedAt: now,
		UpdatedAt: now,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	resp := &participantv1.CreateParticipantResponse{
		Participant: &participantv1.Participant{
			Id:         participant.ID.String(),
			Age:        toInt32Ptr(participant.Age),
			Gender:     toStringPtr(participant.Gender),
			Handedness: toStringPtr(participant.Handedness),
			IsPublic:   participant.IsPublic,
			CreatedAt:  timestamppb.New(participant.CreatedAt),
			UpdatedAt:  timestamppb.New(participant.UpdatedAt),
		},
	}

	return connect.NewResponse(resp), nil
}

// GetStimulusWords returns all stimulus words
func (h *ParticipantHandler) GetStimulusWords(
	ctx context.Context,
	req *connect.Request[participantv1.GetStimulusWordsRequest],
) (*connect.Response[participantv1.GetStimulusWordsResponse], error) {
	words, err := h.queries.GetStimulusWords(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	resp := &participantv1.GetStimulusWordsResponse{
		Words: make([]*participantv1.StimulusWord, 0, len(words)),
	}

	for _, w := range words {
		resp.Words = append(resp.Words, &participantv1.StimulusWord{
			Id:            int32(w.ID),
			Japanese:      w.Japanese,
			English:       w.English,
			Pronunciation: w.Pronunciation,
		})
	}

	return connect.NewResponse(resp), nil
}

// GetStimulusWord returns a stimulus word by ID
func (h *ParticipantHandler) GetStimulusWord(
	ctx context.Context,
	req *connect.Request[participantv1.GetStimulusWordRequest],
) (*connect.Response[participantv1.GetStimulusWordResponse], error) {
	word, err := h.queries.GetStimulusWord(ctx, req.Msg.Id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	resp := &participantv1.GetStimulusWordResponse{
		Word: &participantv1.StimulusWord{
			Id:            int32(word.ID),
			Japanese:      word.Japanese,
			English:       word.English,
			Pronunciation: word.Pronunciation,
		},
	}

	return connect.NewResponse(resp), nil
}

// Helper functions
func toInt32Ptr(i sql.NullInt32) *int32 {
	if i.Valid {
		return &i.Int32
	}
	return nil
}

func toStringPtr(s sql.NullString) *string {
	if s.Valid {
		return &s.String
	}
	return nil
}
