package handlers

import (
	"context"
	"log"
	"github.com/google/uuid"
	"github.com/spirit-in-physics/services/grpc/gen/proto/import/v1"
	"github.com/spirit-in-physics/services/grpc/internal/activities"
	"github.com/spirit-in-physics/services/grpc/internal/db"
	"github.com/spirit-in-physics/services/grpc/internal/workflows"
	"connectrpc.com/connect"
	"go.temporal.io/sdk/client"
)

type ImportHandler struct {
	queries        *db.Queries
	temporalClient client.Client
}

func NewImportHandler(queries *db.Queries, temporalClient client.Client) *ImportHandler {
	return &ImportHandler{
		queries:        queries,
		temporalClient: temporalClient,
	}
}

func (h *ImportHandler) ImportParticipants(
	ctx context.Context,
	req *connect.Request[importv1.ImportParticipantsRequest],
) (*connect.Response[importv1.ImportParticipantsResponse], error) {
	// Try Temporal first if client initialized
	if h.temporalClient != nil {
		workflowOptions := client.StartWorkflowOptions{
			ID:        "import-participants-" + uuid.New().String(),
			TaskQueue: "onboarding-queue",
		}

		run, err := h.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.ImportParticipantsWorkflow)
		if err == nil {
			var count int
			err = run.Get(ctx, &count)
			if err == nil {
				return connect.NewResponse(&importv1.ImportParticipantsResponse{
					Success:   true,
					Total:     int32(count),
					Processed: int32(count),
				}), nil
			}
		}
		log.Printf("Temporal import failed or timed out, falling back to direct import: %v", err)
	}

	// Fallback to direct import
	a := &activities.ImportActivities{Queries: h.queries}
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
		Success: true,
		Total: 0,
		Processed: 0,
	}), nil
}

func (h *ImportHandler) ImportEmotions(
	ctx context.Context,
	req *connect.Request[importv1.ImportEmotionsRequest],
) (*connect.Response[importv1.ImportEmotionsResponse], error) {
	// We'll import emotions for all participants found in the dataset
	participants, err := h.queries.GetParticipants(ctx, false)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	totalProcessed := 0
	a := &activities.ImportActivities{Queries: h.queries}
	for _, p := range participants {
		uid, _ := uuid.FromBytes(p.ID.Bytes[:])
		participantID := uid.String()
		
		log.Printf("Starting emotion import for %s", participantID)
		
		// Try Temporal if available
		if h.temporalClient != nil {
			workflowOptions := client.StartWorkflowOptions{
				ID:        "import-emotions-" + participantID + "-" + uuid.New().String(),
				TaskQueue: "onboarding-queue",
			}

			run, err := h.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.ImportEmotionsWorkflow, participantID)
			if err == nil {
				var count int
				err = run.Get(ctx, &count)
				if err == nil {
					totalProcessed += count
					continue
				}
			}
			log.Printf("Temporal emotion import failed for %s, falling back to direct: %v", participantID, err)
		}

		// Direct fallback
		count, err := a.ImportEmotionsActivity(ctx, participantID)
		if err != nil {
			log.Printf("Failed to import emotions for %s: %v", participantID, err)
			continue
		}
		totalProcessed += count
	}

	return connect.NewResponse(&importv1.ImportEmotionsResponse{
		Success: true,
		Total: int32(totalProcessed),
		Processed: int32(totalProcessed),
	}), nil
}

func (h *ImportHandler) ImportTimeline(
	ctx context.Context,
	req *connect.Request[importv1.ImportTimelineRequest],
) (*connect.Response[importv1.ImportTimelineResponse], error) {
	return connect.NewResponse(&importv1.ImportTimelineResponse{
		Success: true,
		Total: 0,
		Processed: 0,
	}), nil
}
