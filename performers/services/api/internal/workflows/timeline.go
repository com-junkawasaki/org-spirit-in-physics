package workflows

import (
	"github.com/dapr/go-sdk/workflow"
	"github.com/spirit-in-physics/services/grpc/gen/proto/timeline/v1"
)

type TimelineWorkflowInput struct {
	ParticipantID string `json:"participantId"`
	SessionID     string `json:"sessionId"`
}

type TimelineWorkflowOutput struct {
	Points []*timelinev1.TimelinePoint `json:"points"`
}

func TimelineWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input TimelineWorkflowInput
	if err := ctx.GetInput(&input); err != nil {
		return nil, err
	}

	var output TimelineWorkflowOutput
	if err := ctx.CallActivity(FetchTimelineActivity, workflow.ActivityInput(input)).Await(&output); err != nil {
		return nil, err
	}

	return output.Points, nil
}

// FetchTimelineActivity is a placeholder - the actual implementation is in activities/timeline.go
func FetchTimelineActivity(ctx workflow.ActivityContext) (any, error) {
	var input TimelineWorkflowInput
	if err := ctx.GetInput(&input); err != nil {
		return nil, err
	}
	// The actual activity logic will be called via the registered activity
	return nil, nil
}
