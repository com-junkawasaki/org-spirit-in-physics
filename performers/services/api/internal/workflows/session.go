package workflows

import (
	"github.com/dapr/go-sdk/workflow"
)

// CreateSessionInput represents input for creating a session
type CreateSessionInput struct {
	ParticipantID string                   `json:"participantId"`
	SessionIndex  *int32                   `json:"sessionIndex"`
	StartTS       int64                    `json:"startTs"`
	Events        []map[string]interface{} `json:"events"`
}

// CreateSessionWorkflow creates a new session for a participant
func CreateSessionWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input CreateSessionInput
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}

	var sessionID string
	if err := ctx.CallActivity(CreateSessionActivity, workflow.ActivityInput(input)).Await(&sessionID); err != nil {
		return "", err
	}

	return sessionID, nil
}

// CreateSessionActivity placeholder - actual implementation in activities
func CreateSessionActivity(ctx workflow.ActivityContext) (any, error) {
	return "", nil
}
