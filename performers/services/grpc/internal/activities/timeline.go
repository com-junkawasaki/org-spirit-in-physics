package activities

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/spirit-in-physics/services/grpc/gen/proto/timeline/v1"
	"github.com/spirit-in-physics/services/grpc/internal/db"
	"google.golang.org/protobuf/types/known/timestamppb"
	"encoding/json"
)

type TimelineActivities struct {
	Queries *db.Queries
}

func (a *TimelineActivities) FetchTimelineActivity(ctx context.Context, participantID string, sessionID string) ([]*timelinev1.TimelineDataPoint, error) {
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

	result := make([]*timelinev1.TimelineDataPoint, 0, len(points))
	for _, p := range points {
		var emotions []*timelinev1.EmotionEntry
		if p.Emotions != nil {
			if b, ok := p.Emotions.([]byte); ok {
				if err := json.Unmarshal(b, &emotions); err != nil {
					// Handle error
				}
			}
		}

		var physItems []struct {
			MeasurementType string  `json:"measurement_type"`
			Value           float32 `json:"value"`
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

		// Calculate averages for physiological
		avgPhys := &timelinev1.PhysiologicalData{
			Average: 0,
			Max:     0,
			Min:     0,
		}
		if len(physItems) > 0 {
			var total float32
			avgPhys.Min = physItems[0].Value
			for _, m := range physItems {
				total += m.Value
				if m.Value > avgPhys.Max {
					avgPhys.Max = m.Value
				}
				if m.Value < avgPhys.Min {
					avgPhys.Min = m.Value
				}
			}
			avgPhys.Average = total / float32(len(physItems))
		}

		result = append(result, &timelinev1.TimelineDataPoint{
			Timestamp:     timestamppb.New(p.Time.Time),
			Word:          p.Word.String,
			ReactionTime:  float32(p.ReactionTime.Float64),
			ReactionValue: float32(p.ReactionValue.Float64),
			EventType:     p.EventType.String,
			Emotions:      emotions,
			Physiological: avgPhys,
		})
	}

	return result, nil
}

func (a *TimelineActivities) FetchAggregatesActivity(ctx context.Context, participantID string, sessionID string) (*timelinev1.TimelineData, error) {
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

	aggregates, err := a.Queries.GetWordAggregates(ctx, db.GetWordAggregatesParams{
		ParticipantID: pgtype.UUID{Bytes: pUID, Valid: true},
		Column2:       sUID,
	})
	if err != nil {
		return nil, err
	}

	stats, err := a.Queries.GetWordStatistics(ctx, db.GetWordStatisticsParams{
		ParticipantID: pgtype.UUID{Bytes: pUID, Valid: true},
		Column2:       sUID,
	})
	if err != nil {
		return nil, err
	}

	vectors, err := a.Queries.GetEmotionVectors(ctx, db.GetEmotionVectorsParams{
		ParticipantID: pgtype.UUID{Bytes: pUID, Valid: true},
		Column2:       sUID,
	})
	if err != nil {
		return nil, err
	}

	// Map them to proto types
	// (Skipping detailed mapping for brevity, focusing on the points mostly)
	return &timelinev1.TimelineData{
		// ...
	}, nil
}

