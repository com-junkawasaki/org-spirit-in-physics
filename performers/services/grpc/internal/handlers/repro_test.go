package handlers

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	"github.com/spirit-in-physics/services/grpc/gen/proto/participant/v1"
	"github.com/spirit-in-physics/services/grpc/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"os"
)

func TestCreateParticipant_Repro(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/spirit_in_physics"
	}

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	queries := db.New(pool)
	handler := NewParticipantHandler(queries, nil)

	participantID := "user_37VaRJNhFf9tHa0Gf2eqcJdz9ZR"
	ageGroup := "Select age group"
	gender := "Male"
	ethnicity := "Select ethnicity"
	incomeRange := "Select income range"
	isPublic := true

	req := connect.NewRequest(&participantv1.CreateParticipantRequest{
		Id:             &participantID,
		Email:          "jun784@gmail.com",
		AgeGroup:       &ageGroup,
		Gender:         &gender,
		Ethnicity:      &ethnicity,
		IncomeRange:    &incomeRange,
		MedicalHistory: []string{},
		IsPublic:       &isPublic,
	})

	resp, err := handler.CreateParticipant(context.Background(), req)
	if err != nil {
		t.Logf("Error: %v", err)
		if connectErr, ok := err.(*connect.Error); ok {
			t.Logf("Code: %v", connectErr.Code())
			t.Logf("Message: %v", connectErr.Message())
		}
	} else {
		t.Logf("Success! ID: %s", resp.Msg.Participant.Id)
	}
	
	assert.Nil(t, err)
}
