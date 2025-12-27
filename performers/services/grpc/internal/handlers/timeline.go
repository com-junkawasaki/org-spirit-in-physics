package handlers

import (
	"context"
	"fmt"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
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
	if h.temporalClient == nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("temporal client not initialized"))
	}

	sessionID := ""
	if req.Msg.SessionId != nil {
		sessionID = *req.Msg.SessionId
	}

	workflowID := "timeline-" + req.Msg.ParticipantId + "-" + sessionID + "-" + fmt.Sprintf("%d", time.Now().UnixNano())
	workflowOptions := client.StartWorkflowOptions{
		ID:        workflowID,
		TaskQueue: "onboarding-queue",
	}

	run, err := h.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.TimelineWorkflow, workflows.TimelineWorkflowInput{
		ParticipantID: req.Msg.ParticipantId,
		SessionID:     sessionID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var points []*timelinev1.TimelinePoint
	err = run.Get(ctx, &points)
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
	pUID, err := uuid.Parse(req.Msg.ParticipantId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid participant ID: %v", err))
	}

	var sUID pgtype.UUID
	if req.Msg.SessionId != nil && *req.Msg.SessionId != "" {
		parsed, err := uuid.Parse(*req.Msg.SessionId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid session ID: %v", err))
		}
		sUID = pgtype.UUID{Bytes: parsed, Valid: true}
	}

	rows, err := h.queries.GetWordAggregates(ctx, db.GetWordAggregatesParams{
		ParticipantID: pgtype.UUID{Bytes: pUID, Valid: true},
		Column2:       sUID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	aggregates := make([]*timelinev1.WordAggregate, 0, len(rows))
	for _, r := range rows {
		aggregates = append(aggregates, &timelinev1.WordAggregate{
			ParticipantId:      uuid.UUID(r.ParticipantID.Bytes).String(),
			SessionId:          uuid.UUID(r.SessionID.Bytes).String(),
			Word:               r.Word.String,
			Count:              r.Count,
			AvgReactionValue:   float64Ptr(r.AvgReactionValue),
			SumReactionValue:   float64Ptr(float64(r.SumReactionValue)),
			AvgReactionTime:    float64Ptr(r.AvgReactionTime),
			SumReactionTime:    float64Ptr(float64(r.SumReactionTime)),
			AvgPhysiological:   float64Ptr(r.AvgPhysiological),
			SumPhysAbs:         float64Ptr(float64(r.SumPhysAbs)),
			PhysSeries:         toFloat64Slice(r.PhysSeries),
			RtSeries:           toFloat64Slice(r.RtSeries),
			RvSeries:           toFloat64Slice(r.RvSeries),
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
	pUID, err := uuid.Parse(req.Msg.ParticipantId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid participant ID: %v", err))
	}

	var sUID pgtype.UUID
	if req.Msg.SessionId != nil && *req.Msg.SessionId != "" {
		parsed, err := uuid.Parse(*req.Msg.SessionId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid session ID: %v", err))
		}
		sUID = pgtype.UUID{Bytes: parsed, Valid: true}
	}

	rows, err := h.queries.GetEmotionVectors(ctx, db.GetEmotionVectorsParams{
		ParticipantID: pgtype.UUID{Bytes: pUID, Valid: true},
		Column2:       sUID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	vectors := make([]*timelinev1.EmotionVector, 0, len(rows))
	for _, r := range rows {
		vectors = append(vectors, &timelinev1.EmotionVector{
			ParticipantId:     uuid.UUID(r.ParticipantID.Bytes).String(),
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
	pUID, err := uuid.Parse(req.Msg.ParticipantId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid participant ID: %v", err))
	}

	var sUID pgtype.UUID
	if req.Msg.SessionId != nil && *req.Msg.SessionId != "" {
		parsed, err := uuid.Parse(*req.Msg.SessionId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid session ID: %v", err))
		}
		sUID = pgtype.UUID{Bytes: parsed, Valid: true}
	}

	rows, err := h.queries.GetWordStatistics(ctx, db.GetWordStatisticsParams{
		ParticipantID: pgtype.UUID{Bytes: pUID, Valid: true},
		Column2:       sUID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	stats := make([]*timelinev1.WordStatistics, 0, len(rows))
	for _, r := range rows {
		stats = append(stats, &timelinev1.WordStatistics{
			ParticipantId:     uuid.UUID(r.ParticipantID.Bytes).String(),
			SessionId:         uuid.UUID(r.SessionID.Bytes).String(),
			Word:              r.Word.String,
			Count:             r.Count,
			AvgReactionTime:   float64Ptr(r.AvgReactionTime),
			StdReactionTime:   float64Ptr(r.StdReactionTime),
			VarReactionTime:   float64Ptr(r.VarReactionTime),
			AvgReactionValue:  float64Ptr(r.AvgReactionValue),
			StdReactionValue:  float64Ptr(r.StdReactionValue),
			VarReactionValue:  float64Ptr(r.VarReactionValue),
			AvgPhysiological:  float64Ptr(r.AvgPhysiological),
			StdPhysiological:  float64Ptr(r.StdPhysiological),
			VarPhysiological:  float64Ptr(r.VarPhysiological),
			SpeedIndex:        float64Ptr(float64(r.SpeedIndex)),
			PhysSeries:        toFloat64Slice(r.PhysSeries),
			RtSeries:          toFloat64Slice(r.RtSeries),
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
	if h.temporalClient == nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("temporal client not initialized"))
	}

	pUID, err := uuid.Parse(req.Msg.ParticipantId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid participant ID: %v", err))
	}

	var sUID pgtype.UUID
	sessionID := ""
	if req.Msg.SessionId != nil && *req.Msg.SessionId != "" {
		sessionID = *req.Msg.SessionId
		parsed, err := uuid.Parse(sessionID)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid session ID: %v", err))
		}
		sUID = pgtype.UUID{Bytes: parsed, Valid: true}
	}

	// 1. Fetch data needed for analysis
	points, err := h.queries.GetTimelinePoints(ctx, db.GetTimelinePointsParams{
		ParticipantID: pgtype.UUID{Bytes: pUID, Valid: true},
		Column2:       sUID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	vectors, err := h.queries.GetEmotionVectors(ctx, db.GetEmotionVectorsParams{
		ParticipantID: pgtype.UUID{Bytes: pUID, Valid: true},
		Column2:       sUID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// 2. Prepare for analysis workflow
	workflowID := fmt.Sprintf("analysis-%s-%d", req.Msg.ParticipantId, time.Now().UnixNano())
	workflowOptions := client.StartWorkflowOptions{
		ID:        workflowID,
		TaskQueue: "visualization-analysis-queue",
	}

	// Simple mapping for sessionData (minimal fields needed for analysis)
	sessionData := make([]map[string]interface{}, 0, len(points))
	for _, p := range points {
		sessionData = append(sessionData, map[string]interface{}{
			"timestamp":     p.Time.Time.UnixMilli(),
			"word":          p.Word.String,
			"reactionValue": p.ReactionValue.Float64,
			"reactionTime":  p.ReactionTime.Float64,
		})
	}

	// Emotion vectors mapping
	emoVectors := make(map[string][]float64)
	for _, v := range vectors {
		emoVectors[v.Word.String] = []float64{
			float64(v.JoySum), float64(v.SadnessSum), float64(v.AngerSum), float64(v.FearSum),
			float64(v.SurpriseSum), float64(v.DisgustSum), float64(v.CalmSum), float64(v.FocusSum),
			float64(v.ExcitementSum), float64(v.ConfusionSum),
		}
	}

	// Nodes and Links (Basic sequential links)
	nodes := make([]map[string]interface{}, 0, len(points))
	links := make([]map[string]interface{}, 0, len(points))
	for i, p := range points {
		nodes = append(nodes, map[string]interface{}{
			"id":    fmt.Sprintf("node-%d", i),
			"label": p.Word.String,
			"scale": 1.0 + p.ReactionValue.Float64*5.0,
		})
		if i > 0 {
			links = append(links, map[string]interface{}{
				"source": fmt.Sprintf("node-%d", i-1),
				"target": fmt.Sprintf("node-%d", i),
				"weight": 0.5,
			})
		}
	}

	// We pass the data to the workflow which is implemented in TypeScript
	run, err := h.temporalClient.ExecuteWorkflow(ctx, workflowOptions, "visualizationAnalysisWorkflow", nodes, links, emoVectors, sessionData)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var result timelinev1.GetAnalysisResponse
	err = run.Get(ctx, &result)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&result), nil
}

func (h *TimelineHandler) GetIntegratedTimeline(
	ctx context.Context,
	req *connect.Request[timelinev1.GetIntegratedTimelineRequest],
) (*connect.Response[timelinev1.GetIntegratedTimelineResponse], error) {
	if h.temporalClient == nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("temporal client not initialized"))
	}

	workflowID := fmt.Sprintf("integrated-%s-%d", req.Msg.ParticipantId, time.Now().UnixNano())
	workflowOptions := client.StartWorkflowOptions{
		ID:        workflowID,
		TaskQueue: "visualization-analysis-queue", // TS Worker queue
	}

	run, err := h.temporalClient.ExecuteWorkflow(ctx, workflowOptions, "timelineIntegratedWorkflow", req.Msg.ParticipantId, req.Msg.SessionId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var result struct {
		Points   []*timelinev1.TimelinePoint `json:"points"`
		Analysis *timelinev1.GetAnalysisResponse `json:"analysis"`
	}
	err = run.Get(ctx, &result)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&timelinev1.GetIntegratedTimelineResponse{
		Points:   result.Points,
		Analysis: result.Analysis,
	}), nil
}
