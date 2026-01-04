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

func TimelineWorkflow(ctx workflow.Context, input TimelineWorkflowInput) ([]*timelinev1.TimelinePoint, error) {
	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 30 * time.Second,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var points []*timelinev1.TimelinePoint
	err := workflow.ExecuteActivity(ctx, "FetchTimelineActivity", input.ParticipantID, input.SessionID).Get(ctx, &points)
	if err != nil {
		return nil, err
	}

	return points, nil
}

func WordAggregatesWorkflow(ctx workflow.Context, input TimelineWorkflowInput) ([]*timelinev1.WordAggregate, error) {
	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 30 * time.Second,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var aggregates []*timelinev1.WordAggregate
	err := workflow.ExecuteActivity(ctx, "FetchWordAggregatesActivity", input.ParticipantID, input.SessionID).Get(ctx, &aggregates)
	if err != nil {
		return nil, err
	}
	return aggregates, nil
}

func EmotionVectorsWorkflow(ctx workflow.Context, input TimelineWorkflowInput) ([]*timelinev1.EmotionVector, error) {
	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 30 * time.Second,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var vectors []*timelinev1.EmotionVector
	err := workflow.ExecuteActivity(ctx, "FetchEmotionVectorsActivity", input.ParticipantID, input.SessionID).Get(ctx, &vectors)
	if err != nil {
		return nil, err
	}
	return vectors, nil
}

func WordStatisticsWorkflow(ctx workflow.Context, input TimelineWorkflowInput) ([]*timelinev1.WordStatistics, error) {
	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 30 * time.Second,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var statistics []*timelinev1.WordStatistics
	err := workflow.ExecuteActivity(ctx, "FetchWordStatisticsActivity", input.ParticipantID, input.SessionID).Get(ctx, &statistics)
	if err != nil {
		return nil, err
	}
	return statistics, nil
}

func VisualizationAnalysisWorkflow(ctx workflow.Context, nodes interface{}, links interface{}, emotionVectors interface{}, sessionData interface{}) (*timelinev1.GetAnalysisResponse, error) {
	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 1 * time.Minute,
		TaskQueue:           "visualization-analysis-queue",
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var result timelinev1.GetAnalysisResponse
	err := workflow.ExecuteActivity(ctx, "runStructureAnalysisActivity", nodes, links, emotionVectors, sessionData).Get(ctx, &result)
	if err != nil {
		return nil, err
	}

	return &result, nil
}

