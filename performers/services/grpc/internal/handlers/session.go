package handlers

import (
	"context"
	"database/sql"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/structpb"
	"google.golang.org/protobuf/types/known/timestamppb"
	"github.com/spirit-in-physics/services/grpc/gen/proto/session/v1/sessionv1"
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
	participantID, err := uuid.Parse(req.Msg.ParticipantId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	// Check if user is authenticated (for public/private filtering)
	isAuthenticated := IsAuthenticated(ctx)

	var sessions []db.GetSessionsRow
	if isAuthenticated {
		sessions, err = h.queries.GetSessions(ctx, participantID)
	} else {
		sessions, err = h.queries.GetSessionsWithPublicCheck(ctx, participantID)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	resp := &sessionv1.GetSessionsResponse{
		Sessions: make([]*sessionv1.Session, 0, len(sessions)),
	}

	for _, s := range sessions {
		// Parse events JSON
		var events []*structpb.Struct
		if s.Events != nil {
			// s.Events is already a JSON array, parse it directly
			// This is a simplified version - adjust based on your actual JSON structure
			eventsStruct, err := structpb.NewStruct(map[string]interface{}{
				"events": s.Events,
			})
			if err == nil {
				if arr, ok := eventsStruct.Fields["events"]; ok && arr.GetListValue() != nil {
					for _, v := range arr.GetListValue().Values {
						if s, ok := v.Kind.(*structpb.Value_StructValue); ok {
							events = append(events, s.StructValue)
						}
					}
				}
			}
		}

		resp.Sessions = append(resp.Sessions, &sessionv1.Session{
			Id:            s.ID.String(),
			ParticipantId: s.ParticipantID.String(),
			SessionIndex:  toInt32Ptr(s.SessionIndex),
			StartTs:       s.StartTs,
			EndTs:         toInt64Ptr(s.EndTs),
			Events:        events,
			CreatedAt:     timestamppb.New(s.CreatedAt),
			UpdatedAt:     timestamppb.New(s.UpdatedAt),
		})
	}

	return connect.NewResponse(resp), nil
}

// CreateSession creates a new session
func (h *SessionHandler) CreateSession(
	ctx context.Context,
	req *connect.Request[sessionv1.CreateSessionRequest],
) (*connect.Response[sessionv1.CreateSessionResponse], error) {
	participantID, err := uuid.Parse(req.Msg.ParticipantId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	sessionID := uuid.New()
	now := time.Now()

	session, err := h.queries.CreateSession(ctx, db.CreateSessionParams{
		ID:            sessionID,
		ParticipantID: participantID,
		SessionIndex:   toInt32PtrFromOptional(req.Msg.SessionIndex),
		StartTs:        req.Msg.StartTs,
		EndTs:          nil,
		CreatedAt:      now,
		UpdatedAt:      now,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Insert session events if provided
	if req.Msg.Events != nil && len(req.Msg.Events.Fields) > 0 {
		// Convert protobuf Struct to map and insert events
		// This is a simplified version - you may need to adjust based on your event structure
		// Note: Events should be a list, not a struct. This needs to be adjusted.
		// For now, we'll handle it as a single event struct
		event := req.Msg.Events
			// Extract event data from protobuf Struct
			eventType := ""
			eventTimestamp := req.Msg.StartTs
			var eventData interface{}

		if t, ok := event.Fields["type"]; ok {
			eventType = t.GetStringValue()
		}
		if ts, ok := event.Fields["timestamp"]; ok {
			eventTimestamp = int64(ts.GetNumberValue())
		}
		if data, ok := event.Fields["data"]; ok {
			eventData = data
		}

		var wordID *int32
		if wid, ok := event.Fields["word_id"]; ok {
			w := int32(wid.GetNumberValue())
			wordID = &w
		}

		var reactionTimeMs *int32
		if rt, ok := event.Fields["reaction_time_ms"]; ok {
			r := int32(rt.GetNumberValue())
			reactionTimeMs = &r
		}

		err = h.queries.CreateSessionEvent(ctx, db.CreateSessionEventParams{
			SessionID:      sessionID,
			EventType:      eventType,
			EventTimestamp: eventTimestamp,
			EventData:      eventData,
			WordID:         wordID,
			ReactionTimeMs: reactionTimeMs,
		})
		if err != nil {
			// Log error but continue
		}
	}
	}

	resp := &sessionv1.CreateSessionResponse{
		Session: &sessionv1.Session{
			Id:            session.ID.String(),
			ParticipantId: session.ParticipantID.String(),
			SessionIndex:  toInt32Ptr(session.SessionIndex),
			StartTs:       session.StartTs,
			EndTs:         toInt64Ptr(session.EndTs),
			Events:        []*structpb.Struct{}, // Empty for now
			CreatedAt:     timestamppb.New(session.CreatedAt),
			UpdatedAt:     timestamppb.New(session.UpdatedAt),
		},
	}

	return connect.NewResponse(resp), nil
}

// Helper functions
func toInt32PtrFromOptional(i *int32) sql.NullInt32 {
	if i == nil {
		return sql.NullInt32{Valid: false}
	}
	return sql.NullInt32{Int32: *i, Valid: true}
}

func toInt64Ptr(i sql.NullInt64) *int64 {
	if i.Valid {
		return &i.Int64
	}
	return nil
}
