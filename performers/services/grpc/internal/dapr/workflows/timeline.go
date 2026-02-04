package workflows

import (
	"context"
	"fmt"

	"github.com/dapr/go-sdk/workflow"
	timelinev1 "github.com/spirit-in-physics/services/grpc/gen/proto/timeline/v1"
)

type TimelineWorkflowInput struct {
	ParticipantID string `json:"participant_id"`
	SessionID     string `json:"session_id"`
}

func TimelineWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input TimelineWorkflowInput
	if err := ctx.GetInput(&input); err != nil {
		return nil, fmt.Errorf("failed to get input: %w", err)
	}

	var points []*timelinev1.TimelinePoint
	if err := ctx.CallActivity(FetchTimelineActivity, workflow.ActivityInput(input)).Await(&points); err != nil {
		return nil, fmt.Errorf("failed to fetch timeline: %w", err)
	}

	return points, nil
}

func WordAggregatesWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input TimelineWorkflowInput
	if err := ctx.GetInput(&input); err != nil {
		return nil, fmt.Errorf("failed to get input: %w", err)
	}

	var aggregates []*timelinev1.WordAggregate
	if err := ctx.CallActivity(FetchWordAggregatesActivity, workflow.ActivityInput(input)).Await(&aggregates); err != nil {
		return nil, fmt.Errorf("failed to fetch word aggregates: %w", err)
	}

	return aggregates, nil
}

func EmotionVectorsWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input TimelineWorkflowInput
	if err := ctx.GetInput(&input); err != nil {
		return nil, fmt.Errorf("failed to get input: %w", err)
	}

	var vectors []*timelinev1.EmotionVector
	if err := ctx.CallActivity(FetchEmotionVectorsActivity, workflow.ActivityInput(input)).Await(&vectors); err != nil {
		return nil, fmt.Errorf("failed to fetch emotion vectors: %w", err)
	}

	return vectors, nil
}

func WordStatisticsWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input TimelineWorkflowInput
	if err := ctx.GetInput(&input); err != nil {
		return nil, fmt.Errorf("failed to get input: %w", err)
	}

	var statistics []*timelinev1.WordStatistics
	if err := ctx.CallActivity(FetchWordStatisticsActivity, workflow.ActivityInput(input)).Await(&statistics); err != nil {
		return nil, fmt.Errorf("failed to fetch word statistics: %w", err)
	}

	return statistics, nil
}

type VisualizationAnalysisInput struct {
	Nodes          interface{} `json:"nodes"`
	Links          interface{} `json:"links"`
	EmotionVectors interface{} `json:"emotion_vectors"`
	SessionData    interface{} `json:"session_data"`
}

func VisualizationAnalysisWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input VisualizationAnalysisInput
	if err := ctx.GetInput(&input); err != nil {
		return nil, fmt.Errorf("failed to get input: %w", err)
	}

	// This workflow calls TypeScript service via Dapr service invocation
	var result timelinev1.GetAnalysisResponse
	if err := ctx.CallActivity(RunVisualizationAnalysisActivity, workflow.ActivityInput(input)).Await(&result); err != nil {
		return nil, fmt.Errorf("failed to run visualization analysis: %w", err)
	}

	return &result, nil
}

// Activity stubs - actual implementations will be in activities package
func FetchTimelineActivity(ctx context.Context, input TimelineWorkflowInput) ([]*timelinev1.TimelinePoint, error) {
	return nil, nil
}

func FetchWordAggregatesActivity(ctx context.Context, input TimelineWorkflowInput) ([]*timelinev1.WordAggregate, error) {
	return nil, nil
}

func FetchEmotionVectorsActivity(ctx context.Context, input TimelineWorkflowInput) ([]*timelinev1.EmotionVector, error) {
	return nil, nil
}

func FetchWordStatisticsActivity(ctx context.Context, input TimelineWorkflowInput) ([]*timelinev1.WordStatistics, error) {
	return nil, nil
}

func RunVisualizationAnalysisActivity(ctx context.Context, input VisualizationAnalysisInput) (*timelinev1.GetAnalysisResponse, error) {
	return nil, nil
}
