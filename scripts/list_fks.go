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
		SELECT
			tc.table_name, 
			kcu.column_name, 
			ccu.table_name AS foreign_table_name,
			ccu.column_name AS foreign_column_name 
		FROM 
			information_schema.table_constraints AS tc 
			JOIN information_schema.key_column_usage AS kcu
			  ON tc.constraint_name = kcu.constraint_name
			  AND tc.table_schema = kcu.table_schema
			JOIN information_schema.constraint_column_usage AS ccu
			  ON ccu.constraint_name = tc.constraint_name
			  AND ccu.table_schema = tc.table_schema
		WHERE tc.constraint_type = 'FOREIGN KEY';
	`

	rows, err := conn.Query(context.Background(), query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("Foreign Keys:")
	for rows.Next() {
		var table, col, ftable, fcol string
		if err := rows.Scan(&table, &col, &ftable, &fcol); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("%s.%s -> %s.%s\n", table, col, ftable, fcol)
	}
}


