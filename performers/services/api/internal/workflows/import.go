package workflows

import (
	"time"

	"github.com/spirit-in-physics/services/grpc/internal/activities"
	"go.temporal.io/sdk/workflow"
)

func ImportParticipantsWorkflow(ctx workflow.Context) (int, error) {
	options := workflow.ActivityOptions{
		StartToCloseTimeout: 5 * time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities.ImportActivities
	var count int
	err := workflow.ExecuteActivity(ctx, a.ImportParticipantsActivity).Get(ctx, &count)
	return count, err
}

func ImportEmotionsWorkflow(ctx workflow.Context, participantID string) (int, error) {
	options := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities.ImportActivities
	var count int
	err := workflow.ExecuteActivity(ctx, a.ImportEmotionsActivity, participantID).Get(ctx, &count)
	return count, err
}

