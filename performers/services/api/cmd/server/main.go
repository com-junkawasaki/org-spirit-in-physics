package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"connectrpc.com/connect"
	"github.com/dapr/go-sdk/workflow"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"github.com/spirit-in-physics/services/grpc/gen/proto/import/v1/importv1connect"
	"github.com/spirit-in-physics/services/grpc/gen/proto/participant/v1/participantv1connect"
	"github.com/spirit-in-physics/services/grpc/gen/proto/preference/v1/preferencev1connect"
	"github.com/spirit-in-physics/services/grpc/gen/proto/session/v1/sessionv1connect"
	"github.com/spirit-in-physics/services/grpc/gen/proto/storage/v1/storagev1connect"
	"github.com/spirit-in-physics/services/grpc/gen/proto/timeline/v1/timelinev1connect"
	"github.com/spirit-in-physics/services/grpc/internal/activities"
	"github.com/spirit-in-physics/services/grpc/internal/db"
	"github.com/spirit-in-physics/services/grpc/internal/handlers"
	"github.com/spirit-in-physics/services/grpc/internal/workflows"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// The main handler routes /api/... to apiMux with prefix stripped
func (rw *responseWriter) Write(b []byte) (int, error) {
	if rw.statusCode >= 400 {
		log.Printf("[MainHandler] ERROR Response (%d): %s", rw.statusCode, string(b))
	}
	return rw.ResponseWriter.Write(b)
}

func loggerInterceptor() connect.UnaryInterceptorFunc {
	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			resp, err := next(ctx, req)
			if err != nil {
				log.Printf("AGENT_LOG ERROR [%s]: %v", req.Spec().Procedure, err)
			}
			return resp, err
		}
	}
}

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

	// Dapr Workflow Worker Setup
	var workflowWorker *workflow.WorkflowWorker
	var workflowClient *workflow.Client

	log.Println("Initializing Dapr Workflow worker...")
	workflowWorker, err = workflow.NewWorker()
	if err != nil {
		log.Printf("Unable to create Dapr Workflow worker: %v", err)
	} else {
		// Initialize activities with queries
		participantActivities := &activities.ParticipantActivities{Queries: queries}
		importActivities := &activities.ImportActivities{Queries: queries}
		timelineActivities := &activities.TimelineActivities{Queries: queries}

		// Register Workflows
		log.Println("Registering Dapr workflows and activities")
		workflowWorker.RegisterWorkflow(workflows.OnboardingWorkflow)
		workflowWorker.RegisterWorkflow(workflows.ImportParticipantsWorkflow)
		workflowWorker.RegisterWorkflow(workflows.ImportEmotionsWorkflow)
		workflowWorker.RegisterWorkflow(workflows.TimelineWorkflow)

		// Register Activities
		workflowWorker.RegisterActivity(participantActivities.CreateParticipantActivity)
		workflowWorker.RegisterActivity(participantActivities.SetupEnvironmentActivity)
		workflowWorker.RegisterActivity(importActivities.ImportParticipantActivity)
		workflowWorker.RegisterActivity(importActivities.ImportEmotionActivity)
		workflowWorker.RegisterActivity(timelineActivities.FetchTimelineActivity)

		// Start worker in background
		go func() {
			log.Println("Starting Dapr Workflow worker...")
			if err := workflowWorker.Start(); err != nil {
				log.Printf("Unable to start Dapr Workflow worker: %v", err)
			}
		}()
		defer workflowWorker.Shutdown()

		// Create workflow client
		workflowClient, err = workflow.NewClient()
		if err != nil {
			log.Printf("Unable to create Dapr Workflow client: %v", err)
		}
	}

	participantHandler := handlers.NewParticipantHandler(queries, workflowClient)
	sessionHandler := handlers.NewSessionHandler(queries)
	timelineHandler := handlers.NewTimelineHandler(queries, workflowClient)
	importHandler := handlers.NewImportHandler(queries, workflowClient)
	storageHandler := handlers.NewStorageHandler()
	preferenceHandler := handlers.NewPreferenceHandler()

	apiMux := http.NewServeMux()
	opts := connect.WithInterceptors(loggerInterceptor())

	path, handler := importv1connect.NewImportServiceHandler(importHandler, opts)
	apiMux.Handle(path, handler)

	path, handler = participantv1connect.NewParticipantServiceHandler(participantHandler, opts)
	apiMux.Handle(path, handler)

	path, handler = sessionv1connect.NewSessionServiceHandler(sessionHandler, opts)
	apiMux.Handle(path, handler)

	path, handler = timelinev1connect.NewTimelineServiceHandler(timelineHandler, opts)
	apiMux.Handle(path, handler)

	path, handler = storagev1connect.NewStorageServiceHandler(storageHandler, opts)
	apiMux.Handle(path, handler)

	path, handler = preferencev1connect.NewPreferenceServiceHandler(preferenceHandler, opts)
	apiMux.Handle(path, handler)

	apiMux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "OK")
	})

	// The main handler routes /api/... to apiMux with prefix stripped
	mainHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		log.Printf("[MainHandler] Incoming request: %s %s (RemoteAddr: %s)", r.Method, r.URL.Path, r.RemoteAddr)
		if strings.HasPrefix(r.URL.Path, "/api/") {
			strippedPath := strings.TrimPrefix(r.URL.Path, "/api")
			log.Printf("[MainHandler] Stripping /api prefix. New path: %s", strippedPath)
			// #region agent log
			{
				bodyBytes, _ := io.ReadAll(r.Body)
				r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
				logFile, _ := os.OpenFile("/Volumes/251214/jun784/spirit-in-physics/.cursor/debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
				if logFile != nil {
					fmt.Fprintf(logFile, "{\"location\":\"main.go:125\",\"message\":\"MainHandler routing\",\"data\":{\"method\":\"%s\",\"path\":\"%s\",\"newPath\":\"%s\",\"body\":\"%s\"},\"timestamp\":%d,\"sessionId\":\"debug-session\",\"hypothesisId\":\"A\"}\n", r.Method, r.URL.Path, strippedPath, string(bodyBytes), time.Now().UnixMilli())
					logFile.Close()
				}
			}
			// #endregion
			// Use a custom request with the stripped path to avoid issues with StripPrefix
			r2 := r.Clone(r.Context())
			r2.URL.Path = strippedPath
			apiMux.ServeHTTP(rw, r2)
			return
		}
		if r.URL.Path == "/api" {
			http.Redirect(rw, r, "/api/", http.StatusMovedPermanently)
			return
		}
		// Fallback for health check or other direct calls
		apiMux.ServeHTTP(rw, r)
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
	if err := http.ListenAndServe(":"+port, c.Handler(mainHandler)); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
