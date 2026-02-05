-- Missing HUME tables for import-service

-- Types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emotion_name_enum') THEN
        CREATE TYPE emotion_name_enum AS ENUM (
            'Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anger', 
            'Anxiety', 'Awe', 'Awkwardness', 'Boredom', 'Calmness', 'Concentration', 
            'Contemplation', 'Contempt', 'Contentment', 'Craving', 'Desire', 
            'Determination', 'Disappointment', 'Disgust', 'Distress', 'Doubt', 
            'Ecstasy', 'Elation', 'Embarrassment', 'Empathic Pain', 'Entrancement', 
            'Envy', 'Excitement', 'Fear', 'Guilt', 'Horror', 'Interest', 'Joy', 
            'Love', 'Nostalgia', 'Pain', 'Pride', 'Realization', 'Relief', 
            'Romance', 'Sadness', 'Satisfaction', 'Shame', 'Surprise (negative)', 
            'Surprise (positive)', 'Sympathy', 'Tiredness', 'Triumph'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emotion_file_type') THEN
        CREATE TYPE emotion_file_type AS ENUM ('burst', 'face', 'language', 'prosody', 'unknown');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'measurement_type_enum') THEN
        CREATE TYPE measurement_type_enum AS ENUM ('Ch1', 'Ch2', 'Ch3', 'Ch4', 'Ch5', 'Ch6', 'Ch7', 'Ch8', 'unknown');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'measurement_unit_enum') THEN
        CREATE TYPE measurement_unit_enum AS ENUM ('volt', 'percent', 'count', 'unknown');
    END IF;
END $$;

-- Burst Emotion Data
CREATE TABLE IF NOT EXISTS hume_burst_emotion_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time TIMESTAMPTZ NOT NULL,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    record_id TEXT,
    begin_time DOUBLE PRECISION,
    end_time DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hume_burst_emotion_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hume_burst_emotion_data_id UUID NOT NULL REFERENCES hume_burst_emotion_data(id) ON DELETE CASCADE,
    emotion_name emotion_name_enum NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    UNIQUE(hume_burst_emotion_data_id, emotion_name)
);

-- Face Emotion Data
CREATE TABLE IF NOT EXISTS hume_face_emotion_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time TIMESTAMPTZ NOT NULL,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    record_id TEXT,
    begin_time DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hume_face_emotion_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hume_face_emotion_data_id UUID NOT NULL REFERENCES hume_face_emotion_data(id) ON DELETE CASCADE,
    emotion_name emotion_name_enum NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    UNIQUE(hume_face_emotion_data_id, emotion_name)
);

-- Language Emotion Data
CREATE TABLE IF NOT EXISTS hume_language_emotion_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time TIMESTAMPTZ NOT NULL,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    record_id TEXT,
    begin_time DOUBLE PRECISION,
    end_time DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hume_language_emotion_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hume_language_emotion_data_id UUID NOT NULL REFERENCES hume_language_emotion_data(id) ON DELETE CASCADE,
    emotion_name emotion_name_enum NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    UNIQUE(hume_language_emotion_data_id, emotion_name)
);

-- Prosody Emotion Data
CREATE TABLE IF NOT EXISTS hume_prosody_emotion_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time TIMESTAMPTZ NOT NULL,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    record_id TEXT,
    begin_time DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hume_prosody_emotion_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hume_prosody_emotion_data_id UUID NOT NULL REFERENCES hume_prosody_emotion_data(id) ON DELETE CASCADE,
    emotion_name emotion_name_enum NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    UNIQUE(hume_prosody_emotion_data_id, emotion_name)
);

-- Physiological data (high density)
CREATE TABLE IF NOT EXISTS physiological_data (
    time TIMESTAMPTZ NOT NULL,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    ch1 DOUBLE PRECISION,
    ch2 DOUBLE PRECISION,
    ch3 DOUBLE PRECISION,
    ch4 DOUBLE PRECISION,
    ch5 DOUBLE PRECISION,
    ch6 DOUBLE PRECISION,
    ch7 DOUBLE PRECISION,
    ch8 DOUBLE PRECISION,
    PRIMARY KEY (time, participant_id, session_id)
);

-- Helper function for views
CREATE OR REPLACE FUNCTION refresh_timeline_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY timeline_word_aggregates_by_session;
    REFRESH MATERIALIZED VIEW CONCURRENTLY timeline_emotion_vectors_by_word;
    REFRESH MATERIALIZED VIEW CONCURRENTLY timeline_word_statistics_by_session;
END;
$$ LANGUAGE plpgsql;

