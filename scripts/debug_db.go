package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgresql://postgres:postgres@localhost:5432/spirit_in_physics"
	}

	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	var count int
	err = pool.QueryRow(context.Background(), "SELECT count(*) FROM timeline_points").Scan(&count)
	if err != nil {
		log.Fatalf("Failed to query timeline_points: %v", err)
	}
	fmt.Printf("Total timeline_points: %d\n", count)

	err = pool.QueryRow(context.Background(), "SELECT count(*) FROM participants").Scan(&count)
	if err != nil {
		log.Fatalf("Failed to query participants: %v", err)
	}
	fmt.Printf("Total participants: %d\n", count)
}

