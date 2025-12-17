package activities

import (
	"context"
	"time"

	"github.com/google/uuid"
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
		ID:            sessionID,
		ParticipantID: participantID,
		SessionIndex:  input.SessionIndex,
		StartTs:       input.StartTS,
		EndTs:         nil,
		CreatedAt:     now,
		UpdatedAt:     now,
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

		var eventData interface{}
		if data, ok := event["data"]; ok {
			eventData = data
		}

		var wordID *int32
		if wid, ok := event["word_id"].(int64); ok {
			w := int32(wid)
			wordID = &w
		}

		var reactionTimeMs *int32
		if rt, ok := event["reaction_time_ms"].(int64); ok {
			r := int32(rt)
			reactionTimeMs = &r
		}

		err = a.queries.CreateSessionEvent(ctx, db.CreateSessionEventParams{
			SessionID:      sessionID,
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
