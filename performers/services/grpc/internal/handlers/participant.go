package handlers

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"connectrpc.com/connect"
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
		resp.Participants = append(resp.Participants, &participantv1.Participant{
			Id:             p.ID,
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
	participant, err := h.queries.GetParticipant(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	resp := &participantv1.GetParticipantResponse{
		Participant: &participantv1.Participant{
			Id:             participant.ID,
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

	resp := &participantv1.GetParticipantByEmailResponse{
		Participant: &participantv1.Participant{
			Id:             participant.ID,
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
	// #region agent log
	{
		log.Printf("AGENT_LOG: CreateParticipant started, id=%s, email=%s", req.Msg.GetId(), req.Msg.Email)
		logFile, _ := os.OpenFile("/Volumes/251214/jun784/spirit-in-physics/.cursor/debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if logFile != nil {
			fmt.Fprintf(logFile, "{\"location\":\"participant.go:133\",\"message\":\"CreateParticipant started\",\"data\":{\"id\":\"%s\",\"email\":\"%s\"},\"timestamp\":%d,\"sessionId\":\"debug-session\",\"hypothesisId\":\"A\"}\n", req.Msg.GetId(), req.Msg.Email, time.Now().UnixMilli())
			logFile.Close()
		}
	}
	// #endregion
	participantID := req.Msg.GetId()
	if participantID == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, connect.NewError(connect.CodeInvalidArgument, nil))
	}

	isPublic := true
	if req.Msg.IsPublic != nil {
		isPublic = *req.Msg.IsPublic
	}

	now := time.Now()
	if req.Msg.AgreedAt != nil {
		now = req.Msg.AgreedAt.AsTime()
	}

	participant, err := h.queries.CreateParticipant(ctx, db.CreateParticipantParams{
		ID:             participantID,
		Email:          pgtype.Text{String: req.Msg.Email, Valid: true},
		AgeGroup:       pgtype.Text{String: getStringValue(req.Msg.AgeGroup), Valid: req.Msg.AgeGroup != nil},
		Ethnicity:      pgtype.Text{String: getStringValue(req.Msg.Ethnicity), Valid: req.Msg.Ethnicity != nil},
		IncomeRange:    pgtype.Text{String: getStringValue(req.Msg.IncomeRange), Valid: req.Msg.IncomeRange != nil},
		MedicalHistory: req.Msg.MedicalHistory,
		IsPublic:       pgtype.Bool{Bool: isPublic, Valid: true},
		Gender:         pgtype.Text{String: getStringValue(req.Msg.Gender), Valid: req.Msg.Gender != nil},
		CreatedAt:      pgtype.Timestamptz{Time: now, Valid: true},
		UpdatedAt:      pgtype.Timestamptz{Time: now, Valid: true},
	})
	if err != nil {
		// #region agent log
		{
			log.Printf("AGENT_LOG: CreateParticipant DB error: %v", err)
			logFile, _ := os.OpenFile("/Volumes/251214/jun784/spirit-in-physics/.cursor/debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if logFile != nil {
				fmt.Fprintf(logFile, "{\"location\":\"participant.go:161\",\"message\":\"CreateParticipant DB error\",\"data\":{\"error\":\"%s\"},\"timestamp\":%d,\"sessionId\":\"debug-session\",\"hypothesisId\":\"A\"}\n", err.Error(), time.Now().UnixMilli())
				logFile.Close()
			}
		}
		// #endregion
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Trigger Temporal Workflow
	if h.temporalClient != nil {
		workflowOptions := client.StartWorkflowOptions{
			ID:        "onboarding-" + participantID,
			TaskQueue: "onboarding-queue",
		}
		_, err := h.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.OnboardingWorkflow, participantID)
		if err != nil {
			// In production, we might want to handle this better (e.g., retry or log)
			// For now, just log and continue
		}
	}

	resp := &participantv1.CreateParticipantResponse{
		Participant: &participantv1.Participant{
			Id:             participant.ID,
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
			French:        toStringPtr(w.French),
			Spanish:       toStringPtr(w.Spanish),
			Russian:       toStringPtr(w.Russian),
			Arabic:        toStringPtr(w.Arabic),
			Chinese:       toStringPtr(w.Chinese),
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
			French:        toStringPtr(word.French),
			Spanish:       toStringPtr(word.Spanish),
			Russian:       toStringPtr(word.Russian),
			Arabic:        toStringPtr(word.Arabic),
			Chinese:       toStringPtr(word.Chinese),
			Pronunciation: word.Pronunciation,
		},
	}

	return connect.NewResponse(resp), nil
}

// StartAssessment starts a new assessment workflow
func (h *ParticipantHandler) StartAssessment(
	ctx context.Context,
	req *connect.Request[participantv1.StartAssessmentRequest],
) (*connect.Response[participantv1.StartAssessmentResponse], error) {
	if h.temporalClient == nil {
		return nil, connect.NewError(connect.CodeInternal, connect.NewError(connect.CodeInternal, nil))
	}

	workflowID := "assessment-" + req.Msg.ParticipantId
	workflowOptions := client.StartWorkflowOptions{
		ID:        workflowID,
		TaskQueue: "visualization-analysis-queue",
	}

	// In Go SDK, when calling a TS workflow, we just use the string name
	run, err := h.temporalClient.ExecuteWorkflow(ctx, workflowOptions, "jungVoiceAssessmentWorkflow", req.Msg.ParticipantId, req.Msg.Email)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Signal demographics
	demographics := map[string]interface{}{
		"ageGroup":       req.Msg.GetAgeGroup(),
		"gender":         req.Msg.GetGender(),
		"ethnicity":      req.Msg.GetEthnicity(),
		"incomeRange":    req.Msg.GetIncomeRange(),
		"medicalHistory": req.Msg.GetMedicalHistory(),
	}
	_ = h.temporalClient.SignalWorkflow(ctx, workflowID, "", "updateConsent", demographics)

	return connect.NewResponse(&participantv1.StartAssessmentResponse{
		WorkflowId: run.GetID(),
		RunId:      run.GetRunID(),
	}), nil
}

// SignalWordResponse signals a response to the workflow
func (h *ParticipantHandler) SignalWordResponse(
	ctx context.Context,
	req *connect.Request[participantv1.SignalWordResponseRequest],
) (*connect.Response[participantv1.SignalWordResponseResponse], error) {
	if h.temporalClient == nil {
		return nil, connect.NewError(connect.CodeInternal, nil)
	}

	workflowID := "assessment-" + req.Msg.ParticipantId
	err := h.temporalClient.SignalWorkflow(ctx, workflowID, "", "recordWordResponse", req.Msg)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&participantv1.SignalWordResponseResponse{Success: true}), nil
}

// SignalStartSession signals start of a session
func (h *ParticipantHandler) SignalStartSession(
	ctx context.Context,
	req *connect.Request[participantv1.SignalStartSessionRequest],
) (*connect.Response[participantv1.SignalStartSessionResponse], error) {
	if h.temporalClient == nil {
		return nil, connect.NewError(connect.CodeInternal, nil)
	}

	workflowID := "assessment-" + req.Msg.ParticipantId
	err := h.temporalClient.SignalWorkflow(ctx, workflowID, "", "startSession", req.Msg.SessionNumber)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&participantv1.SignalStartSessionResponse{Success: true}), nil
}

// SignalArtifact signals an artifact upload
func (h *ParticipantHandler) SignalArtifact(
	ctx context.Context,
	req *connect.Request[participantv1.SignalArtifactRequest],
) (*connect.Response[participantv1.SignalArtifactResponse], error) {
	if h.temporalClient == nil {
		return nil, connect.NewError(connect.CodeInternal, nil)
	}

	workflowID := "assessment-" + req.Msg.ParticipantId
	err := h.temporalClient.SignalWorkflow(ctx, workflowID, "", "updateArtifact", req.Msg)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&participantv1.SignalArtifactResponse{Success: true}), nil
}

// CompleteAssessment signals completion
func (h *ParticipantHandler) CompleteAssessment(
	ctx context.Context,
	req *connect.Request[participantv1.CompleteAssessmentRequest],
) (*connect.Response[participantv1.CompleteAssessmentResponse], error) {
	if h.temporalClient == nil {
		return nil, connect.NewError(connect.CodeInternal, nil)
	}

	workflowID := "assessment-" + req.Msg.ParticipantId
	err := h.temporalClient.SignalWorkflow(ctx, workflowID, "", "completeAssessment", nil)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&participantv1.CompleteAssessmentResponse{Success: true}), nil
}

// GetAssessmentStatus returns the current status
func (h *ParticipantHandler) GetAssessmentStatus(
	ctx context.Context,
	req *connect.Request[participantv1.GetAssessmentStatusRequest],
) (*connect.Response[participantv1.GetAssessmentStatusResponse], error) {
	if h.temporalClient == nil {
		return nil, connect.NewError(connect.CodeInternal, nil)
	}

	workflowID := "assessment-" + req.Msg.ParticipantId
	queryResp, err := h.temporalClient.QueryWorkflow(ctx, workflowID, "", "getStatus")
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var state any
	if err := queryResp.Get(&state); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&participantv1.GetAssessmentStatusResponse{
		Status: "active",
	}), nil
}
