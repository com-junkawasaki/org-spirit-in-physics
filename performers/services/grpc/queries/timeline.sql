-- name: GetTimelinePoints :many
SELECT 
    tp.time,
    tp.participant_id,
    tp.session_id,
    tp.word,
    tp.event_type,
    tp.reaction_value,
    tp.reaction_time,
    tp.has_response,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'name', tee.emotion_name::text,
                'score', tee.score,
                'fileType', tee.file_type::text
            )
        ) FILTER (WHERE tee.id IS NOT NULL),
        '[]'::json
    ) as emotions,
    COALESCE(
        json_agg(
            jsonb_build_object(
                'measurement_type', pm.measurement_type::text,
                'value', pm.value,
                'unit', COALESCE(pm.unit::text, 'unknown'),
                'timestamp', tp.time::text
            )
        ) FILTER (WHERE pm.id IS NOT NULL),
        '[]'::json
    ) as physiological
FROM timeline_points tp
LEFT JOIN timeline_emotion_entries tee ON 
    tee.timeline_point_time = tp.time AND
    tee.timeline_point_participant_id = tp.participant_id AND
    tee.timeline_point_session_id = tp.session_id
LEFT JOIN physiological_measurements pm ON
    pm.timeline_point_time = tp.time AND
    pm.timeline_point_participant_id = tp.participant_id AND
    pm.timeline_point_session_id = tp.session_id
WHERE tp.participant_id = $1
    AND ($2::uuid IS NULL OR tp.session_id = $2)
    AND ($3::timestamptz IS NULL OR tp.time >= $3)
    AND ($4::timestamptz IS NULL OR tp.time <= $4)
GROUP BY tp.time, tp.participant_id, tp.session_id, tp.word, tp.event_type, tp.reaction_value, tp.reaction_time, tp.has_response
ORDER BY tp.time ASC
LIMIT 20000;

-- name: GetTimelinePointsWithPublicCheck :many
SELECT 
    tp.time,
    tp.participant_id,
    tp.session_id,
    tp.word,
    tp.event_type,
    tp.reaction_value,
    tp.reaction_time,
    tp.has_response,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'name', tee.emotion_name::text,
                'score', tee.score,
                'fileType', tee.file_type::text
            )
        ) FILTER (WHERE tee.id IS NOT NULL),
        '[]'::json
    ) as emotions,
    COALESCE(
        json_agg(
            jsonb_build_object(
                'measurement_type', pm.measurement_type::text,
                'value', pm.value,
                'unit', COALESCE(pm.unit::text, 'unknown'),
                'timestamp', tp.time::text
            )
        ) FILTER (WHERE pm.id IS NOT NULL),
        '[]'::json
    ) as physiological
FROM timeline_points tp
INNER JOIN participants p ON p.id = tp.participant_id
LEFT JOIN timeline_emotion_entries tee ON 
    tee.timeline_point_time = tp.time AND
    tee.timeline_point_participant_id = tp.participant_id AND
    tee.timeline_point_session_id = tp.session_id
LEFT JOIN physiological_measurements pm ON
    pm.timeline_point_time = tp.time AND
    pm.timeline_point_participant_id = tp.participant_id AND
    pm.timeline_point_session_id = tp.session_id
WHERE tp.participant_id = $1 AND p.is_public = true
    AND ($2::uuid IS NULL OR tp.session_id = $2)
    AND ($3::timestamptz IS NULL OR tp.time >= $3)
    AND ($4::timestamptz IS NULL OR tp.time <= $4)
GROUP BY tp.time, tp.participant_id, tp.session_id, tp.word, tp.event_type, tp.reaction_value, tp.reaction_time, tp.has_response
ORDER BY tp.time ASC
LIMIT 20000;

-- name: GetWordAggregates :many
SELECT 
    participant_id,
    session_id,
    word,
    count,
    avg_reaction_value,
    sum_reaction_value,
    avg_reaction_time,
    sum_reaction_time,
    avg_physiological,
    sum_phys_abs,
    phys_series,
    rt_series,
    rv_series,
    first_time,
    last_time
FROM timeline_word_aggregates_by_session
WHERE participant_id = $1
    AND ($2::uuid IS NULL OR session_id = $2)
ORDER BY word ASC;

-- name: GetEmotionVectors :many
SELECT 
    participant_id,
    session_id,
    word,
    joy_sum,
    sadness_sum,
    anger_sum,
    fear_sum,
    surprise_sum,
    disgust_sum,
    calm_sum,
    focus_sum,
    excitement_sum,
    confusion_sum,
    emotion_entry_count,
    emotion_by_modality
FROM timeline_emotion_vectors_by_word
WHERE participant_id = $1
    AND ($2::uuid IS NULL OR session_id = $2)
ORDER BY word ASC;

-- name: GetWordStatistics :many
SELECT 
    participant_id,
    session_id,
    word,
    count,
    avg_reaction_time,
    std_reaction_time,
    var_reaction_time,
    avg_reaction_value,
    std_reaction_value,
    var_reaction_value,
    avg_physiological,
    std_physiological,
    var_physiological,
    speed_index,
    phys_series,
    rt_series
FROM timeline_word_statistics_by_session
WHERE participant_id = $1
    AND ($2::uuid IS NULL OR session_id = $2)
ORDER BY word ASC;

-- name: CreateTimelinePoint :exec
INSERT INTO timeline_points (time, participant_id, session_id, word, event_type, reaction_value, reaction_time, has_response)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (time, participant_id, session_id) DO NOTHING;

-- name: CreateTimelineEmotionEntry :exec
INSERT INTO timeline_emotion_entries (timeline_point_time, timeline_point_participant_id, timeline_point_session_id, emotion_name, score, file_type)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: CreatePhysiologicalMeasurement :exec
INSERT INTO physiological_measurements (timeline_point_time, timeline_point_participant_id, timeline_point_session_id, measurement_type, value, unit)
VALUES ($1, $2, $3, $4, $5, $6);
