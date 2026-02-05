package workflows

import (
	"time"

	"go.temporal.io/sdk/workflow"
)

// ParticipantWorkflow handles participant-related workflows
type ParticipantWorkflow struct{}

// CreateParticipantWorkflow creates a new participant with consent data
func (w *ParticipantWorkflow) CreateParticipantWorkflow(ctx workflow.Context, input CreateParticipantInput) (string, error) {
	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * time.Second,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var participantID string
	err := workflow.ExecuteActivity(ctx, "CreateParticipantActivity", input).Get(ctx, &participantID)
	if err != nil {
		return "", err
	}

	return participantID, nil
}

// CreateParticipantInput represents input for creating a participant
type CreateParticipantInput struct {
	ID         *string
	Signature  string
	Agreements map[string]interface{}
	AgreedAt   time.Time
	IsPublic   *bool
}
