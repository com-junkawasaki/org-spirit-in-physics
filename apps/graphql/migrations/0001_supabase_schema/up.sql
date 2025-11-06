-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Participants table (Supabase schema)
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    age INTEGER,
    gender TEXT,
    handedness TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participant consents table
CREATE TABLE participant_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    signature TEXT NOT NULL,
    agreements TEXT NOT NULL,
    agreed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participant experiment sessions table
CREATE TABLE participant_experiment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Word stimuli table
CREATE TABLE word_stimuli (
    id SERIAL PRIMARY KEY,
    word TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participant response data table
CREATE TABLE participant_response_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    experiment_id UUID,
    word_stimulus_id INTEGER REFERENCES word_stimuli(id),
    stimulus_word TEXT NOT NULL,
    response_word TEXT,
    reaction_time_ms INTEGER,
    session TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    audio_file_path TEXT,
    video_file_path TEXT,
    skin_potential DOUBLE PRECISION,
    emotion TEXT,
    emotion_confidence DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participant analysis results table
CREATE TABLE participant_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    stimulus_word TEXT NOT NULL,
    response_word TEXT,
    p_value DOUBLE PRECISION,
    word2vec_component DOUBLE PRECISION,
    reaction_time_component DOUBLE PRECISION,
    skin_potential_component DOUBLE PRECISION,
    emotion_component DOUBLE PRECISION,
    emotion_data TEXT,
    physiological_data TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_participants_created_at ON participants(created_at);
CREATE INDEX idx_participant_consents_participant_id ON participant_consents(participant_id);
CREATE INDEX idx_participant_experiment_sessions_participant_id ON participant_experiment_sessions(participant_id);
CREATE INDEX idx_participant_experiment_sessions_session_type ON participant_experiment_sessions(session_type);
CREATE INDEX idx_word_stimuli_word ON word_stimuli(word);
CREATE INDEX idx_participant_response_data_participant_id ON participant_response_data(participant_id);
CREATE INDEX idx_participant_response_data_timestamp ON participant_response_data(timestamp);
CREATE INDEX idx_participant_response_data_session ON participant_response_data(session);
CREATE INDEX idx_participant_analysis_results_participant_id ON participant_analysis_results(participant_id);

-- Insert some sample word stimuli
INSERT INTO word_stimuli (word) VALUES
    ('spirit'),
    ('mind'),
    ('soul'),
    ('consciousness'),
    ('energy'),
    ('light'),
    ('dark'),
    ('love'),
    ('hate'),
    ('peace'),
    ('war'),
    ('life'),
    ('death'),
    ('time'),
    ('space'),
    ('reality'),
    ('dream'),
    ('memory'),
    ('thought'),
    ('emotion');
