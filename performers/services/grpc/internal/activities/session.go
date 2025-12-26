package activities

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/spirit-in-physics/services/grpc/internal/db"
)

// SessionActivities handles session-related activities
type SessionActivities struct {
	queries *db.Queries
}

// NewSessionActivities creates a new SessionActivities instance
func NewSessionActivities(queries *db.Queries) *SessionActivities {
	return &SessionActivities{
		queries: queries,
	}
}

// CreateSessionActivity creates a new session in the database
func (a *SessionActivities) CreateSessionActivity(ctx context.Context, input CreateSessionInput) (string, error) {
	participantID, err := uuid.Parse(input.ParticipantID)
	if err != nil {
		return "", err
	}

	sessionID := uuid.New()
	now := time.Now()

	_, err = a.queries.CreateSession(ctx, db.CreateSessionParams{
		ID:            pgtype.UUID{Bytes: sessionID, Valid: true},
		ParticipantID: pgtype.UUID{Bytes: participantID, Valid: true},
		SessionIndex:  pgtype.Int4{Int32: *input.SessionIndex, Valid: input.SessionIndex != nil},
		StartTs:       input.StartTS,
		EndTs:         pgtype.Int8{Valid: false},
		CreatedAt:     pgtype.Timestamptz{Time: now, Valid: true},
		UpdatedAt:     pgtype.Timestamptz{Time: now, Valid: true},
	})
	if err != nil {
		return "", err
	}

	// Insert session events
	for _, event := range input.Events {
		eventType, _ := event["type"].(string)
		eventTimestamp, _ := event["timestamp"].(int64)
		if eventTimestamp == 0 {
			eventTimestamp = input.StartTS
		}

		var eventData []byte
		if data, ok := event["data"]; ok {
			eventData, _ = json.Marshal(data)
		}

		var wordID pgtype.Int4
		if wid, ok := event["word_id"].(float64); ok { // JSON numbers are float64
			wordID = pgtype.Int4{Int32: int32(wid), Valid: true}
		}

		var reactionTimeMs pgtype.Int4
		if rt, ok := event["reaction_time_ms"].(float64); ok {
			reactionTimeMs = pgtype.Int4{Int32: int32(rt), Valid: true}
		}

		err = a.queries.CreateSessionEvent(ctx, db.CreateSessionEventParams{
			SessionID:      pgtype.UUID{Bytes: sessionID, Valid: true},
			EventType:      eventType,
			EventTimestamp: eventTimestamp,
			EventData:      eventData,
			WordID:         wordID,
			ReactionTimeMs: reactionTimeMs,
		})
		if err != nil {
			// Log error but continue with other events
			continue
		}
	}

	return sessionID.String(), nil
}

// CreateSessionInput represents input for creating a session
type CreateSessionInput struct {
	ParticipantID string
	SessionIndex  *int32
	StartTS       int64
	Events        []map[string]interface{}
}
