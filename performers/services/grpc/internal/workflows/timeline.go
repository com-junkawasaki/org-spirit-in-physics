package workflows

import (
	"time"

	"github.com/spirit-in-physics/services/grpc/gen/proto/timeline/v1"
	"go.temporal.io/sdk/workflow"
)

type TimelineWorkflowInput struct {
	ParticipantID string
	SessionID     string
}

func TimelineWorkflow(ctx workflow.Context, input TimelineWorkflowInput) (*timelinev1.TimelineData, error) {
	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 30 * time.Second,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var points []*timelinev1.TimelineDataPoint
	err := workflow.ExecuteActivity(ctx, "FetchTimelineActivity", input.ParticipantID, input.SessionID).Get(ctx, &points)
	if err != nil {
		return nil, err
	}

	// In a real scenario, we might fetch aggregates in parallel
	// For now, let's just return the points
	return &timelinev1.TimelineData{
		TimelineData: points,
	}, nil
}

