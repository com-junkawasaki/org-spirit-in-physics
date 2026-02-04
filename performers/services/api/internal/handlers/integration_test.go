//go:build integration
// +build integration

package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/spirit-in-physics/services/grpc/gen/proto/participant/v1/participantv1connect"
	"github.com/spirit-in-physics/services/grpc/gen/proto/session/v1/sessionv1connect"
	"github.com/spirit-in-physics/services/grpc/gen/proto/timeline/v1/timelinev1connect"
	"github.com/spirit-in-physics/services/grpc/internal/db"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupTestServer creates a test HTTP server with all handlers
func setupTestServer(t *testing.T) (*httptest.Server, *db.Queries) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgresql://postgres:postgres@localhost:5432/spirit_in_physics?sslmode=disable"
	}

	pool, err := pgxpool.New(context.Background(), databaseURL)
	require.NoError(t, err, "Failed to connect to database")
	t.Cleanup(func() { pool.Close() })

	queries := db.New(pool)

	// Create handlers
	participantHandler := NewParticipantHandler(queries)
	sessionHandler := NewSessionHandler(queries)
	timelineHandler := NewTimelineHandler(queries)

	// Create HTTP mux
	mux := http.NewServeMux()

	// Register gRPC services
	participantPath, participantHandler := participantv1connect.NewParticipantServiceHandler(participantHandler)
	mux.Handle(participantPath, participantHandler)

	sessionPath, sessionHandler := sessionv1connect.NewSessionServiceHandler(sessionHandler)
	mux.Handle(sessionPath, sessionHandler)

	timelinePath, timelineHandler := timelinev1connect.NewTimelineServiceHandler(timelineHandler)
	mux.Handle(timelinePath, timelineHandler)

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Create test server
	server := httptest.NewServer(mux)
	t.Cleanup(func() { server.Close() })

	return server, queries
}

// TestHealthCheck tests the health check endpoint
func TestHealthCheck(t *testing.T) {
	server, _ := setupTestServer(t)

	resp, err := http.Get(server.URL + "/health")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

// TestParticipantService tests the Participant service endpoints
func TestParticipantService(t *testing.T) {
	server, _ := setupTestServer(t)

	// Test GetParticipants endpoint
	req, err := http.NewRequest("POST", server.URL+"/participant.v1.ParticipantService/GetParticipants", nil)
	require.NoError(t, err)

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Connect-Protocol-Version", "1")

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	// Should return 200 OK (even if empty)
	assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusBadRequest,
		"Expected 200 OK or 400 Bad Request, got %d", resp.StatusCode)
}

// TestSessionService tests the Session service endpoints
func TestSessionService(t *testing.T) {
	server, _ := setupTestServer(t)

	// Test GetSessions endpoint (requires participant_id)
	reqBody := map[string]interface{}{
		"participant_id": "test-participant-id",
	}
	body, err := json.Marshal(reqBody)
	require.NoError(t, err)

	req, err := http.NewRequest("POST", server.URL+"/session.v1.SessionService/GetSessions",
		http.NoBody)
	require.NoError(t, err)

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Connect-Protocol-Version", "1")
	req.Body = http.NoBody // Empty body for now

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	// Should return 200 OK or 400 Bad Request
	assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusBadRequest,
		"Expected 200 OK or 400 Bad Request, got %d", resp.StatusCode)
}

// TestTimelineService tests the Timeline service endpoints
func TestTimelineService(t *testing.T) {
	server, _ := setupTestServer(t)

	// Test GetTimeline endpoint (requires participant_id)
	req, err := http.NewRequest("POST", server.URL+"/timeline.v1.TimelineService/GetTimeline", nil)
	require.NoError(t, err)

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Connect-Protocol-Version", "1")

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	// Should return 200 OK or 400 Bad Request
	assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusBadRequest,
		"Expected 200 OK or 400 Bad Request, got %d", resp.StatusCode)
}

// TestDatabaseConnection tests database connectivity
func TestDatabaseConnection(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgresql://postgres:postgres@localhost:5432/spirit_in_physics?sslmode=disable"
	}

	pool, err := pgxpool.New(context.Background(), databaseURL)
	require.NoError(t, err, "Failed to connect to database")
	defer pool.Close()

	// Test a simple query
	var result int
	err = pool.QueryRow(context.Background(), "SELECT 1").Scan(&result)
	require.NoError(t, err)
	assert.Equal(t, 1, result)
}
