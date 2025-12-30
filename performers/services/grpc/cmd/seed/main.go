package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
)

type word struct {
	id            int
	japanese      string
	english       string
	pronunciation string
}

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/spirit_in_physics"
	}

	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer conn.Close(context.Background())

	words := []word{
		{1, "頭", "Head", "atama"},
		{2, "緑", "Green", "midori"},
		{3, "水", "Water", "mizu"},
		{4, "刺す", "Prick", "sasu"},
		{5, "天使", "Angel", "tenshi"},
		{6, "長い", "Long", "nagai"},
		{7, "船", "Ship", "fune"},
		{8, "耕す", "Plough", "tagayasu"},
		{9, "羊毛", "Wool", "youmou"},
		{10, "友好的な", "Friendly", "yuukoutekina"},
		// ... 100 words would be better, but let's start with a few to fix the error
		{17, "海", "Sea", "umi"},
		{24, "泳ぐ", "Swim", "oyogu"},
		{46, "高価な", "Expensive", "koukana"},
		{8, "支払い", "Pay", "shiharai"},
		{25, "旅行", "Travel", "ryokou"},
	}

	for _, w := range words {
		_, err := conn.Exec(context.Background(),
			"INSERT INTO stimulus_words (id, japanese, english, pronunciation) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET japanese = EXCLUDED.japanese, english = EXCLUDED.english, pronunciation = EXCLUDED.pronunciation",
			w.id, w.japanese, w.english, w.pronunciation)
		if err != nil {
			log.Printf("Failed to insert word %d: %v", w.id, err)
		}
	}

	fmt.Println("Successfully seeded stimulus words.")
}

