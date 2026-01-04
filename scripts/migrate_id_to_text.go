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
		"DROP MATERIALIZED VIEW IF EXISTS timeline_daily CASCADE",
		"DROP MATERIALIZED VIEW IF EXISTS timeline_hourly CASCADE",
		"DROP VIEW IF EXISTS participant_detail CASCADE",
		"DROP VIEW IF EXISTS participant_summary CASCADE",
		"DROP VIEW IF EXISTS session_detail CASCADE",
		"DROP MATERIALIZED VIEW IF EXISTS timeline_word_statistics_by_session CASCADE",
		"DROP MATERIALIZED VIEW IF EXISTS timeline_emotion_vectors_by_word CASCADE",
		"DROP MATERIALIZED VIEW IF EXISTS timeline_word_aggregates_by_session CASCADE",
		
		"ALTER TABLE timeline_emotion_entries DROP CONSTRAINT IF EXISTS timeline_emotion_entries_timeline_point_time_fkey",
		"ALTER TABLE physiological_measurements DROP CONSTRAINT IF EXISTS physiological_measurements_timeline_point_time_fkey",
		"ALTER TABLE timeline_points DROP CONSTRAINT IF EXISTS timeline_points_pkey CASCADE",
		"ALTER TABLE timeline_points DROP CONSTRAINT IF EXISTS timeline_points_participant_id_fkey",
		"ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_participant_id_session_index_key",
		"ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_participant_id_fkey",
		"ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_pkey CASCADE",
		
		"ALTER TABLE participants ALTER COLUMN id TYPE TEXT USING id::TEXT",
		"ALTER TABLE sessions ALTER COLUMN participant_id TYPE TEXT USING participant_id::TEXT",
		"ALTER TABLE timeline_points ALTER COLUMN participant_id TYPE TEXT USING participant_id::TEXT",
		"ALTER TABLE timeline_emotion_entries ALTER COLUMN timeline_point_participant_id TYPE TEXT USING timeline_point_participant_id::TEXT",
		"ALTER TABLE physiological_measurements ALTER COLUMN timeline_point_participant_id TYPE TEXT USING timeline_point_participant_id::TEXT",
		
		"ALTER TABLE participants ADD PRIMARY KEY (id)",
		"ALTER TABLE sessions ADD CONSTRAINT sessions_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE",
		"ALTER TABLE sessions ADD CONSTRAINT sessions_participant_id_session_index_key UNIQUE (participant_id, session_index)",
		"ALTER TABLE timeline_points ADD PRIMARY KEY (time, participant_id, session_id)",
		"ALTER TABLE timeline_points ADD CONSTRAINT timeline_points_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE",
		"ALTER TABLE timeline_emotion_entries ADD CONSTRAINT timeline_emotion_entries_timeline_point_time_fkey FOREIGN KEY (timeline_point_time, timeline_point_participant_id, timeline_point_session_id) REFERENCES timeline_points(time, participant_id, session_id) ON DELETE CASCADE",
		"ALTER TABLE physiological_measurements ADD CONSTRAINT physiological_measurements_timeline_point_time_fkey FOREIGN KEY (timeline_point_time, timeline_point_participant_id, timeline_point_session_id) REFERENCES timeline_points(time, participant_id, session_id) ON DELETE CASCADE",
	}

	for _, ddl := range ddls {
		fmt.Printf("Executing: %s\n", ddl)
		_, err := conn.Exec(context.Background(), ddl)
		if err != nil {
			fmt.Printf("Error: %v\n", err)
		}
	}

	fmt.Println("Migration complete!")
}
