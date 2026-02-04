package workflows

import (
	"context"
	"fmt"

	"github.com/dapr/go-sdk/workflow"
)

func ImportParticipantsWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var count int
	if err := ctx.CallActivity(ImportParticipantsActivity).Await(&count); err != nil {
		return nil, fmt.Errorf("failed to import participants: %w", err)
	}
	return count, nil
}

type ImportEmotionsInput struct {
	ParticipantID string `json:"participant_id"`
}

func ImportEmotionsWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input ImportEmotionsInput
	if err := ctx.GetInput(&input); err != nil {
		return nil, fmt.Errorf("failed to get input: %w", err)
	}

	var count int
	if err := ctx.CallActivity(ImportEmotionsActivity, workflow.ActivityInput(input)).Await(&count); err != nil {
		return nil, fmt.Errorf("failed to import emotions: %w", err)
	}
	return count, nil
}

// Activity stubs
func ImportParticipantsActivity(ctx context.Context) (int, error) {
	return 0, nil
}

func ImportEmotionsActivity(ctx context.Context, input ImportEmotionsInput) (int, error) {
	return 0, nil
}
