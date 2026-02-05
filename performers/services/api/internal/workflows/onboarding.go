package workflows

import (
	"github.com/dapr/go-sdk/workflow"
)

type OnboardingInput struct {
	Signature string `json:"signature"`
}

func OnboardingWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input OnboardingInput
	if err := ctx.GetInput(&input); err != nil {
		return nil, err
	}

	// Step 1: Create Participant in DB
	if err := ctx.CallActivity(CreateParticipantActivity, workflow.ActivityInput(input.Signature)).Await(nil); err != nil {
		return nil, err
	}

	// Step 2: Setup Environment
	if err := ctx.CallActivity(SetupEnvironmentActivity, workflow.ActivityInput("some-id")).Await(nil); err != nil {
		return nil, err
	}

	return nil, nil
}

// CreateParticipantActivity placeholder - actual implementation in activities/participant.go
func CreateParticipantActivity(ctx workflow.ActivityContext) (any, error) {
	return nil, nil
}

// SetupEnvironmentActivity placeholder - actual implementation in activities/participant.go
func SetupEnvironmentActivity(ctx workflow.ActivityContext) (any, error) {
	return nil, nil
}
