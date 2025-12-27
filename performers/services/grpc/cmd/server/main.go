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
	"github.com/spirit-in-physics/services/grpc/gen/proto/storage/v1/storagev1connect"
	"github.com/spirit-in-physics/services/grpc/gen/proto/timeline/v1/timelinev1connect"
	"github.com/spirit-in-physics/services/grpc/internal/activities"
	"github.com/spirit-in-physics/services/grpc/internal/db"
	"github.com/spirit-in-physics/services/grpc/internal/handlers"
	"github.com/spirit-in-physics/services/grpc/internal/workflows"
	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
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

	// Temporal Client Setup
	temporalAddress := os.Getenv("TEMPORAL_ADDRESS")
	if temporalAddress == "" {
		temporalAddress = "infra-temporal:7233"
	}

	temporalClient, err := client.Dial(client.Options{
		HostPort: temporalAddress,
	})
	if err != nil {
		log.Printf("Unable to create Temporal client: %v", err)
	} else {
		defer temporalClient.Close()

		// Start Temporal Worker in background
		log.Println("Initializing Temporal worker...")
		go func() {
			w := worker.New(temporalClient, "onboarding-queue", worker.Options{})

			// Register Workflows and Activities
			log.Println("Registering Temporal workflows and activities")
			w.RegisterWorkflow(workflows.OnboardingWorkflow)
			w.RegisterWorkflow(workflows.ImportParticipantsWorkflow)
			w.RegisterWorkflow(workflows.ImportEmotionsWorkflow)
			
			a := &activities.ParticipantActivities{Queries: queries}
			w.RegisterActivity(a)

			ia := &activities.ImportActivities{Queries: queries}
			w.RegisterActivity(ia)

			log.Println("Starting Temporal worker on queue 'onboarding-queue'")
			if err := w.Run(worker.InterruptCh()); err != nil {
				log.Printf("Unable to start Temporal worker: %v", err)
			}
		}()
	}

	participantHandler := handlers.NewParticipantHandler(queries, temporalClient)
	sessionHandler := handlers.NewSessionHandler(queries)
	timelineHandler := handlers.NewTimelineHandler(queries)
	importHandler := handlers.NewImportHandler(queries, temporalClient)
	storageHandler := handlers.NewStorageHandler()

	mux := http.NewServeMux()

	path, handler := importv1connect.NewImportServiceHandler(importHandler)
	mux.Handle(path, handler)

	path, handler = participantv1connect.NewParticipantServiceHandler(participantHandler)
	mux.Handle(path, handler)

	path, handler = sessionv1connect.NewSessionServiceHandler(sessionHandler)
	mux.Handle(path, handler)

	path, handler = timelinev1connect.NewTimelineServiceHandler(timelineHandler)
	mux.Handle(path, handler)

	path, handler = storagev1connect.NewStorageServiceHandler(storageHandler)
	mux.Handle(path, handler)

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "OK")
	})

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
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
	if err := http.ListenAndServe(":"+port, c.Handler(mux)); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
