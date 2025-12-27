package handlers

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	"github.com/spirit-in-physics/services/grpc/gen/proto/timeline/v1"
	"github.com/spirit-in-physics/services/grpc/internal/db"
	"github.com/spirit-in-physics/services/grpc/internal/workflows"
	"go.temporal.io/sdk/client"
)

type TimelineHandler struct {
	queries        *db.Queries
	temporalClient client.Client
}

func NewTimelineHandler(queries *db.Queries, temporalClient client.Client) *TimelineHandler {
	return &TimelineHandler{
		queries:        queries,
		temporalClient: temporalClient,
	}
}

func (h *TimelineHandler) GetTimeline(
	ctx context.Context,
	req *connect.Request[timelinev1.GetTimelineRequest],
) (*connect.Response[timelinev1.GetTimelineResponse], error) {
	if h.temporalClient == nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("temporal client not initialized"))
	}

	workflowOptions := client.StartWorkflowOptions{
		ID:        "timeline-" + req.Msg.ParticipantId + "-" + req.Msg.SessionId,
		TaskQueue: "onboarding-queue",
	}

	run, err := h.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.TimelineWorkflow, workflows.TimelineWorkflowInput{
		ParticipantID: req.Msg.ParticipantId,
		SessionID:     req.Msg.SessionId,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var data *timelinev1.TimelineData
	err = run.Get(ctx, &data)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&timelinev1.GetTimelineResponse{
		Success: true,
		Data:    data,
	}), nil
}

func (h *TimelineHandler) GetWordAggregates(
	ctx context.Context,
	req *connect.Request[timelinev1.GetWordAggregatesRequest],
) (*connect.Response[timelinev1.GetWordAggregatesResponse], error) {
	return connect.NewResponse(&timelinev1.GetWordAggregatesResponse{}), nil
}

func (h *TimelineHandler) GetEmotionVectors(
	ctx context.Context,
	req *connect.Request[timelinev1.GetEmotionVectorsRequest],
) (*connect.Response[timelinev1.GetEmotionVectorsResponse], error) {
	return connect.NewResponse(&timelinev1.GetEmotionVectorsResponse{}), nil
}

func (h *TimelineHandler) GetWordStatistics(
	ctx context.Context,
	req *connect.Request[timelinev1.GetWordStatisticsRequest],
) (*connect.Response[timelinev1.GetWordStatisticsResponse], error) {
	return connect.NewResponse(&timelinev1.GetWordStatisticsResponse{}), nil
}
