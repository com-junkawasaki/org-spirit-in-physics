-- name: GetSessions :many
SELECT 
    s.id,
    s.participant_id,
    s.session_index,
    s.start_ts,
    s.end_ts,
    s.created_at,
    s.updated_at,
    COALESCE(
        json_agg(
            jsonb_build_object(
                'type', se.event_type::text,
                'timestamp', se.event_timestamp,
                'data', se.event_data,
                'word_id', se.word_id,
                'reaction_time_ms', se.reaction_time_ms
            )
        ) FILTER (WHERE se.id IS NOT NULL),
        '[]'::json
    ) as events
FROM sessions s
LEFT JOIN session_events se ON se.session_id = s.id
WHERE s.participant_id = $1
GROUP BY s.id, s.participant_id, s.session_index, s.start_ts, s.end_ts, s.created_at, s.updated_at
ORDER BY s.session_index ASC;

-- name: GetSessionsWithPublicCheck :many
SELECT 
    s.id,
    s.participant_id,
    s.session_index,
    s.start_ts,
    s.end_ts,
    s.created_at,
    s.updated_at,
    COALESCE(
        json_agg(
            jsonb_build_object(
                'type', se.event_type::text,
                'timestamp', se.event_timestamp,
                'data', se.event_data,
                'word_id', se.word_id,
                'reaction_time_ms', se.reaction_time_ms
            )
        ) FILTER (WHERE se.id IS NOT NULL),
        '[]'::json
    ) as events
FROM sessions s
INNER JOIN participants p ON p.id = s.participant_id
LEFT JOIN session_events se ON se.session_id = s.id
WHERE s.participant_id = $1 AND p.is_public = true
GROUP BY s.id, s.participant_id, s.session_index, s.start_ts, s.end_ts, s.created_at, s.updated_at
ORDER BY s.session_index ASC;

-- name: CreateSession :one
INSERT INTO sessions (id, participant_id, session_index, start_ts, end_ts, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: CreateSessionEvent :exec
INSERT INTO session_events (session_id, event_type, event_timestamp, event_data, word_id, reaction_time_ms)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT DO NOTHING;
