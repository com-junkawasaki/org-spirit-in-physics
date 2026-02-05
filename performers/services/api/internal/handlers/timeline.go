package handlers

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	"github.com/dapr/go-sdk/workflow"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/spirit-in-physics/services/grpc/gen/proto/timeline/v1"
	"github.com/spirit-in-physics/services/grpc/internal/activities"
	"github.com/spirit-in-physics/services/grpc/internal/db"
)

type TimelineHandler struct {
	queries        *db.Queries
	workflowClient *workflow.Client
}

func NewTimelineHandler(queries *db.Queries, workflowClient *workflow.Client) *TimelineHandler {
	return &TimelineHandler{
		queries:        queries,
		workflowClient: workflowClient,
	}
}

func float64Ptr(v float64) *float64 {
	return &v
}

func toFloat64Slice(v interface{}) []float64 {
	if v == nil {
		return nil
	}
	if s, ok := v.([]float64); ok {
		return s
	}
	return nil
}

func (h *TimelineHandler) GetTimeline(
	ctx context.Context,
	req *connect.Request[timelinev1.GetTimelineRequest],
) (*connect.Response[timelinev1.GetTimelineResponse], error) {
	sessionID := ""
	if req.Msg.SessionId != nil {
		sessionID = *req.Msg.SessionId
	}

	// Call activity directly instead of through workflow for simple data fetching
	ta := &activities.TimelineActivities{Queries: h.queries}
	points, err := ta.FetchTimelineActivity(ctx, req.Msg.ParticipantId, sessionID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&timelinev1.GetTimelineResponse{
		Points: points,
	}), nil
}

func (h *TimelineHandler) GetWordAggregates(
	ctx context.Context,
	req *connect.Request[timelinev1.GetWordAggregatesRequest],
) (*connect.Response[timelinev1.GetWordAggregatesResponse], error) {
	var sUID pgtype.UUID
	if req.Msg.SessionId != nil && *req.Msg.SessionId != "" {
		parsed, err := uuid.Parse(*req.Msg.SessionId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid session ID: %v", err))
		}
		sUID = pgtype.UUID{Bytes: parsed, Valid: true}
	}

	rows, err := h.queries.GetWordAggregates(ctx, db.GetWordAggregatesParams{
		ParticipantID: req.Msg.ParticipantId,
		Column2:       sUID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	aggregates := make([]*timelinev1.WordAggregate, 0, len(rows))
	for _, r := range rows {
		aggregates = append(aggregates, &timelinev1.WordAggregate{
			ParticipantId:    r.ParticipantID,
			SessionId:        uuid.UUID(r.SessionID.Bytes).String(),
			Word:             r.Word.String,
			Count:            r.Count,
			AvgReactionValue: float64Ptr(r.AvgReactionValue),
			SumReactionValue: float64Ptr(float64(r.SumReactionValue)),
			AvgReactionTime:  float64Ptr(r.AvgReactionTime),
			SumReactionTime:  float64Ptr(float64(r.SumReactionTime)),
			AvgPhysiological: float64Ptr(r.AvgPhysiological),
			SumPhysAbs:       float64Ptr(float64(r.SumPhysAbs)),
			PhysSeries:       toFloat64Slice(r.PhysSeries),
			RtSeries:         toFloat64Slice(r.RtSeries),
			RvSeries:         toFloat64Slice(r.RvSeries),
		})
	}

	return connect.NewResponse(&timelinev1.GetWordAggregatesResponse{
		Aggregates: aggregates,
	}), nil
}

func (h *TimelineHandler) GetEmotionVectors(
	ctx context.Context,
	req *connect.Request[timelinev1.GetEmotionVectorsRequest],
) (*connect.Response[timelinev1.GetEmotionVectorsResponse], error) {
	var sUID pgtype.UUID
	if req.Msg.SessionId != nil && *req.Msg.SessionId != "" {
		parsed, err := uuid.Parse(*req.Msg.SessionId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid session ID: %v", err))
		}
		sUID = pgtype.UUID{Bytes: parsed, Valid: true}
	}

	rows, err := h.queries.GetEmotionVectors(ctx, db.GetEmotionVectorsParams{
		ParticipantID: req.Msg.ParticipantId,
		Column2:       sUID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	vectors := make([]*timelinev1.EmotionVector, 0, len(rows))
	for _, r := range rows {
		vectors = append(vectors, &timelinev1.EmotionVector{
			ParticipantId:     r.ParticipantID,
			SessionId:         uuid.UUID(r.SessionID.Bytes).String(),
			Word:              r.Word.String,
			JoySum:            float64Ptr(float64(r.JoySum)),
			SadnessSum:        float64Ptr(float64(r.SadnessSum)),
			AngerSum:          float64Ptr(float64(r.AngerSum)),
			FearSum:           float64Ptr(float64(r.FearSum)),
			SurpriseSum:       float64Ptr(float64(r.SurpriseSum)),
			DisgustSum:        float64Ptr(float64(r.DisgustSum)),
			CalmSum:           float64Ptr(float64(r.CalmSum)),
			FocusSum:          float64Ptr(float64(r.FocusSum)),
			ExcitementSum:     float64Ptr(float64(r.ExcitementSum)),
			ConfusionSum:      float64Ptr(float64(r.ConfusionSum)),
			EmotionEntryCount: int64(r.EmotionEntryCount),
		})
	}

	return connect.NewResponse(&timelinev1.GetEmotionVectorsResponse{
		Vectors: vectors,
	}), nil
}

func (h *TimelineHandler) GetWordStatistics(
	ctx context.Context,
	req *connect.Request[timelinev1.GetWordStatisticsRequest],
) (*connect.Response[timelinev1.GetWordStatisticsResponse], error) {
	var sUID pgtype.UUID
	if req.Msg.SessionId != nil && *req.Msg.SessionId != "" {
		parsed, err := uuid.Parse(*req.Msg.SessionId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid session ID: %v", err))
		}
		sUID = pgtype.UUID{Bytes: parsed, Valid: true}
	}

	rows, err := h.queries.GetWordStatistics(ctx, db.GetWordStatisticsParams{
		ParticipantID: req.Msg.ParticipantId,
		Column2:       sUID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	stats := make([]*timelinev1.WordStatistics, 0, len(rows))
	for _, r := range rows {
		stats = append(stats, &timelinev1.WordStatistics{
			ParticipantId:    r.ParticipantID,
			SessionId:        uuid.UUID(r.SessionID.Bytes).String(),
			Word:             r.Word.String,
			Count:            r.Count,
			AvgReactionTime:  float64Ptr(r.AvgReactionTime),
			StdReactionTime:  float64Ptr(r.StdReactionTime),
			VarReactionTime:  float64Ptr(r.VarReactionTime),
			AvgReactionValue: float64Ptr(r.AvgReactionValue),
			StdReactionValue: float64Ptr(r.StdReactionValue),
			VarReactionValue: float64Ptr(r.VarReactionValue),
			AvgPhysiological: float64Ptr(r.AvgPhysiological),
			StdPhysiological: float64Ptr(r.StdPhysiological),
			VarPhysiological: float64Ptr(r.VarPhysiological),
			SpeedIndex:       float64Ptr(float64(r.SpeedIndex)),
			PhysSeries:       toFloat64Slice(r.PhysSeries),
			RtSeries:         toFloat64Slice(r.RtSeries),
		})
	}

	return connect.NewResponse(&timelinev1.GetWordStatisticsResponse{
		Statistics: stats,
	}), nil
}

func (h *TimelineHandler) GetAnalysis(
	ctx context.Context,
	req *connect.Request[timelinev1.GetAnalysisRequest],
) (*connect.Response[timelinev1.GetAnalysisResponse], error) {
	// Analysis was handled by TypeScript worker which is no longer available
	// Return empty analysis for now
	return connect.NewResponse(&timelinev1.GetAnalysisResponse{}), nil
}

func (h *TimelineHandler) GetIntegratedTimeline(
	ctx context.Context,
	req *connect.Request[timelinev1.GetIntegratedTimelineRequest],
) (*connect.Response[timelinev1.GetIntegratedTimelineResponse], error) {
	sessionID := ""
	if req.Msg.SessionId != nil {
		sessionID = *req.Msg.SessionId
	}

	// Call activity directly instead of through workflow
	ta := &activities.TimelineActivities{Queries: h.queries}
	points, err := ta.FetchTimelineActivity(ctx, req.Msg.ParticipantId, sessionID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Analysis was handled by TypeScript worker which is no longer available
	// Return empty analysis for now
	return connect.NewResponse(&timelinev1.GetIntegratedTimelineResponse{
		Points:   points,
		Analysis: &timelinev1.GetAnalysisResponse{},
	}), nil
}
