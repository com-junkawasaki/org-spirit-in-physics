package tools

import (
	"context"
	"time"

	agent "github.com/gftdcojp/dapr-agents-go"
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

func (t *ParticipantTools) GetTools() []agent.Tool {
	return []agent.Tool{
		agent.NewFuncTool(
			"create_participant",
			"Create a new participant in the system.",
			&agent.ToolSchema{
				Type: "object",
				Properties: map[string]*agent.ToolSchema{
					"participant_id": {Type: "string", Description: "Unique identifier for the participant"},
				},
				Required: []string{"participant_id"},
			},
			t.CreateParticipant,
		),
		agent.NewFuncTool(
			"get_participant",
			"Get participant details by ID.",
			&agent.ToolSchema{
				Type: "object",
				Properties: map[string]*agent.ToolSchema{
					"participant_id": {Type: "string", Description: "UUID of the participant"},
				},
				Required: []string{"participant_id"},
			},
			t.GetParticipant,
		),
		agent.NewFuncTool(
			"list_participants",
			"List all participants in the system.",
			&agent.ToolSchema{
				Type:       "object",
				Properties: map[string]*agent.ToolSchema{},
			},
			t.ListParticipants,
		),
	}
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
