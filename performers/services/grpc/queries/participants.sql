-- name: GetParticipants :many
SELECT id, age, gender, handedness, age_group, ethnicity, income_range, medical_history, is_public, created_at, updated_at
FROM participants
WHERE ($1::boolean IS NULL OR is_public = $1)
ORDER BY created_at DESC;

-- name: GetParticipant :one
SELECT id, age, gender, handedness, age_group, ethnicity, income_range, medical_history, is_public, created_at, updated_at
FROM participants
WHERE id = $1;

-- name: CreateParticipant :one
INSERT INTO participants (
    id, age_group, ethnicity, income_range, medical_history, is_public, created_at, updated_at
)
VALUES (
    sqlc.arg(id), 
    sqlc.narg(age_group), 
    sqlc.narg(ethnicity), 
    sqlc.narg(income_range), 
    sqlc.narg(medical_history), 
    COALESCE(sqlc.narg(is_public)::boolean, true), 
    sqlc.arg(created_at), 
    sqlc.arg(updated_at)
)
ON CONFLICT (id) DO UPDATE SET 
    age_group = EXCLUDED.age_group,
    ethnicity = EXCLUDED.ethnicity,
    income_range = EXCLUDED.income_range,
    medical_history = EXCLUDED.medical_history,
    updated_at = EXCLUDED.updated_at
RETURNING *;

-- name: GetStimulusWords :many
SELECT id, japanese, english, pronunciation
FROM stimulus_words
ORDER BY id;

-- name: GetStimulusWord :one
SELECT id, japanese, english, pronunciation
FROM stimulus_words
WHERE id = $1;
