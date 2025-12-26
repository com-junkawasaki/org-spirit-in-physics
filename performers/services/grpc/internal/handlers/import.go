package handlers

import (
	"context"
	"github.com/spirit-in-physics/services/grpc/gen/proto/import/v1"
	"github.com/spirit-in-physics/services/grpc/internal/db"
	"connectrpc.com/connect"
)

type ImportHandler struct {
	queries *db.Queries
}

func NewImportHandler(queries *db.Queries) *ImportHandler {
	return &ImportHandler{
		queries: queries,
	}
}

func (h *ImportHandler) ImportParticipants(
	ctx context.Context,
	req *connect.Request[importv1.ImportParticipantsRequest],
) (*connect.Response[importv1.ImportParticipantsResponse], error) {
	return connect.NewResponse(&importv1.ImportParticipantsResponse{
		Success: true,
		Total: 0,
		Processed: 0,
	}), nil
}

func (h *ImportHandler) ImportSessions(
	ctx context.Context,
	req *connect.Request[importv1.ImportSessionsRequest],
) (*connect.Response[importv1.ImportSessionsResponse], error) {
	return connect.NewResponse(&importv1.ImportSessionsResponse{
		Success: true,
		Total: 0,
		Processed: 0,
	}), nil
}

func (h *ImportHandler) ImportEmotions(
	ctx context.Context,
	req *connect.Request[importv1.ImportEmotionsRequest],
) (*connect.Response[importv1.ImportEmotionsResponse], error) {
	return connect.NewResponse(&importv1.ImportEmotionsResponse{
		Success: true,
		Total: 0,
		Processed: 0,
	}), nil
}

func (h *ImportHandler) ImportTimeline(
	ctx context.Context,
	req *connect.Request[importv1.ImportTimelineRequest],
) (*connect.Response[importv1.ImportTimelineResponse], error) {
	return connect.NewResponse(&importv1.ImportTimelineResponse{
		Success: true,
		Total: 0,
		Processed: 0,
	}), nil
}
