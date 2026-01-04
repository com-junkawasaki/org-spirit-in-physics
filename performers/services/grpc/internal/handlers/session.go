package handlers

import (
	"context"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"google.golang.org/protobuf/types/known/structpb"
	"google.golang.org/protobuf/types/known/timestamppb"
	"github.com/spirit-in-physics/services/grpc/gen/proto/session/v1"
	"github.com/spirit-in-physics/services/grpc/internal/db"
)

// SessionHandler handles session service requests
type SessionHandler struct {
	queries *db.Queries
}

// NewSessionHandler creates a new SessionHandler
func NewSessionHandler(queries *db.Queries) *SessionHandler {
	return &SessionHandler{
		queries: queries,
	}
}

// GetSessions returns sessions for a participant
func (h *SessionHandler) GetSessions(
	ctx context.Context,
	req *connect.Request[sessionv1.GetSessionsRequest],
) (*connect.Response[sessionv1.GetSessionsResponse], error) {
	sessions, err := h.queries.GetSessions(ctx, req.Msg.ParticipantId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	resp := &sessionv1.GetSessionsResponse{
		Sessions: make([]*sessionv1.Session, 0, len(sessions)),
	}

	for _, s := range sessions {
		var events []*structpb.Struct
		// TODO: Parse events if needed

		uid, _ := uuid.FromBytes(s.ID.Bytes[:])

		resp.Sessions = append(resp.Sessions, &sessionv1.Session{
			Id:            uid.String(),
			ParticipantId: s.ParticipantID,
			SessionIndex:  toInt32Ptr(s.SessionIndex),
			StartTs:       s.StartTs,
			EndTs:         toInt64PtrFromInt8(s.EndTs),
			Events:        events,
			CreatedAt:     timestamppb.New(s.CreatedAt.Time),
			UpdatedAt:     timestamppb.New(s.UpdatedAt.Time),
		})
	}

	return connect.NewResponse(resp), nil
}

// CreateSession creates a new session
func (h *SessionHandler) CreateSession(
	ctx context.Context,
	req *connect.Request[sessionv1.CreateSessionRequest],
) (*connect.Response[sessionv1.CreateSessionResponse], error) {
	sessionID := uuid.New()
	now := time.Now()

	pgSessionID := pgtype.UUID{Bytes: sessionID, Valid: true}

	session, err := h.queries.CreateSession(ctx, db.CreateSessionParams{
		ID:            pgSessionID,
		ParticipantID: req.Msg.ParticipantId,
		SessionIndex:  toInt32FromOptional(req.Msg.SessionIndex),
		StartTs:       req.Msg.StartTs,
		CreatedAt:     pgtype.Timestamptz{Time: now, Valid: true},
		UpdatedAt:     pgtype.Timestamptz{Time: now, Valid: true},
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	uid, _ := uuid.FromBytes(session.ID.Bytes[:])

	resp := &sessionv1.CreateSessionResponse{
		Session: &sessionv1.Session{
			Id:            uid.String(),
			ParticipantId: session.ParticipantID,
			SessionIndex:  toInt32Ptr(session.SessionIndex),
			StartTs:       session.StartTs,
			EndTs:         toInt64PtrFromInt8(session.EndTs),
			Events:        []*structpb.Struct{},
			CreatedAt:     timestamppb.New(session.CreatedAt.Time),
			UpdatedAt:     timestamppb.New(session.UpdatedAt.Time),
		},
	}

	return connect.NewResponse(resp), nil
}

func toInt32FromOptional(i *int32) pgtype.Int4 {
	if i == nil {
		return pgtype.Int4{Valid: false}
	}
	return pgtype.Int4{Int32: *i, Valid: true}
}

func toInt64PtrFromInt8(i pgtype.Int8) *int64 {
	if i.Valid {
		val := i.Int64
		return &val
	}
	return nil
}
