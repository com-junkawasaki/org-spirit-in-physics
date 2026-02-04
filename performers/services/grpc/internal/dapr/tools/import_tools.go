package tools

import (
	"context"

	"github.com/gftdcojp/dapr-agents-go/tool"
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

func (t *ImportTools) RegisterTools(registry *tool.Registry) {
	registry.Register(tool.Tool{
		Name:        "import_participants",
		Description: "Import participants from the dataset directory.",
		InputSchema: map[string]interface{}{
			"type":       "object",
			"properties": map[string]interface{}{},
		},
		Handler: t.ImportParticipants,
	})

	registry.Register(tool.Tool{
		Name:        "import_emotions",
		Description: "Import emotions data for a specific participant from CSV files.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"participant_id": map[string]interface{}{
					"type":        "string",
					"description": "UUID of the participant to import emotions for",
				},
			},
			"required": []string{"participant_id"},
		},
		Handler: t.ImportEmotions,
	})
}

func (t *ImportTools) ImportParticipants(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	count, err := t.ImportActivities.ImportParticipantsActivity(ctx)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"success":          true,
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
