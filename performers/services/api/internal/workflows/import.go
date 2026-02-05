package workflows

import (
	"github.com/dapr/go-sdk/workflow"
)

type ImportEmotionsInput struct {
	ParticipantID string `json:"participantId"`
}

type ImportResult struct {
	Count int `json:"count"`
}

func ImportParticipantsWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var result ImportResult
	if err := ctx.CallActivity(ImportParticipantsActivity, workflow.ActivityInput(nil)).Await(&result); err != nil {
		return nil, err
	}
	return result.Count, nil
}

func ImportEmotionsWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input ImportEmotionsInput
	if err := ctx.GetInput(&input); err != nil {
		return nil, err
	}

	var result ImportResult
	if err := ctx.CallActivity(ImportEmotionsActivity, workflow.ActivityInput(input.ParticipantID)).Await(&result); err != nil {
		return nil, err
	}
	return result.Count, nil
}

// ImportParticipantsActivity placeholder - actual implementation in activities/import.go
func ImportParticipantsActivity(ctx workflow.ActivityContext) (any, error) {
	return nil, nil
}

// ImportEmotionsActivity placeholder - actual implementation in activities/import.go
func ImportEmotionsActivity(ctx workflow.ActivityContext) (any, error) {
	return nil, nil
}
