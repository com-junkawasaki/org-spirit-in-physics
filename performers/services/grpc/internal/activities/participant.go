package activities

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/spirit-in-physics/services/grpc/internal/db"
)

// ParticipantActivities handles participant-related activities
type ParticipantActivities struct {
	queries *db.Queries
}

// NewParticipantActivities creates a new ParticipantActivities instance
func NewParticipantActivities(queries *db.Queries) *ParticipantActivities {
	return &ParticipantActivities{
		queries: queries,
	}
}

// CreateParticipantActivity creates a new participant in the database
func (a *ParticipantActivities) CreateParticipantActivity(ctx context.Context, input CreateParticipantInput) (string, error) {
	participantID := uuid.New()
	if input.ID != nil {
		var err error
		participantID, err = uuid.Parse(*input.ID)
		if err != nil {
			return "", err
		}
	}

	isPublic := true
	if input.IsPublic != nil {
		isPublic = *input.IsPublic
	}

	now := time.Now()
	_, err := a.queries.CreateParticipant(ctx, db.CreateParticipantParams{
		ID:        participantID,
		IsPublic:  isPublic,
		CreatedAt: now,
		UpdatedAt: now,
	})
	if err != nil {
		return "", err
	}

	return participantID.String(), nil
}

// CreateParticipantInput represents input for creating a participant
type CreateParticipantInput struct {
	ID         *string
	Signature  string
	Agreements map[string]interface{}
	AgreedAt   time.Time
	IsPublic   *bool
}
