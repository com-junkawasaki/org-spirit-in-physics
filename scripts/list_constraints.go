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
		SELECT conname, relname
		FROM pg_constraint
		JOIN pg_class ON pg_class.oid = pg_constraint.conrelid
		WHERE relname IN ('timeline_points', 'timeline_emotion_entries', 'physiological_measurements', 'sessions', 'participants');
	`

	rows, err := conn.Query(context.Background(), query)
	if err != nil {
		log.Fatalf("Query failed: %v\n", err)
	}
	defer rows.Close()

	fmt.Println("Current constraints:")
	for rows.Next() {
		var name, table string
		if err := rows.Scan(&name, &table); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("%s: %s\n", table, name)
	}
}

