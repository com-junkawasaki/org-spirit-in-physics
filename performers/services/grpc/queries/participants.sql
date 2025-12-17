-- name: GetParticipants :many
SELECT id, age, gender, handedness, is_public, created_at, updated_at
FROM participants
WHERE ($1::boolean IS NULL OR is_public = $1)
ORDER BY created_at DESC;

-- name: GetParticipant :one
SELECT id, age, gender, handedness, is_public, created_at, updated_at
FROM participants
WHERE id = $1;

-- name: CreateParticipant :one
INSERT INTO participants (id, is_public, created_at, updated_at)
VALUES ($1, COALESCE($2, true), $3, $4)
ON CONFLICT (id) DO UPDATE SET updated_at = $4
RETURNING *;

-- name: GetStimulusWords :many
SELECT id, japanese, english, pronunciation
FROM stimulus_words
ORDER BY id;

-- name: GetStimulusWord :one
SELECT id, japanese, english, pronunciation
FROM stimulus_words
WHERE id = $1;
