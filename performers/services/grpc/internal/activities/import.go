package activities

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/spirit-in-physics/services/grpc/internal/db"
)

type ImportActivities struct {
	Queries *db.Queries
}

func (a *ImportActivities) ImportParticipantsActivity(ctx context.Context) (int, error) {
	datasetPath := "/dataset"
	
	// Check if directory exists
	if _, err := os.Stat(datasetPath); os.IsNotExist(err) {
		// Fallback 1: Direct absolute path
		datasetPath = "/Volumes/251214/jun784/spirit-in-physics/apps/researcher/public/dataset/participants"
		if _, err := os.Stat(datasetPath); os.IsNotExist(err) {
			// Fallback 2: From services/grpc
			datasetPath = "../../../apps/researcher/public/dataset/participants"
			if _, err := os.Stat(datasetPath); os.IsNotExist(err) {
				log.Printf("Dataset path not found in any common location")
				return 0, nil
			}
		}
	}

	log.Printf("Reading directory: %s", datasetPath)
	entries, err := os.ReadDir(datasetPath)
	if err != nil {
		return 0, fmt.Errorf("failed to read dataset path %s: %w", datasetPath, err)
	}

	log.Printf("Found %d entries in %s", len(entries), datasetPath)
	count := 0
	for _, entry := range entries {
		log.Printf("Processing entry: %s (IsDir: %v)", entry.Name(), entry.IsDir())
		if entry.IsDir() {
			participantID, err := uuid.Parse(entry.Name())
			if err != nil {
				log.Printf("Skipping invalid participant ID directory: %s", entry.Name())
				continue
			}

			pgUUID := pgtype.UUID{Bytes: participantID, Valid: true}
			now := time.Now()
			
			// Check if exists
			_, err = a.Queries.GetParticipant(ctx, pgUUID)
			if err != nil {
				// Create if not exists
				_, err = a.Queries.CreateParticipant(ctx, db.CreateParticipantParams{
					ID:        pgUUID,
					IsPublic:  pgtype.Bool{Bool: true, Valid: true},
					CreatedAt: pgtype.Timestamptz{Time: now, Valid: true},
					UpdatedAt: pgtype.Timestamptz{Time: now, Valid: true},
				})
				if err != nil {
					log.Printf("Failed to create participant %s: %v", entry.Name(), err)
					continue
				}
				count++
			}
		}
	}

	return count, nil
}

func (a *ImportActivities) ImportEmotionsActivity(ctx context.Context, participantID string) (int, error) {
	participantUUID, err := uuid.Parse(participantID)
	if err != nil {
		return 0, err
	}

	pgParticipantID := pgtype.UUID{Bytes: participantUUID, Valid: true}

	// Find CSV files
	datasetPath := fmt.Sprintf("/dataset/%s", participantID)
	if _, err := os.Stat(datasetPath); os.IsNotExist(err) {
		datasetPath = fmt.Sprintf("/Volumes/251214/jun784/spirit-in-physics/apps/researcher/public/dataset/participants/%s", participantID)
		if _, err := os.Stat(datasetPath); os.IsNotExist(err) {
			datasetPath = fmt.Sprintf("../../../apps/researcher/public/dataset/participants/%s", participantID)
		}
	}

	var csvFiles []string
	err = filepath.Walk(datasetPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(info.Name(), ".csv") {
			csvFiles = append(csvFiles, path)
		}
		return nil
	})

	if err != nil {
		return 0, err
	}

	totalImported := 0
	for _, csvFile := range csvFiles {
		fileName := filepath.Base(csvFile)
		
		// Map file name to type
		fileType := ""
		if strings.Contains(fileName, "face") {
			fileType = "face"
		} else if strings.Contains(fileName, "burst") {
			fileType = "burst"
		} else if strings.Contains(fileName, "language") {
			fileType = "language"
		} else if strings.Contains(fileName, "prosody") {
			fileType = "prosody"
		} else {
			continue
		}

		// Create a session for this participant if none exists, or use existing
		sessions, _ := a.Queries.GetSessions(ctx, pgParticipantID)
		var sessionID pgtype.UUID
		if len(sessions) > 0 {
			sessionID = sessions[0].ID
		} else {
			id := uuid.New()
			sessionID = pgtype.UUID{Bytes: id, Valid: true}
			now := time.Now()
			_, err = a.Queries.CreateSession(ctx, db.CreateSessionParams{
				ID:            sessionID,
				ParticipantID: pgParticipantID,
				SessionIndex:  pgtype.Int4{Int32: 1, Valid: true},
				StartTs:       now.UnixMilli(),
				CreatedAt:     pgtype.Timestamptz{Time: now, Valid: true},
				UpdatedAt:     pgtype.Timestamptz{Time: now, Valid: true},
			})
			if err != nil {
				log.Printf("Failed to create session for %s: %v", participantID, err)
				continue
			}
		}

		file, err := os.Open(csvFile)
		if err != nil {
			log.Printf("Failed to open %s: %v", csvFile, err)
			continue
		}
		defer file.Close()

		reader := csv.NewReader(file)
		header, err := reader.Read()
		if err != nil {
			continue
		}

		headerMap := make(map[string]int)
		for i, h := range header {
			headerMap[h] = i
		}

		count := 0
		for {
			record, err := reader.Read()
			if err == io.EOF {
				break
			}
			if err != nil {
				break
			}

			beginTimeStr := record[headerMap["BeginTime"]]
			var beginTime float64
			fmt.Sscanf(beginTimeStr, "%f", &beginTime)

			// Calculate a timestamp (base session time + beginTime)
			// Using mock base time for now
			baseTime := time.Date(2025, 12, 26, 10, 0, 0, 0, time.UTC)
			pointTime := baseTime.Add(time.Duration(beginTime * float64(time.Second)))

			// 1. Create Timeline Point
			err = a.Queries.CreateTimelinePoint(ctx, db.CreateTimelinePointParams{
				Time:          pgtype.Timestamptz{Time: pointTime, Valid: true},
				ParticipantID: pgParticipantID,
				SessionID:     sessionID,
				EventType:     pgtype.Text{String: "emotion_sample", Valid: true},
			})
			if err != nil {
				// Likely conflict if multiple CSVs have same BeginTime, which is expected
			}

			// 2. Insert Emotions
			for emotionName, idx := range headerMap {
				if emotionName == "Id" || emotionName == "BeginTime" || emotionName == "EndTime" {
					continue
				}

				scoreStr := record[idx]
				var score float64
				fmt.Sscanf(scoreStr, "%f", &score)

			if score > 0.1 { // Only import significant emotions
					err = a.Queries.CreateTimelineEmotionEntry(ctx, db.CreateTimelineEmotionEntryParams{
						TimelinePointTime:          pgtype.Timestamptz{Time: pointTime, Valid: true},
						TimelinePointParticipantID: pgParticipantID,
						TimelinePointSessionID:     sessionID,
						EmotionName:                emotionName,
						Score:                      score,
						FileType:                   fileType,
					})
					if err != nil {
						// Log occasionally
						if count%100 == 0 {
							log.Printf("Failed to insert emotion entry: %v", err)
						}
					}
				}
			}

			count++
			if count > 500 { // Limit per file for now to speed up test
				break
			}
		}
		totalImported += count
		log.Printf("Imported %d emotion points from %s", count, fileName)
	}

	return totalImported, nil
}

