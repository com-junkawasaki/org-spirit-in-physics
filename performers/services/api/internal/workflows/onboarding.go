package workflows

import (
	"time"
	"go.temporal.io/sdk/workflow"
    "github.com/spirit-in-physics/services/grpc/internal/activities"
)

func OnboardingWorkflow(ctx workflow.Context, signature string) error {
	options := workflow.ActivityOptions{
		StartToCloseTimeout: time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var a *activities.ParticipantActivities
    
    // Step 1: Create Participant in DB
	err := workflow.ExecuteActivity(ctx, a.CreateParticipantActivity, signature).Get(ctx, nil)
    if err != nil {
        return err
    }

    // Step 2: Setup Environment
    err = workflow.ExecuteActivity(ctx, a.SetupEnvironmentActivity, "some-id").Get(ctx, nil)
	return err
}
