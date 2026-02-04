package activities

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	timelinev1 "github.com/spirit-in-physics/services/grpc/gen/proto/timeline/v1"
	"github.com/spirit-in-physics/services/grpc/internal/dapr/workflows"
	"github.com/spirit-in-physics/services/grpc/internal/db"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type TimelineActivities struct {
	Queries *db.Queries
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

func float64Ptr(v float64) *float64 {
	return &v
}

func (a *TimelineActivities) FetchTimelineActivity(ctx context.Context, input workflows.TimelineWorkflowInput) ([]*timelinev1.TimelinePoint, error) {
	start := time.Now()
	log.Printf(`{"location":"dapr/activities/timeline.go:FetchTimelineActivity","message":"Started","participantId":"%s","sessionId":"%s"}`, input.ParticipantID, input.SessionID)

	var sUID pgtype.UUID
	if input.SessionID != "" {
		parsedSessionID, err := uuid.Parse(input.SessionID)
		if err != nil {
			return nil, fmt.Errorf("invalid session ID: %v", err)
		}
		sUID = pgtype.UUID{Bytes: parsedSessionID, Valid: true}
	}

	log.Printf(`{"location":"dapr/activities/timeline.go:FetchTimelineActivity","message":"Executing Query"}`)
	points, err := a.Queries.GetTimelinePoints(ctx, db.GetTimelinePointsParams{
		ParticipantID: input.ParticipantID,
		Column2:       sUID,
	})
	if err != nil {
		log.Printf(`{"location":"dapr/activities/timeline.go:FetchTimelineActivity","message":"Query Failed","error":"%v"}`, err)
		return nil, err
	}
	log.Printf(`{"location":"dapr/activities/timeline.go:FetchTimelineActivity","message":"Query Completed","duration_ms":%d,"pointsCount":%d}`, time.Since(start).Milliseconds(), len(points))

	result := make([]*timelinev1.TimelinePoint, 0, len(points))
	for _, p := range points {
		var emotions []*timelinev1.EmotionData
		if p.Emotions != nil {
			if b, ok := p.Emotions.([]byte); ok {
				var allEmos []*timelinev1.EmotionData
				if err := json.Unmarshal(b, &allEmos); err == nil {
					isWordEvent := p.Word.Valid && p.Word.String != "" && p.Word.String != "Unknown"
					for _, e := range allEmos {
						if (isWordEvent && e.Score >= 0.05) || (!isWordEvent && e.Score >= 0.1) {
							emotions = append(emotions, e)
						}
					}
				}
			}
		}

		var physItems []struct {
			MeasurementType string  `json:"measurement_type"`
			Value           float64 `json:"value"`
			Unit            string  `json:"unit"`
			Timestamp       string  `json:"timestamp"`
		}
		if p.Physiological != nil {
			if b, ok := p.Physiological.([]byte); ok {
				json.Unmarshal(b, &physItems)
			}
		}

		physData := make([]*timelinev1.PhysiologicalData, 0, len(physItems))
		for _, item := range physItems {
			val := item.Value
			mType := item.MeasurementType
			physData = append(physData, &timelinev1.PhysiologicalData{
				Value:           &val,
				MeasurementType: &mType,
			})
		}

		var word, eventType *string
		if p.Word.Valid {
			word = &p.Word.String
		}
		if p.EventType.Valid {
			eventType = &p.EventType.String
		}

		var rt, rv *float64
		if p.ReactionTime.Valid {
			v := p.ReactionTime.Float64
			rt = &v
		}
		if p.ReactionValue.Valid {
			v := p.ReactionValue.Float64
			rv = &v
		}

		sid := ""
		if p.SessionID.Valid {
			sid = uuid.UUID(p.SessionID.Bytes).String()
		}

		result = append(result, &timelinev1.TimelinePoint{
			Time:          timestamppb.New(p.Time.Time),
			ParticipantId: input.ParticipantID,
			SessionId:     sid,
			Word:          word,
			ReactionTime:  rt,
			ReactionValue: rv,
			EventType:     eventType,
			Emotions:      emotions,
			Physiological: physData,
			HasResponse:   p.HasResponse.Bool,
		})
	}

	return result, nil
}

func (a *TimelineActivities) FetchWordAggregatesActivity(ctx context.Context, input workflows.TimelineWorkflowInput) ([]*timelinev1.WordAggregate, error) {
	var sUID pgtype.UUID
	if input.SessionID != "" {
		parsedSessionID, err := uuid.Parse(input.SessionID)
		if err != nil {
			return nil, fmt.Errorf("invalid session ID: %v", err)
		}
		sUID = pgtype.UUID{Bytes: parsedSessionID, Valid: true}
	}

	rows, err := a.Queries.GetWordAggregates(ctx, db.GetWordAggregatesParams{
		ParticipantID: input.ParticipantID,
		Column2:       sUID,
	})
	if err != nil {
		return nil, err
	}

	result := make([]*timelinev1.WordAggregate, 0, len(rows))
	for _, r := range rows {
		result = append(result, &timelinev1.WordAggregate{
			ParticipantId:    input.ParticipantID,
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
	return result, nil
}

func (a *TimelineActivities) FetchEmotionVectorsActivity(ctx context.Context, input workflows.TimelineWorkflowInput) ([]*timelinev1.EmotionVector, error) {
	var sUID pgtype.UUID
	if input.SessionID != "" {
		parsedSessionID, err := uuid.Parse(input.SessionID)
		if err != nil {
			return nil, fmt.Errorf("invalid session ID: %v", err)
		}
		sUID = pgtype.UUID{Bytes: parsedSessionID, Valid: true}
	}

	rows, err := a.Queries.GetEmotionVectors(ctx, db.GetEmotionVectorsParams{
		ParticipantID: input.ParticipantID,
		Column2:       sUID,
	})
	if err != nil {
		return nil, err
	}

	result := make([]*timelinev1.EmotionVector, 0, len(rows))
	for _, r := range rows {
		result = append(result, &timelinev1.EmotionVector{
			ParticipantId:     input.ParticipantID,
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
	return result, nil
}

func (a *TimelineActivities) FetchWordStatisticsActivity(ctx context.Context, input workflows.TimelineWorkflowInput) ([]*timelinev1.WordStatistics, error) {
	var sUID pgtype.UUID
	if input.SessionID != "" {
		parsedSessionID, err := uuid.Parse(input.SessionID)
		if err != nil {
			return nil, fmt.Errorf("invalid session ID: %v", err)
		}
		sUID = pgtype.UUID{Bytes: parsedSessionID, Valid: true}
	}

	rows, err := a.Queries.GetWordStatistics(ctx, db.GetWordStatisticsParams{
		ParticipantID: input.ParticipantID,
		Column2:       sUID,
	})
	if err != nil {
		return nil, err
	}

	result := make([]*timelinev1.WordStatistics, 0, len(rows))
	for _, r := range rows {
		result = append(result, &timelinev1.WordStatistics{
			ParticipantId:    input.ParticipantID,
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
	return result, nil
}
