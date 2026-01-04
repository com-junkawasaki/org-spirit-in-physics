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
		SELECT tgname, relname
		FROM pg_trigger
		JOIN pg_class ON pg_class.oid = pg_trigger.tgrelid
		WHERE tgisinternal = false;
	`

	rows, err := conn.Query(context.Background(), query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("Triggers:")
	for rows.Next() {
		var name, table string
		if err := rows.Scan(&name, &table); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("%s on %s\n", name, table)
	}
}



