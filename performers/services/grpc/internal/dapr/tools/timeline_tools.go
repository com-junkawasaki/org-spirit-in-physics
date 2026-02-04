package tools

import (
	"context"

	"github.com/gftdcojp/dapr-agents-go/tool"
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

func (t *TimelineTools) RegisterTools(registry *tool.Registry) {
	registry.Register(tool.Tool{
		Name:        "fetch_timeline",
		Description: "Fetch timeline points for a participant's session. Returns time-series data including emotions, physiological readings, and reactions.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"participant_id": map[string]interface{}{
					"type":        "string",
					"description": "UUID of the participant",
				},
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "Optional UUID of specific session",
				},
			},
			"required": []string{"participant_id"},
		},
		Handler: t.FetchTimeline,
	})

	registry.Register(tool.Tool{
		Name:        "fetch_word_aggregates",
		Description: "Fetch aggregated statistics for each stimulus word including reaction times and physiological responses.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"participant_id": map[string]interface{}{
					"type":        "string",
					"description": "UUID of the participant",
				},
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "Optional UUID of specific session",
				},
			},
			"required": []string{"participant_id"},
		},
		Handler: t.FetchWordAggregates,
	})

	registry.Register(tool.Tool{
		Name:        "fetch_emotion_vectors",
		Description: "Fetch emotion vectors (10-dimensional) for each word showing emotional response patterns.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"participant_id": map[string]interface{}{"type": "string"},
				"session_id":     map[string]interface{}{"type": "string"},
			},
			"required": []string{"participant_id"},
		},
		Handler: t.FetchEmotionVectors,
	})

	registry.Register(tool.Tool{
		Name:        "fetch_word_statistics",
		Description: "Fetch detailed statistics for words including mean, std, variance of reaction metrics.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"participant_id": map[string]interface{}{"type": "string"},
				"session_id":     map[string]interface{}{"type": "string"},
			},
			"required": []string{"participant_id"},
		},
		Handler: t.FetchWordStatistics,
	})
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
