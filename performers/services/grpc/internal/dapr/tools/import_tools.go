package tools

import (
	"context"

	agent "github.com/gftdcojp/dapr-agents-go"
	"github.com/spirit-in-physics/services/grpc/internal/dapr/activities"
	"github.com/spirit-in-physics/services/grpc/internal/dapr/workflows"
	"github.com/spirit-in-physics/services/grpc/internal/db"
)

type ImportTools struct {
	Queries          *db.Queries
	ImportActivities *activities.ImportActivities
}

func NewImportTools(queries *db.Queries) *ImportTools {
	return &ImportTools{
		Queries:          queries,
		ImportActivities: &activities.ImportActivities{Queries: queries},
	}
}

func (t *ImportTools) GetTools() []agent.Tool {
	return []agent.Tool{
		agent.NewFuncTool(
			"import_participants",
			"Import participants from the dataset directory.",
			&agent.ToolSchema{
				Type:       "object",
				Properties: map[string]*agent.ToolSchema{},
			},
			t.ImportParticipants,
		),
		agent.NewFuncTool(
			"import_emotions",
			"Import emotions data for a specific participant from CSV files.",
			&agent.ToolSchema{
				Type: "object",
				Properties: map[string]*agent.ToolSchema{
					"participant_id": {Type: "string", Description: "UUID of the participant to import emotions for"},
				},
				Required: []string{"participant_id"},
			},
			t.ImportEmotions,
		),
	}
}

func (t *ImportTools) ImportParticipants(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	count, err := t.ImportActivities.ImportParticipantsActivity(ctx)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"success":            true,
		"participants_count": count,
	}, nil
}

func (t *ImportTools) ImportEmotions(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	participantID := params["participant_id"].(string)

	count, err := t.ImportActivities.ImportEmotionsActivity(ctx, workflows.ImportEmotionsInput{
		ParticipantID: participantID,
	})
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"success":        true,
		"emotions_count": count,
	}, nil
}
