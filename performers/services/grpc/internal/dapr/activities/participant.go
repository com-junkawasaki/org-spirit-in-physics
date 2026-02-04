package activities

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/spirit-in-physics/services/grpc/internal/dapr/workflows"
	"github.com/spirit-in-physics/services/grpc/internal/db"
)

type ParticipantActivities struct {
	Queries *db.Queries
}

func (a *ParticipantActivities) CreateParticipantActivity(ctx context.Context, input workflows.OnboardingInput) error {
	now := time.Now()
	_, err := a.Queries.CreateParticipant(ctx, db.CreateParticipantParams{
		ID:        input.Signature,
		IsPublic:  pgtype.Bool{Bool: true, Valid: true},
		CreatedAt: pgtype.Timestamptz{Time: now, Valid: true},
		UpdatedAt: pgtype.Timestamptz{Time: now, Valid: true},
	})
	return err
}

func (a *ParticipantActivities) SetupEnvironmentActivity(ctx context.Context, input workflows.SetupEnvironmentInput) error {
	// Simulated initial setup step
	time.Sleep(100 * time.Millisecond)
	return nil
}
