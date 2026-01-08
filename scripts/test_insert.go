package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/spirit_in_physics"
	}

	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close(context.Background())

	participantID := "user_37VaRJNhFf9tHa0Gf2eqcJdz9ZR"
	email := "jun784@gmail.com"
	now := time.Now()

	fmt.Printf("Attempting to insert participant with ID: %s\n", participantID)

	query := `
		INSERT INTO participants (
			id, email, age_group, ethnicity, income_range, medical_history, is_public, gender, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (id) DO UPDATE SET 
			email = EXCLUDED.email,
			updated_at = EXCLUDED.updated_at
		RETURNING id;
	`

	var returnedID string
	err = conn.QueryRow(context.Background(), query,
		participantID,
		pgtype.Text{String: email, Valid: true},
		pgtype.Text{String: "Select age group", Valid: true},
		pgtype.Text{String: "Select ethnicity", Valid: true},
		pgtype.Text{String: "Select income range", Valid: true},
		[]string{},
		true,
		pgtype.Text{String: "Male", Valid: true},
		now,
		now,
	).Scan(&returnedID)

	if err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Printf("Success! Returned ID: %s\n", returnedID)
	}
}






