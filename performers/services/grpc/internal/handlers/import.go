package handlers

import (
	"context"
	"encoding/json"
	"log"

	"connectrpc.com/connect"
	dapr "github.com/dapr/go-sdk/client"
	"github.com/google/uuid"
	importv1 "github.com/spirit-in-physics/services/grpc/gen/proto/import/v1"
	daprActivities "github.com/spirit-in-physics/services/grpc/internal/dapr/activities"
	daprWorkflows "github.com/spirit-in-physics/services/grpc/internal/dapr/workflows"
	"github.com/spirit-in-physics/services/grpc/internal/db"
)

type ImportHandler struct {
	queries    *db.Queries
	daprClient dapr.Client
}

func NewImportHandler(queries *db.Queries, daprClient dapr.Client) *ImportHandler {
	return &ImportHandler{
		queries:    queries,
		daprClient: daprClient,
	}
}

func (h *ImportHandler) ImportParticipants(
	ctx context.Context,
	req *connect.Request[importv1.ImportParticipantsRequest],
) (*connect.Response[importv1.ImportParticipantsResponse], error) {
	// Try Dapr workflow first if client initialized
	if h.daprClient != nil {
		_, err := h.daprClient.StartWorkflowBeta1(ctx, &dapr.StartWorkflowRequest{
			InstanceID:        "import-participants-" + uuid.New().String(),
			WorkflowComponent: "dapr",
			WorkflowName:      "ImportParticipantsWorkflow",
		})
		if err == nil {
			// For now, we don't wait for completion - just return success
			// In production, you might want to wait or return the instance ID
			return connect.NewResponse(&importv1.ImportParticipantsResponse{
				Success:   true,
				Total:     0,
				Processed: 0,
			}), nil
		}
		log.Printf("Dapr workflow failed, falling back to direct import: %v", err)
	}

	// Fallback to direct import
	a := &daprActivities.ImportActivities{Queries: h.queries}
	count, err := a.ImportParticipantsActivity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&importv1.ImportParticipantsResponse{
		Success:   true,
		Total:     int32(count),
		Processed: int32(count),
	}), nil
}

func (h *ImportHandler) ImportSessions(
	ctx context.Context,
	req *connect.Request[importv1.ImportSessionsRequest],
) (*connect.Response[importv1.ImportSessionsResponse], error) {
	return connect.NewResponse(&importv1.ImportSessionsResponse{
		Success:   true,
		Total:     0,
		Processed: 0,
	}), nil
}

func (h *ImportHandler) ImportEmotions(
	ctx context.Context,
	req *connect.Request[importv1.ImportEmotionsRequest],
) (*connect.Response[importv1.ImportEmotionsResponse], error) {
	// We'll import emotions for all participants found in the dataset
	participants, err := h.queries.GetParticipants(ctx, true)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	totalProcessed := 0
	a := &daprActivities.ImportActivities{Queries: h.queries}
	for _, p := range participants {
		participantID := p.ID

		log.Printf("Starting emotion import for %s", participantID)

		// Try Dapr workflow if available
		if h.daprClient != nil {
			input := daprWorkflows.ImportEmotionsInput{ParticipantID: participantID}
			inputBytes, _ := json.Marshal(input)
			_, err := h.daprClient.StartWorkflowBeta1(ctx, &dapr.StartWorkflowRequest{
				InstanceID:        "import-emotions-" + participantID + "-" + uuid.New().String(),
				WorkflowComponent: "dapr",
				WorkflowName:      "ImportEmotionsWorkflow",
				Input:             inputBytes,
			})
			if err == nil {
				continue // Workflow started successfully
			}
			log.Printf("Dapr emotion import workflow failed for %s, falling back to direct: %v", participantID, err)
		}

		// Direct fallback
		count, err := a.ImportEmotionsActivity(ctx, daprWorkflows.ImportEmotionsInput{ParticipantID: participantID})
		if err != nil {
			log.Printf("Failed to import emotions for %s: %v", participantID, err)
			continue
		}
		totalProcessed += count
	}

	return connect.NewResponse(&importv1.ImportEmotionsResponse{
		Success:   true,
		Total:     int32(totalProcessed),
		Processed: int32(totalProcessed),
	}), nil
}

func (h *ImportHandler) ImportTimeline(
	ctx context.Context,
	req *connect.Request[importv1.ImportTimelineRequest],
) (*connect.Response[importv1.ImportTimelineResponse], error) {
	return connect.NewResponse(&importv1.ImportTimelineResponse{
		Success:   true,
		Total:     0,
		Processed: 0,
	}), nil
}
