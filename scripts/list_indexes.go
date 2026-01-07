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
		SELECT indexname, indexdef
		FROM pg_indexes
		WHERE tablename = 'participants';
	`

	rows, err := conn.Query(context.Background(), query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("Indexes:")
	for rows.Next() {
		var name, def string
		if err := rows.Scan(&name, &def); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("%s: %s\n", name, def)
	}
}



