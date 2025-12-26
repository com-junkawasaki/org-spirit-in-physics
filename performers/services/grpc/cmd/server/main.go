package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"github.com/spirit-in-physics/services/grpc/gen/proto/import/v1/importv1connect"
	"github.com/spirit-in-physics/services/grpc/gen/proto/participant/v1/participantv1connect"
	"github.com/spirit-in-physics/services/grpc/gen/proto/session/v1/sessionv1connect"
	"github.com/spirit-in-physics/services/grpc/gen/proto/timeline/v1/timelinev1connect"
	"github.com/spirit-in-physics/services/grpc/internal/db"
	"github.com/spirit-in-physics/services/grpc/internal/handlers"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	queries := db.New(pool)

	participantHandler := handlers.NewParticipantHandler(queries)
	sessionHandler := handlers.NewSessionHandler(queries)
	timelineHandler := handlers.NewTimelineHandler(queries)
	importHandler := handlers.NewImportHandler(queries)

	mux := http.NewServeMux()

	path, handler := importv1connect.NewImportServiceHandler(importHandler)
	mux.Handle(path, handler)

	path, handler = participantv1connect.NewParticipantServiceHandler(participantHandler)
	mux.Handle(path, handler)

	path, handler = sessionv1connect.NewSessionServiceHandler(sessionHandler)
	mux.Handle(path, handler)

	path, handler = timelinev1connect.NewTimelineServiceHandler(timelineHandler)
	mux.Handle(path, handler)

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "OK")
	})

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"}, // Adjust this for production
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{
			"Connect-Protocol-Version",
			"Connect-Timeout-Ms",
			"Content-Type",
			"Accept",
			"Authorization",
			"X-User-Agent",
			"X-Grpc-Web",
		},
		ExposedHeaders: []string{
			"Connect-Error-Code",
			"Connect-Error-Message",
			"Grpc-Status",
			"Grpc-Message",
			"Grpc-Status-Details-Bin",
		},
		MaxAge: 7200,
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	// Wrap the mux with CORS middleware
	if err := http.ListenAndServe(":"+port, c.Handler(mux)); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
