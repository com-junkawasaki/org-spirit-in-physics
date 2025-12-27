package activities

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/spirit-in-physics/services/grpc/gen/proto/timeline/v1"
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

func (a *TimelineActivities) FetchTimelineActivity(ctx context.Context, participantID string, sessionID string) ([]*timelinev1.TimelinePoint, error) {
	pUID, err := uuid.Parse(participantID)
	if err != nil {
		return nil, fmt.Errorf("invalid participant ID: %v", err)
	}

	var sUID pgtype.UUID
	if sessionID != "" {
		parsedSessionID, err := uuid.Parse(sessionID)
		if err != nil {
			return nil, fmt.Errorf("invalid session ID: %v", err)
		}
		sUID = pgtype.UUID{Bytes: parsedSessionID, Valid: true}
	}

	points, err := a.Queries.GetTimelinePoints(ctx, db.GetTimelinePointsParams{
		ParticipantID: pgtype.UUID{Bytes: pUID, Valid: true},
		Column2:       sUID,
	})
	if err != nil {
		return nil, err
	}

	result := make([]*timelinev1.TimelinePoint, 0, len(points))
	for _, p := range points {
		var emotions []*timelinev1.EmotionData
		if p.Emotions != nil {
			if b, ok := p.Emotions.([]byte); ok {
				if err := json.Unmarshal(b, &emotions); err != nil {
					// Handle error
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
				if err := json.Unmarshal(b, &physItems); err != nil {
					// Handle error
				}
			}
		}

		physData := make([]*timelinev1.PhysiologicalData, 0, len(physItems))
		for _, item := range physItems {
			val := item.Value
			physData = append(physData, &timelinev1.PhysiologicalData{
				Value: &val,
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
			ParticipantId: participantID,
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

func (a *TimelineActivities) FetchWordAggregatesActivity(ctx context.Context, participantID string, sessionID string) ([]*timelinev1.WordAggregate, error) {
	pUID, err := uuid.Parse(participantID)
	if err != nil {
		return nil, fmt.Errorf("invalid participant ID: %v", err)
	}

	var sUID pgtype.UUID
	if sessionID != "" {
		parsedSessionID, err := uuid.Parse(sessionID)
		if err != nil {
			return nil, fmt.Errorf("invalid session ID: %v", err)
		}
		sUID = pgtype.UUID{Bytes: parsedSessionID, Valid: true}
	}

	rows, err := a.Queries.GetWordAggregates(ctx, db.GetWordAggregatesParams{
		ParticipantID: pgtype.UUID{Bytes: pUID, Valid: true},
		Column2:       sUID,
	})
	if err != nil {
		return nil, err
	}

	result := make([]*timelinev1.WordAggregate, 0, len(rows))
	for _, r := range rows {
		result = append(result, &timelinev1.WordAggregate{
			ParticipantId:    participantID,
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

func (a *TimelineActivities) FetchEmotionVectorsActivity(ctx context.Context, participantID string, sessionID string) ([]*timelinev1.EmotionVector, error) {
	pUID, err := uuid.Parse(participantID)
	if err != nil {
		return nil, fmt.Errorf("invalid participant ID: %v", err)
	}

	var sUID pgtype.UUID
	if sessionID != "" {
		parsedSessionID, err := uuid.Parse(sessionID)
		if err != nil {
			return nil, fmt.Errorf("invalid session ID: %v", err)
		}
		sUID = pgtype.UUID{Bytes: parsedSessionID, Valid: true}
	}

	rows, err := a.Queries.GetEmotionVectors(ctx, db.GetEmotionVectorsParams{
		ParticipantID: pgtype.UUID{Bytes: pUID, Valid: true},
		Column2:       sUID,
	})
	if err != nil {
		return nil, err
	}

	result := make([]*timelinev1.EmotionVector, 0, len(rows))
	for _, r := range rows {
		result = append(result, &timelinev1.EmotionVector{
			ParticipantId:     participantID,
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

func (a *TimelineActivities) FetchWordStatisticsActivity(ctx context.Context, participantID string, sessionID string) ([]*timelinev1.WordStatistics, error) {
	pUID, err := uuid.Parse(participantID)
	if err != nil {
		return nil, fmt.Errorf("invalid participant ID: %v", err)
	}

	var sUID pgtype.UUID
	if sessionID != "" {
		parsedSessionID, err := uuid.Parse(sessionID)
		if err != nil {
			return nil, fmt.Errorf("invalid session ID: %v", err)
		}
		sUID = pgtype.UUID{Bytes: parsedSessionID, Valid: true}
	}

	rows, err := a.Queries.GetWordStatistics(ctx, db.GetWordStatisticsParams{
		ParticipantID: pgtype.UUID{Bytes: pUID, Valid: true},
		Column2:       sUID,
	})
	if err != nil {
		return nil, err
	}

	result := make([]*timelinev1.WordStatistics, 0, len(rows))
	for _, r := range rows {
		result = append(result, &timelinev1.WordStatistics{
			ParticipantId:    participantID,
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
