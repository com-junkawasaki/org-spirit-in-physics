-- name: GetParticipants :many
SELECT id, age, gender, handedness, email, age_group, ethnicity, income_range, medical_history, is_public, created_at, updated_at
FROM participants
WHERE ($1::boolean IS NULL OR is_public = $1)
ORDER BY created_at DESC;

-- name: GetParticipant :one
SELECT id, age, gender, handedness, email, age_group, ethnicity, income_range, medical_history, is_public, created_at, updated_at
FROM participants
WHERE id = $1;

-- name: GetParticipantByEmail :one
SELECT id, age, gender, handedness, email, age_group, ethnicity, income_range, medical_history, is_public, created_at, updated_at
FROM participants
WHERE email = $1;

-- name: CreateParticipant :one
INSERT INTO participants (
    id, email, age_group, ethnicity, income_range, medical_history, is_public, gender, created_at, updated_at
)
VALUES (
    sqlc.arg(id), 
    sqlc.narg(email),
    sqlc.narg(age_group), 
    sqlc.narg(ethnicity), 
    sqlc.narg(income_range), 
    sqlc.narg(medical_history), 
    COALESCE(sqlc.narg(is_public)::boolean, true), 
    sqlc.narg(gender),
    sqlc.arg(created_at), 
    sqlc.arg(updated_at)
)
ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    age_group = EXCLUDED.age_group,
    ethnicity = EXCLUDED.ethnicity,
    income_range = EXCLUDED.income_range,
    medical_history = EXCLUDED.medical_history,
    gender = EXCLUDED.gender,
    updated_at = EXCLUDED.updated_at
RETURNING *;

-- name: GetStimulusWords :many
SELECT id, japanese, english, french, spanish, russian, arabic, chinese, pronunciation, audio_ja, audio_en, audio_fr, audio_es, audio_ru, audio_ar, audio_zh
FROM stimulus_words
ORDER BY id;

-- name: GetStimulusWord :one
SELECT id, japanese, english, french, spanish, russian, arabic, chinese, pronunciation, audio_ja, audio_en, audio_fr, audio_es, audio_ru, audio_ar, audio_zh
FROM stimulus_words
WHERE id = $1;

-- name: UpsertStimulusWord :exec
INSERT INTO stimulus_words (
    id, japanese, english, french, spanish, russian, arabic, chinese, pronunciation,
    audio_ja, audio_en, audio_fr, audio_es, audio_ru, audio_ar, audio_zh,
    created_at, updated_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    japanese = EXCLUDED.japanese,
    english = EXCLUDED.english,
    french = EXCLUDED.french,
    spanish = EXCLUDED.spanish,
    russian = EXCLUDED.russian,
    arabic = EXCLUDED.arabic,
    chinese = EXCLUDED.chinese,
    pronunciation = EXCLUDED.pronunciation,
    audio_ja = COALESCE(EXCLUDED.audio_ja, stimulus_words.audio_ja),
    audio_en = COALESCE(EXCLUDED.audio_en, stimulus_words.audio_en),
    audio_fr = COALESCE(EXCLUDED.audio_fr, stimulus_words.audio_fr),
    audio_es = COALESCE(EXCLUDED.audio_es, stimulus_words.audio_es),
    audio_ru = COALESCE(EXCLUDED.audio_ru, stimulus_words.audio_ru),
    audio_ar = COALESCE(EXCLUDED.audio_ar, stimulus_words.audio_ar),
    audio_zh = COALESCE(EXCLUDED.audio_zh, stimulus_words.audio_zh),
    updated_at = NOW();
