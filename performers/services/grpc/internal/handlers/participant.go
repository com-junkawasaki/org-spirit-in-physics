package handlers

import (
	"context"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/spirit-in-physics/services/grpc/gen/proto/participant/v1"
	"github.com/spirit-in-physics/services/grpc/internal/db"
	"github.com/spirit-in-physics/services/grpc/internal/workflows"
	"go.temporal.io/sdk/client"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// ParticipantHandler handles participant service requests
type ParticipantHandler struct {
	queries        *db.Queries
	temporalClient client.Client
}

// NewParticipantHandler creates a new ParticipantHandler
func NewParticipantHandler(queries *db.Queries, temporalClient client.Client) *ParticipantHandler {
	return &ParticipantHandler{
		queries:        queries,
		temporalClient: temporalClient,
	}
}

// GetParticipants returns all participants
func (h *ParticipantHandler) GetParticipants(
	ctx context.Context,
	req *connect.Request[participantv1.GetParticipantsRequest],
) (*connect.Response[participantv1.GetParticipantsResponse], error) {
	isPublic := true
	if req.Msg.IsPublic != nil {
		isPublic = *req.Msg.IsPublic
	}

	participants, err := h.queries.GetParticipants(ctx, isPublic)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	resp := &participantv1.GetParticipantsResponse{
		Participants: make([]*participantv1.Participant, 0, len(participants)),
	}

	for _, p := range participants {
		uid, _ := uuid.FromBytes(p.ID.Bytes[:])
		resp.Participants = append(resp.Participants, &participantv1.Participant{
			Id:             uid.String(),
			Age:            toInt32Ptr(p.Age),
			Gender:         toStringPtr(p.Gender),
			Handedness:     toStringPtr(p.Handedness),
			Email:          toStringPtr(p.Email),
			AgeGroup:       toStringPtr(p.AgeGroup),
			Ethnicity:      toStringPtr(p.Ethnicity),
			IncomeRange:    toStringPtr(p.IncomeRange),
			MedicalHistory: p.MedicalHistory,
			IsPublic:       p.IsPublic.Bool,
			CreatedAt:      timestamppb.New(p.CreatedAt.Time),
			UpdatedAt:      timestamppb.New(p.UpdatedAt.Time),
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

	pgUUID := pgtype.UUID{Bytes: participantID, Valid: true}
	participant, err := h.queries.GetParticipant(ctx, pgUUID)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	uid, _ := uuid.FromBytes(participant.ID.Bytes[:])
	resp := &participantv1.GetParticipantResponse{
		Participant: &participantv1.Participant{
			Id:             uid.String(),
			Age:            toInt32Ptr(participant.Age),
			Gender:         toStringPtr(participant.Gender),
			Handedness:     toStringPtr(participant.Handedness),
			Email:          toStringPtr(participant.Email),
			AgeGroup:       toStringPtr(participant.AgeGroup),
			Ethnicity:      toStringPtr(participant.Ethnicity),
			IncomeRange:    toStringPtr(participant.IncomeRange),
			MedicalHistory: participant.MedicalHistory,
			IsPublic:       participant.IsPublic.Bool,
			CreatedAt:      timestamppb.New(participant.CreatedAt.Time),
			UpdatedAt:      timestamppb.New(participant.UpdatedAt.Time),
		},
	}

	return connect.NewResponse(resp), nil
}

// GetParticipantByEmail returns a participant by email
func (h *ParticipantHandler) GetParticipantByEmail(
	ctx context.Context,
	req *connect.Request[participantv1.GetParticipantByEmailRequest],
) (*connect.Response[participantv1.GetParticipantByEmailResponse], error) {
	participant, err := h.queries.GetParticipantByEmail(ctx, pgtype.Text{String: req.Msg.Email, Valid: true})
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	uid, _ := uuid.FromBytes(participant.ID.Bytes[:])
	resp := &participantv1.GetParticipantByEmailResponse{
		Participant: &participantv1.Participant{
			Id:             uid.String(),
			Age:            toInt32Ptr(participant.Age),
			Gender:         toStringPtr(participant.Gender),
			Handedness:     toStringPtr(participant.Handedness),
			Email:          toStringPtr(participant.Email),
			AgeGroup:       toStringPtr(participant.AgeGroup),
			Ethnicity:      toStringPtr(participant.Ethnicity),
			IncomeRange:    toStringPtr(participant.IncomeRange),
			MedicalHistory: participant.MedicalHistory,
			IsPublic:       participant.IsPublic.Bool,
			CreatedAt:      timestamppb.New(participant.CreatedAt.Time),
			UpdatedAt:      timestamppb.New(participant.UpdatedAt.Time),
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

	now := time.Now()
	if req.Msg.AgreedAt != nil {
		now = req.Msg.AgreedAt.AsTime()
	}

	pgUUID := pgtype.UUID{Bytes: participantID, Valid: true}
	participant, err := h.queries.CreateParticipant(ctx, db.CreateParticipantParams{
		ID:             pgUUID,
		Email:          pgtype.Text{String: req.Msg.Email, Valid: true},
		AgeGroup:       pgtype.Text{String: getStringValue(req.Msg.AgeGroup), Valid: req.Msg.AgeGroup != nil},
		Ethnicity:      pgtype.Text{String: getStringValue(req.Msg.Ethnicity), Valid: req.Msg.Ethnicity != nil},
		IncomeRange:    pgtype.Text{String: getStringValue(req.Msg.IncomeRange), Valid: req.Msg.IncomeRange != nil},
		MedicalHistory: req.Msg.MedicalHistory,
		IsPublic:       pgtype.Bool{Bool: isPublic, Valid: true},
		CreatedAt:      pgtype.Timestamptz{Time: now, Valid: true},
		UpdatedAt:      pgtype.Timestamptz{Time: now, Valid: true},
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Trigger Temporal Workflow
	if h.temporalClient != nil {
		workflowOptions := client.StartWorkflowOptions{
			ID:        "onboarding-" + participantID.String(),
			TaskQueue: "onboarding-queue",
		}
		_, err := h.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.OnboardingWorkflow, req.Msg.Email)
		if err != nil {
			// In production, we might want to handle this better (e.g., retry or log)
			// For now, just log and continue
		}
	}

	uid, _ := uuid.FromBytes(participant.ID.Bytes[:])
	resp := &participantv1.CreateParticipantResponse{
		Participant: &participantv1.Participant{
			Id:             uid.String(),
			Age:            toInt32Ptr(participant.Age),
			Gender:         toStringPtr(participant.Gender),
			Handedness:     toStringPtr(participant.Handedness),
			Email:          toStringPtr(participant.Email),
			AgeGroup:       toStringPtr(participant.AgeGroup),
			Ethnicity:      toStringPtr(participant.Ethnicity),
			IncomeRange:    toStringPtr(participant.IncomeRange),
			MedicalHistory: participant.MedicalHistory,
			IsPublic:       participant.IsPublic.Bool,
			CreatedAt:      timestamppb.New(participant.CreatedAt.Time),
			UpdatedAt:      timestamppb.New(participant.UpdatedAt.Time),
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
		return nil, connect.NewError(connect.CodeNotFound, err)
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
