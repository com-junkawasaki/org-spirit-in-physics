package workflows

import (
	"time"

	"go.temporal.io/sdk/workflow"
)

// SessionWorkflow handles session-related workflows
type SessionWorkflow struct{}

// CreateSessionWorkflow creates a new session for a participant
func (w *SessionWorkflow) CreateSessionWorkflow(ctx workflow.Context, input CreateSessionInput) (string, error) {
	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * time.Second,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var sessionID string
	err := workflow.ExecuteActivity(ctx, "CreateSessionActivity", input).Get(ctx, &sessionID)
	if err != nil {
		return "", err
	}

	return sessionID, nil
}

// CreateSessionInput represents input for creating a session
type CreateSessionInput struct {
	ParticipantID string
	SessionIndex  *int32
	StartTS       int64
	Events        []map[string]interface{}
}
