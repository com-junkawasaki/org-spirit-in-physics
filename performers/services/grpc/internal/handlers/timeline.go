package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/spirit-in-physics/services/grpc/gen/proto/timeline/v1"
	"github.com/spirit-in-physics/services/grpc/internal/db"
	"google.golang.org/protobuf/types/known/structpb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// TimelineHandler handles timeline service requests
type TimelineHandler struct {
	queries *db.Queries
}

// NewTimelineHandler creates a new TimelineHandler
func NewTimelineHandler(queries *db.Queries) *TimelineHandler {
	return &TimelineHandler{
		queries: queries,
	}
}

// GetTimeline returns timeline data for a participant
func (h *TimelineHandler) GetTimeline(
	ctx context.Context,
	req *connect.Request[timelinev1.GetTimelineRequest],
) (*connect.Response[timelinev1.GetTimelineResponse], error) {
	participantID, err := uuid.Parse(req.Msg.ParticipantId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var sessionID *uuid.UUID
	if req.Msg.SessionId != nil && *req.Msg.SessionId != "" {
		sid, err := uuid.Parse(*req.Msg.SessionId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		sessionID = &sid
	}

	var startTime *time.Time
	if req.Msg.StartTime != nil {
		t := req.Msg.StartTime.AsTime()
		startTime = &t
	}

	var endTime *time.Time
	if req.Msg.EndTime != nil {
		t := req.Msg.EndTime.AsTime()
		endTime = &t
	}

	// Check if user is authenticated (for public/private filtering)
	isAuthenticated := IsAuthenticated(ctx)

	var rows []db.GetTimelinePointsRow
	if isAuthenticated {
		rows, err = h.queries.GetTimelinePoints(ctx, db.GetTimelinePointsParams{
			ParticipantID: participantID,
			Column2:       toUUIDPtr(sessionID),
			Column3:       toTimePtr(startTime),
			Column4:       toTimePtr(endTime),
		})
	} else {
		rows, err = h.queries.GetTimelinePointsWithPublicCheck(ctx, db.GetTimelinePointsWithPublicCheckParams{
			ParticipantID: participantID,
			Column2:       toUUIDPtr(sessionID),
			Column3:       toTimePtr(startTime),
			Column4:       toTimePtr(endTime),
		})
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	points := make([]*timelinev1.TimelinePoint, 0, len(rows))
	for _, row := range rows {
		// Parse emotions JSON (row.Emotions is []byte from PostgreSQL JSONB)
		var emotions []*timelinev1.EmotionData
		if len(row.Emotions) > 0 {
			var emotionsArray []map[string]interface{}
			if err := json.Unmarshal(row.Emotions, &emotionsArray); err == nil {
				for _, e := range emotionsArray {
					emotion := &timelinev1.EmotionData{
						Name:     getStringFromMap(e, "name"),
						Score:    getFloatFromMap(e, "score"),
						FileType: getStringFromMap(e, "fileType"),
					}
					if color := getStringFromMap(e, "color"); color != "" {
						emotion.Color = &color
					}
					emotions = append(emotions, emotion)
				}
			}
		}

		// Parse physiological data JSON (row.Physiological is []byte from PostgreSQL JSONB)
		var physiological []*timelinev1.PhysiologicalData
		if len(row.Physiological) > 0 {
			var physArray []map[string]interface{}
			if err := json.Unmarshal(row.Physiological, &physArray); err == nil {
				for _, p := range physArray {
					phys := &timelinev1.PhysiologicalData{}
					if ts := getStringFromMap(p, "timestamp"); ts != "" {
						if t, err := time.Parse(time.RFC3339, ts); err == nil {
							phys.Timestamp = timestamppb.New(t)
						}
					}
					if val := getFloatFromMap(p, "value"); val != 0 {
						phys.Value = &val
					}
					physiological = append(physiological, phys)
				}
			}
		}

		point := &timelinev1.TimelinePoint{
			Time:          timestamppb.New(row.Time),
			ParticipantId: row.ParticipantID.String(),
			SessionId:     row.SessionID.String(),
			HasResponse:   row.HasResponse,
			Emotions:      emotions,
			Physiological: physiological,
		}

		if row.Word.Valid {
			word := row.Word.String
			point.Word = &word
		}
		if row.EventType.Valid {
			eventType := row.EventType.String
			point.EventType = &eventType
		}
		if row.ReactionValue.Valid {
			rv := row.ReactionValue.Float64
			point.ReactionValue = &rv
		}
		if row.ReactionTime.Valid {
			rt := row.ReactionTime.Float64
			point.ReactionTime = &rt
		}

		// Create empty metadata struct
		metadata, _ := structpb.NewStruct(map[string]interface{}{})
		point.Metadata = metadata

		points = append(points, point)
	}

	resp := &timelinev1.GetTimelineResponse{
		Points: points,
	}

	return connect.NewResponse(resp), nil
}

// GetWordAggregates returns word aggregates by session
func (h *TimelineHandler) GetWordAggregates(
	ctx context.Context,
	req *connect.Request[timelinev1.GetWordAggregatesRequest],
) (*connect.Response[timelinev1.GetWordAggregatesResponse], error) {
	participantID, err := uuid.Parse(req.Msg.ParticipantId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var sessionID *uuid.UUID
	if req.Msg.SessionId != nil && *req.Msg.SessionId != "" {
		sid, err := uuid.Parse(*req.Msg.SessionId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		sessionID = &sid
	}

	rows, err := h.queries.GetWordAggregates(ctx, db.GetWordAggregatesParams{
		ParticipantID: participantID,
		Column2:       toUUIDPtr(sessionID),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	aggregates := make([]*timelinev1.WordAggregate, 0, len(rows))
	for _, row := range rows {
		agg := &timelinev1.WordAggregate{
			ParticipantId: row.ParticipantID.String(),
			SessionId:     row.SessionID.String(),
			Word:          row.Word,
			Count:         row.Count,
			FirstTime:     timestamppb.New(row.FirstTime),
			LastTime:      timestamppb.New(row.LastTime),
		}

		if row.AvgReactionValue.Valid {
			rv := row.AvgReactionValue.Float64
			agg.AvgReactionValue = &rv
		}
		if row.SumReactionValue.Valid {
			sv := row.SumReactionValue.Float64
			agg.SumReactionValue = &sv
		}
		if row.AvgReactionTime.Valid {
			at := row.AvgReactionTime.Float64
			agg.AvgReactionTime = &at
		}
		if row.SumReactionTime.Valid {
			st := row.SumReactionTime.Float64
			agg.SumReactionTime = &st
		}
		if row.AvgPhysiological.Valid {
			ap := row.AvgPhysiological.Float64
			agg.AvgPhysiological = &ap
		}
		if row.SumPhysAbs.Valid {
			spa := row.SumPhysAbs.Float64
			agg.SumPhysAbs = &spa
		}

		// Convert PostgreSQL arrays to slices
		if row.PhysSeries != nil {
			agg.PhysSeries = convertFloat64Array(row.PhysSeries)
		}
		if row.RtSeries != nil {
			agg.RtSeries = convertFloat64Array(row.RtSeries)
		}
		if row.RvSeries != nil {
			agg.RvSeries = convertFloat64Array(row.RvSeries)
		}

		aggregates = append(aggregates, agg)
	}

	resp := &timelinev1.GetWordAggregatesResponse{
		Aggregates: aggregates,
	}

	return connect.NewResponse(resp), nil
}

// GetEmotionVectors returns emotion vectors by word
func (h *TimelineHandler) GetEmotionVectors(
	ctx context.Context,
	req *connect.Request[timelinev1.GetEmotionVectorsRequest],
) (*connect.Response[timelinev1.GetEmotionVectorsResponse], error) {
	participantID, err := uuid.Parse(req.Msg.ParticipantId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var sessionID *uuid.UUID
	if req.Msg.SessionId != nil && *req.Msg.SessionId != "" {
		sid, err := uuid.Parse(*req.Msg.SessionId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		sessionID = &sid
	}

	rows, err := h.queries.GetEmotionVectors(ctx, db.GetEmotionVectorsParams{
		ParticipantID: participantID,
		Column2:       toUUIDPtr(sessionID),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	vectors := make([]*timelinev1.EmotionVector, 0, len(rows))
	for _, row := range rows {
		vec := &timelinev1.EmotionVector{
			ParticipantId:     row.ParticipantID.String(),
			SessionId:         row.SessionID.String(),
			Word:              row.Word,
			EmotionEntryCount: row.EmotionEntryCount,
		}

		if row.JoySum.Valid {
			js := row.JoySum.Float64
			vec.JoySum = &js
		}
		if row.SadnessSum.Valid {
			ss := row.SadnessSum.Float64
			vec.SadnessSum = &ss
		}
		if row.AngerSum.Valid {
			as := row.AngerSum.Float64
			vec.AngerSum = &as
		}
		if row.FearSum.Valid {
			fs := row.FearSum.Float64
			vec.FearSum = &fs
		}
		if row.SurpriseSum.Valid {
			ss := row.SurpriseSum.Float64
			vec.SurpriseSum = &ss
		}
		if row.DisgustSum.Valid {
			ds := row.DisgustSum.Float64
			vec.DisgustSum = &ds
		}
		if row.CalmSum.Valid {
			cs := row.CalmSum.Float64
			vec.CalmSum = &cs
		}
		if row.FocusSum.Valid {
			fs := row.FocusSum.Float64
			vec.FocusSum = &fs
		}
		if row.ExcitementSum.Valid {
			es := row.ExcitementSum.Float64
			vec.ExcitementSum = &es
		}
		if row.ConfusionSum.Valid {
			cs := row.ConfusionSum.Float64
			vec.ConfusionSum = &cs
		}

		if row.EmotionByModality != nil {
			modalityStruct := &structpb.Struct{}
			if err := modalityStruct.UnmarshalJSON(row.EmotionByModality); err == nil {
				vec.EmotionByModality = modalityStruct
			}
		}

		vectors = append(vectors, vec)
	}

	resp := &timelinev1.GetEmotionVectorsResponse{
		Vectors: vectors,
	}

	return connect.NewResponse(resp), nil
}

// GetWordStatistics returns word statistics by session
func (h *TimelineHandler) GetWordStatistics(
	ctx context.Context,
	req *connect.Request[timelinev1.GetWordStatisticsRequest],
) (*connect.Response[timelinev1.GetWordStatisticsResponse], error) {
	participantID, err := uuid.Parse(req.Msg.ParticipantId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var sessionID *uuid.UUID
	if req.Msg.SessionId != nil && *req.Msg.SessionId != "" {
		sid, err := uuid.Parse(*req.Msg.SessionId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		sessionID = &sid
	}

	rows, err := h.queries.GetWordStatistics(ctx, db.GetWordStatisticsParams{
		ParticipantID: participantID,
		Column2:       toUUIDPtr(sessionID),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	statistics := make([]*timelinev1.WordStatistics, 0, len(rows))
	for _, row := range rows {
		stats := &timelinev1.WordStatistics{
			ParticipantId: row.ParticipantID.String(),
			SessionId:     row.SessionID.String(),
			Word:          row.Word,
			Count:         row.Count,
		}

		if row.AvgReactionTime.Valid {
			at := row.AvgReactionTime.Float64
			stats.AvgReactionTime = &at
		}
		if row.StdReactionTime.Valid {
			st := row.StdReactionTime.Float64
			stats.StdReactionTime = &st
		}
		if row.VarReactionTime.Valid {
			vt := row.VarReactionTime.Float64
			stats.VarReactionTime = &vt
		}
		if row.AvgReactionValue.Valid {
			av := row.AvgReactionValue.Float64
			stats.AvgReactionValue = &av
		}
		if row.StdReactionValue.Valid {
			sv := row.StdReactionValue.Float64
			stats.StdReactionValue = &sv
		}
		if row.VarReactionValue.Valid {
			vv := row.VarReactionValue.Float64
			stats.VarReactionValue = &vv
		}
		if row.AvgPhysiological.Valid {
			ap := row.AvgPhysiological.Float64
			stats.AvgPhysiological = &ap
		}
		if row.StdPhysiological.Valid {
			sp := row.StdPhysiological.Float64
			stats.StdPhysiological = &sp
		}
		if row.VarPhysiological.Valid {
			vp := row.VarPhysiological.Float64
			stats.VarPhysiological = &vp
		}
		if row.SpeedIndex.Valid {
			si := row.SpeedIndex.Float64
			stats.SpeedIndex = &si
		}

		// Convert PostgreSQL arrays to slices
		if row.PhysSeries != nil {
			stats.PhysSeries = convertFloat64Array(row.PhysSeries)
		}
		if row.RtSeries != nil {
			stats.RtSeries = convertFloat64Array(row.RtSeries)
		}

		statistics = append(statistics, stats)
	}

	resp := &timelinev1.GetWordStatisticsResponse{
		Statistics: statistics,
	}

	return connect.NewResponse(resp), nil
}

// Helper functions
func toUUIDPtr(u *uuid.UUID) sql.NullString {
	if u == nil {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: u.String(), Valid: true}
}

func toTimePtr(t *time.Time) sql.NullTime {
	if t == nil {
		return sql.NullTime{Valid: false}
	}
	return sql.NullTime{Time: *t, Valid: true}
}

func getStringFromMap(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func getFloatFromMap(m map[string]interface{}, key string) float64 {
	if v, ok := m[key]; ok {
		switch val := v.(type) {
		case float64:
			return val
		case float32:
			return float64(val)
		case int:
			return float64(val)
		case int64:
			return float64(val)
		}
	}
	return 0
}

func convertFloat64Array(arr []sql.NullFloat64) []float64 {
	result := make([]float64, 0, len(arr))
	for _, v := range arr {
		if v.Valid {
			result = append(result, v.Float64)
		}
	}
	return result
}
