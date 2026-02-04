package workflows

import (
	"context"
	"fmt"

	"github.com/dapr/go-sdk/workflow"
)

type OnboardingInput struct {
	Signature string `json:"signature"`
}

func OnboardingWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input OnboardingInput
	if err := ctx.GetInput(&input); err != nil {
		return nil, fmt.Errorf("failed to get input: %w", err)
	}

	// Step 1: Create Participant in DB
	if err := ctx.CallActivity(CreateParticipantActivity, workflow.ActivityInput(input)).Await(nil); err != nil {
		return nil, fmt.Errorf("failed to create participant: %w", err)
	}

	// Step 2: Setup Environment
	setupInput := SetupEnvironmentInput{ParticipantID: "some-id"}
	if err := ctx.CallActivity(SetupEnvironmentActivity, workflow.ActivityInput(setupInput)).Await(nil); err != nil {
		return nil, fmt.Errorf("failed to setup environment: %w", err)
	}

	return nil, nil
}

type SetupEnvironmentInput struct {
	ParticipantID string `json:"participant_id"`
}

// Activity stubs
func CreateParticipantActivity(ctx context.Context, input OnboardingInput) error {
	return nil
}

func SetupEnvironmentActivity(ctx context.Context, input SetupEnvironmentInput) error {
	return nil
}
