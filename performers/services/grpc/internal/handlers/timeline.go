package handlers

import (
	"context"

	"connectrpc.com/connect"
	"github.com/spirit-in-physics/services/grpc/gen/proto/timeline/v1"
	"github.com/spirit-in-physics/services/grpc/internal/db"
)

type TimelineHandler struct {
	queries *db.Queries
}

func NewTimelineHandler(queries *db.Queries) *TimelineHandler {
	return &TimelineHandler{
		queries: queries,
	}
}

func (h *TimelineHandler) GetTimeline(
	ctx context.Context,
	req *connect.Request[timelinev1.GetTimelineRequest],
) (*connect.Response[timelinev1.GetTimelineResponse], error) {
	return connect.NewResponse(&timelinev1.GetTimelineResponse{}), nil
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
