package tools

import (
	"context"

	agent "github.com/gftdcojp/dapr-agents-go"
	"github.com/spirit-in-physics/services/grpc/internal/dapr/activities"
	"github.com/spirit-in-physics/services/grpc/internal/dapr/workflows"
	"github.com/spirit-in-physics/services/grpc/internal/db"
)

type TimelineTools struct {
	Queries            *db.Queries
	TimelineActivities *activities.TimelineActivities
}

func NewTimelineTools(queries *db.Queries) *TimelineTools {
	return &TimelineTools{
		Queries:            queries,
		TimelineActivities: &activities.TimelineActivities{Queries: queries},
	}
}

func (t *TimelineTools) GetTools() []agent.Tool {
	return []agent.Tool{
		agent.NewFuncTool(
			"fetch_timeline",
			"Fetch timeline points for a participant's session. Returns time-series data including emotions, physiological readings, and reactions.",
			&agent.ToolSchema{
				Type: "object",
				Properties: map[string]*agent.ToolSchema{
					"participant_id": {Type: "string", Description: "UUID of the participant"},
					"session_id":     {Type: "string", Description: "Optional UUID of specific session"},
				},
				Required: []string{"participant_id"},
			},
			t.FetchTimeline,
		),
		agent.NewFuncTool(
			"fetch_word_aggregates",
			"Fetch aggregated statistics for each stimulus word including reaction times and physiological responses.",
			&agent.ToolSchema{
				Type: "object",
				Properties: map[string]*agent.ToolSchema{
					"participant_id": {Type: "string", Description: "UUID of the participant"},
					"session_id":     {Type: "string", Description: "Optional UUID of specific session"},
				},
				Required: []string{"participant_id"},
			},
			t.FetchWordAggregates,
		),
		agent.NewFuncTool(
			"fetch_emotion_vectors",
			"Fetch emotion vectors (10-dimensional) for each word showing emotional response patterns.",
			&agent.ToolSchema{
				Type: "object",
				Properties: map[string]*agent.ToolSchema{
					"participant_id": {Type: "string"},
					"session_id":     {Type: "string"},
				},
				Required: []string{"participant_id"},
			},
			t.FetchEmotionVectors,
		),
		agent.NewFuncTool(
			"fetch_word_statistics",
			"Fetch detailed statistics for words including mean, std, variance of reaction metrics.",
			&agent.ToolSchema{
				Type: "object",
				Properties: map[string]*agent.ToolSchema{
					"participant_id": {Type: "string"},
					"session_id":     {Type: "string"},
				},
				Required: []string{"participant_id"},
			},
			t.FetchWordStatistics,
		),
	}
}

func (t *TimelineTools) FetchTimeline(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	participantID := params["participant_id"].(string)
	sessionID := ""
	if sid, ok := params["session_id"].(string); ok {
		sessionID = sid
	}

	return t.TimelineActivities.FetchTimelineActivity(ctx, workflows.TimelineWorkflowInput{
		ParticipantID: participantID,
		SessionID:     sessionID,
	})
}

func (t *TimelineTools) FetchWordAggregates(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	participantID := params["participant_id"].(string)
	sessionID := ""
	if sid, ok := params["session_id"].(string); ok {
		sessionID = sid
	}

	return t.TimelineActivities.FetchWordAggregatesActivity(ctx, workflows.TimelineWorkflowInput{
		ParticipantID: participantID,
		SessionID:     sessionID,
	})
}

func (t *TimelineTools) FetchEmotionVectors(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	participantID := params["participant_id"].(string)
	sessionID := ""
	if sid, ok := params["session_id"].(string); ok {
		sessionID = sid
	}

	return t.TimelineActivities.FetchEmotionVectorsActivity(ctx, workflows.TimelineWorkflowInput{
		ParticipantID: participantID,
		SessionID:     sessionID,
	})
}

func (t *TimelineTools) FetchWordStatistics(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	participantID := params["participant_id"].(string)
	sessionID := ""
	if sid, ok := params["session_id"].(string); ok {
		sessionID = sid
	}

	return t.TimelineActivities.FetchWordStatisticsActivity(ctx, workflows.TimelineWorkflowInput{
		ParticipantID: participantID,
		SessionID:     sessionID,
	})
}
