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
		SELECT table_name, column_name, data_type 
		FROM information_schema.columns 
		WHERE table_name IN ('participants', 'sessions', 'timeline_points', 'timeline_emotion_entries', 'physiological_measurements')
		AND column_name IN ('id', 'participant_id', 'timeline_point_participant_id')
		ORDER BY table_name, column_name;
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
			log.Fatal(err)
		}
		fmt.Printf("%s.%s: %s\n", table, column, dtype)
	}
}

