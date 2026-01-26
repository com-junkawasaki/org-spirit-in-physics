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
		datasetPath = "/Volumes/251214/jun784/spirit-in-physics/dataset/participants"
		if _, err := os.Stat(datasetPath); os.IsNotExist(err) {
			// Fallback 2: From services/grpc
			datasetPath = "../../../dataset/participants"
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
			participantID := entry.Name()
			now := time.Now()
			
			// Check if exists
			_, err = a.Queries.GetParticipant(ctx, participantID)
			if err != nil {
				// Create if not exists
				_, err = a.Queries.CreateParticipant(ctx, db.CreateParticipantParams{
					ID:        participantID,
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
	// Find CSV files
	datasetPath := fmt.Sprintf("/dataset/%s", participantID)
	if _, err := os.Stat(datasetPath); os.IsNotExist(err) {
		datasetPath = fmt.Sprintf("/Volumes/251214/jun784/spirit-in-physics/dataset/participants/%s", participantID)
		if _, err := os.Stat(datasetPath); os.IsNotExist(err) {
			datasetPath = fmt.Sprintf("../../../dataset/participants/%s", participantID)
		}
	}
	log.Printf("Using dataset path for participant %s: %s", participantID, datasetPath)

	var csvFiles []string
	err := filepath.Walk(datasetPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && (strings.HasSuffix(strings.ToLower(info.Name()), ".csv")) {
			csvFiles = append(csvFiles, path)
		}
		return nil
	})

	if err != nil {
		return 0, err
	}
	log.Printf("Found %d CSV files for participant %s in %s", len(csvFiles), participantID, datasetPath)

	totalEmotionsImported := 0
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
		sessions, _ := a.Queries.GetSessions(ctx, participantID)
		var sessionID pgtype.UUID
		if len(sessions) > 0 {
			sessionID = sessions[0].ID
		} else {
			id := uuid.New()
			sessionID = pgtype.UUID{Bytes: id, Valid: true}
			now := time.Now()
			_, err = a.Queries.CreateSession(ctx, db.CreateSessionParams{
				ID:            sessionID,
				ParticipantID: participantID,
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

		rowCount := 0
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

			// 1. Create Timeline Point (ignore duplicate errors)
			_ = a.Queries.CreateTimelinePoint(ctx, db.CreateTimelinePointParams{
				Time:          pgtype.Timestamptz{Time: pointTime, Valid: true},
				ParticipantID: participantID,
				SessionID:     sessionID,
				EventType:     pgtype.Text{String: "emotion_sample", Valid: true},
			})

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
						TimelinePointParticipantID: participantID,
						TimelinePointSessionID:     sessionID,
						EmotionName:                emotionName,
						Score:                      score,
						FileType:                   fileType,
					})
					if err == nil {
						totalEmotionsImported++
					}
				}
			}

			rowCount++
			if rowCount > 100 { // Reduced to 100 per file for faster feedback
				break
			}
		}
		log.Printf("Processed %d rows from %s, total emotions so far: %d", rowCount, fileName, totalEmotionsImported)
	}

	return totalEmotionsImported, nil
}
