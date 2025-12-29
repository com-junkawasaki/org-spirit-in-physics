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

	query := `
		SELECT 
			c.relname as table_name,
			a.attname as column_name,
			pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type
		FROM 
			pg_catalog.pg_attribute a
		JOIN 
			pg_catalog.pg_class c ON c.oid = a.attrelid
		JOIN 
			pg_catalog.pg_namespace n ON n.oid = c.relnamespace
		WHERE 
			n.nspname = 'public'
			AND a.attnum > 0
			AND NOT a.attisdropped
			AND (c.relname IN ('participants', 'sessions', 'timeline_points', 'timeline_emotion_entries', 'physiological_measurements')
			     OR c.relname IN ('timeline_word_statistics_by_session', 'timeline_emotion_vectors_by_word', 'timeline_word_aggregates_by_session'))
			AND a.attname IN ('id', 'participant_id', 'timeline_point_participant_id')
		ORDER BY 
			c.relname, a.attname;
	`

	rows, err := conn.Query(context.Background(), query)
	if err != nil {
		log.Fatalf("Query failed: %v\n", err)
	}
	defer rows.Close()

	fmt.Println("Current column types:")
	for rows.Next() {
		var table, column, dtype string
		if err := rows.Scan(&table, &column, &dtype); err != nil {
			log.Fatalf("Scan failed: %v\n", err)
		}
		fmt.Printf("%s.%s: %s\n", table, column, dtype)
	}
}
