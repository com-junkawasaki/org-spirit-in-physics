package activities

import (
	"context"
	"encoding/json"

	dapr "github.com/dapr/go-sdk/client"
	"github.com/spirit-in-physics/services/grpc/internal/dapr/workflows"
	timelinev1 "github.com/spirit-in-physics/services/grpc/gen/proto/timeline/v1"
)

type ServiceInvocationActivities struct {
	DaprClient dapr.Client
}

// RunVisualizationAnalysisActivity calls TypeScript service via Dapr service invocation
func (a *ServiceInvocationActivities) RunVisualizationAnalysisActivity(ctx context.Context, input workflows.VisualizationAnalysisInput) (*timelinev1.GetAnalysisResponse, error) {
	inputBytes, err := json.Marshal(input)
	if err != nil {
		return nil, err
	}

	content := &dapr.DataContent{
		ContentType: "application/json",
		Data:        inputBytes,
	}

	resp, err := a.DaprClient.InvokeMethodWithContent(ctx, "temporal-ts", "run_structure_analysis", "POST", content)
	if err != nil {
		return nil, err
	}

	var result timelinev1.GetAnalysisResponse
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

type IntegratedTimelineInput struct {
	ParticipantID string  `json:"participant_id"`
	SessionID     *string `json:"session_id,omitempty"`
}

type IntegratedTimelineResult struct {
	Points   json.RawMessage `json:"points"`
	Analysis json.RawMessage `json:"analysis"`
}

// GetIntegratedTimelineActivity calls TypeScript service for integrated timeline
func (a *ServiceInvocationActivities) GetIntegratedTimelineActivity(ctx context.Context, input IntegratedTimelineInput) (*IntegratedTimelineResult, error) {
	inputBytes, err := json.Marshal(input)
	if err != nil {
		return nil, err
	}

	content := &dapr.DataContent{
		ContentType: "application/json",
		Data:        inputBytes,
	}

	resp, err := a.DaprClient.InvokeMethodWithContent(ctx, "temporal-ts", "get_integrated_timeline", "POST", content)
	if err != nil {
		return nil, err
	}

	var result IntegratedTimelineResult
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}

	return &result, nil
}
