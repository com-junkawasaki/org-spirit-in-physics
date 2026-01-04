package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/spirit_in_physics"
	}

	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer conn.Close(context.Background())

	ddls := []string{
		`CREATE MATERIALIZED VIEW timeline_word_aggregates_by_session AS
SELECT
    tp.participant_id,
    tp.session_id,
    tp.word,
    COUNT(*) as count,
    AVG(tp.reaction_value) as avg_reaction_value,
    SUM(tp.reaction_value) as sum_reaction_value,
    AVG(tp.reaction_time) as avg_reaction_time,
    SUM(tp.reaction_time) as sum_reaction_time,
    AVG(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
    ) as avg_physiological,
    SUM(
        (SELECT ABS(AVG(pm.value))
         FROM physiological_measurements pm
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
    ) as sum_phys_abs,
    ARRAY_AGG(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
        ORDER BY tp.time
    ) FILTER (WHERE EXISTS (
        SELECT 1 FROM physiological_measurements pm
        WHERE pm.timeline_point_time = tp.time
          AND pm.timeline_point_participant_id = tp.participant_id
          AND pm.timeline_point_session_id = tp.session_id
    )) as phys_series,
    ARRAY_AGG(tp.reaction_time ORDER BY tp.time) FILTER (WHERE tp.reaction_time IS NOT NULL) as rt_series,
    ARRAY_AGG(tp.reaction_value ORDER BY tp.time) FILTER (WHERE tp.reaction_value IS NOT NULL) as rv_series,
    MIN(tp.time) as first_time,
    MAX(tp.time) as last_time
FROM timeline_points tp
WHERE tp.word IS NOT NULL
GROUP BY tp.participant_id, tp.session_id, tp.word;`,
		`CREATE MATERIALIZED VIEW timeline_emotion_vectors_by_word AS
SELECT
    tp.participant_id,
    tp.session_id,
    tp.word,
    SUM(CASE WHEN tee.emotion_name::text = 'joy' THEN tee.score ELSE 0 END) as joy_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'sadness' THEN tee.score ELSE 0 END) as sadness_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'anger' THEN tee.score ELSE 0 END) as anger_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'fear' THEN tee.score ELSE 0 END) as fear_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'surprise' THEN tee.score ELSE 0 END) as surprise_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'disgust' THEN tee.score ELSE 0 END) as disgust_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'calm' THEN tee.score ELSE 0 END) as calm_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'focus' THEN tee.score ELSE 0 END) as focus_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'excitement' THEN tee.score ELSE 0 END) as excitement_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'confusion' THEN tee.score ELSE 0 END) as confusion_sum,
    COUNT(tee.id) as emotion_entry_count,
    COALESCE(
        (SELECT json_object_agg(file_type, emotions_json)
         FROM (
           SELECT
             tee2.file_type::text as file_type,
             json_agg(
               json_build_object(
                 'name', tee2.emotion_name::text,
                 'score', tee2.score
               )
             ) as emotions_json
           FROM timeline_emotion_entries tee2
           WHERE tee2.timeline_point_participant_id = tp.participant_id
           AND tee2.timeline_point_session_id = tp.session_id
           AND EXISTS (
             SELECT 1 FROM timeline_points tp2
             WHERE tp2.participant_id = tee2.timeline_point_participant_id
             AND tp2.session_id = tee2.timeline_point_session_id
             AND tp2.time = tee2.timeline_point_time
             AND tp2.word = tp.word
           )
           GROUP BY tee2.file_type
         ) subq),
        '{}'::json
    ) as emotion_by_modality
FROM timeline_points tp
LEFT JOIN timeline_emotion_entries tee ON
    tee.timeline_point_time = tp.time AND
    tee.timeline_point_participant_id = tp.participant_id AND
    tee.timeline_point_session_id = tp.session_id
WHERE tp.word IS NOT NULL
GROUP BY tp.participant_id, tp.session_id, tp.word;`,
		`CREATE MATERIALIZED VIEW timeline_word_statistics_by_session AS
SELECT
    tp.participant_id,
    tp.session_id,
    tp.word,
    COUNT(*) as count,
    AVG(tp.reaction_time) as avg_reaction_time,
    STDDEV(tp.reaction_time) as std_reaction_time,
    VARIANCE(tp.reaction_time) as var_reaction_time,
    AVG(tp.reaction_value) as avg_reaction_value,
    STDDEV(tp.reaction_value) as std_reaction_value,
    VARIANCE(tp.reaction_value) as var_reaction_value,
    AVG(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
    ) as avg_physiological,
    STDDEV(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
    ) as std_physiological,
    VARIANCE(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
    ) as var_physiological,
    CASE
        WHEN AVG(tp.reaction_time) > 0 THEN 1.0 / AVG(tp.reaction_time)
        ELSE 0
    END as speed_index,
    ARRAY_AGG(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
        ORDER BY tp.time
    ) FILTER (WHERE EXISTS (
        SELECT 1 FROM physiological_measurements pm
        WHERE pm.timeline_point_time = tp.time
          AND pm.timeline_point_participant_id = tp.participant_id
          AND pm.timeline_point_session_id = tp.session_id
    )) as phys_series,
    ARRAY_AGG(tp.reaction_time ORDER BY tp.time) FILTER (WHERE tp.reaction_time IS NOT NULL) as rt_series
FROM timeline_points tp
WHERE tp.word IS NOT NULL
GROUP BY tp.participant_id, tp.session_id, tp.word;`,
	}

	for _, ddl := range ddls {
		fmt.Printf("Executing DDL...\n")
		_, err := conn.Exec(context.Background(), ddl)
		if err != nil {
			fmt.Printf("Error: %v\n", err)
		}
	}

	fmt.Println("Materialized views recreated successfully")
}

