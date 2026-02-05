package workflows

import (
	"time"

	"github.com/dapr/go-sdk/workflow"
)

// CreateParticipantInput represents input for creating a participant
type CreateParticipantInput struct {
	ID         *string                `json:"id"`
	Signature  string                 `json:"signature"`
	Agreements map[string]interface{} `json:"agreements"`
	AgreedAt   time.Time              `json:"agreedAt"`
	IsPublic   *bool                  `json:"isPublic"`
}

// CreateParticipantWorkflow creates a new participant with consent data
func CreateParticipantWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input CreateParticipantInput
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}

	var participantID string
	if err := ctx.CallActivity(CreateParticipantDBActivity, workflow.ActivityInput(input)).Await(&participantID); err != nil {
		return "", err
	}

	return participantID, nil
}

// CreateParticipantDBActivity placeholder - actual implementation in activities
func CreateParticipantDBActivity(ctx workflow.ActivityContext) (any, error) {
	return "", nil
}
