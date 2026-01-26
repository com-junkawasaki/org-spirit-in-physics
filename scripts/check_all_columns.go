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
		log.Fatal(err)
	}
	defer conn.Close(context.Background())

	query := `
		SELECT column_name, data_type, udt_name
		FROM information_schema.columns
		WHERE table_name = 'participants';
	`

	rows, err := conn.Query(context.Background(), query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("Table 'participants' columns:")
	for rows.Next() {
		var name, dtype, udt string
		if err := rows.Scan(&name, &dtype, &udt); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("%s: %s (%s)\n", name, dtype, udt)
	}
}







