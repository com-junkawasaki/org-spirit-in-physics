package tools

import (
	"context"
	"time"

	"github.com/gftdcojp/dapr-agents-go/tool"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/spirit-in-physics/services/grpc/internal/db"
)

type ParticipantTools struct {
	Queries *db.Queries
}

func NewParticipantTools(queries *db.Queries) *ParticipantTools {
	return &ParticipantTools{
		Queries: queries,
	}
}

func (t *ParticipantTools) RegisterTools(registry *tool.Registry) {
	registry.Register(tool.Tool{
		Name:        "create_participant",
		Description: "Create a new participant in the system.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"participant_id": map[string]interface{}{
					"type":        "string",
					"description": "Unique identifier for the participant",
				},
			},
			"required": []string{"participant_id"},
		},
		Handler: t.CreateParticipant,
	})

	registry.Register(tool.Tool{
		Name:        "get_participant",
		Description: "Get participant details by ID.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"participant_id": map[string]interface{}{
					"type":        "string",
					"description": "UUID of the participant",
				},
			},
			"required": []string{"participant_id"},
		},
		Handler: t.GetParticipant,
	})

	registry.Register(tool.Tool{
		Name:        "list_participants",
		Description: "List all participants in the system.",
		InputSchema: map[string]interface{}{
			"type":       "object",
			"properties": map[string]interface{}{},
		},
		Handler: t.ListParticipants,
	})
}

func (t *ParticipantTools) CreateParticipant(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	participantID := params["participant_id"].(string)
	now := time.Now()

	_, err := t.Queries.CreateParticipant(ctx, db.CreateParticipantParams{
		ID:        participantID,
		IsPublic:  pgtype.Bool{Bool: true, Valid: true},
		CreatedAt: pgtype.Timestamptz{Time: now, Valid: true},
		UpdatedAt: pgtype.Timestamptz{Time: now, Valid: true},
	})
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"success":        true,
		"participant_id": participantID,
	}, nil
}

func (t *ParticipantTools) GetParticipant(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	participantID := params["participant_id"].(string)
	return t.Queries.GetParticipant(ctx, participantID)
}

func (t *ParticipantTools) ListParticipants(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	return t.Queries.ListParticipants(ctx)
}
