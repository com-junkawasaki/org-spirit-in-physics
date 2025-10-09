-- V1__Create_domain_tables.sql
-- Domain tables for Spirit in Physics Axon Framework backend

-- Participants table (read model projection)
CREATE TABLE participants (
    participant_id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_CONSENT',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    consent_version VARCHAR(50),
    consent_given_at TIMESTAMP
);

-- Experiment sessions table (read model projection)
CREATE TABLE experiment_sessions (
    session_id UUID PRIMARY KEY,
    participant_id UUID NOT NULL REFERENCES participants(participant_id),
    status VARCHAR(50) NOT NULL DEFAULT 'CREATED',
    stimulus_words TEXT[] NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    video_file_url TEXT,
    audio_file_url TEXT
);

-- Word responses table (part of session projection)
CREATE TABLE word_responses (
    response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES experiment_sessions(session_id),
    stimulus_word VARCHAR(255) NOT NULL,
    response_word VARCHAR(255) NOT NULL,
    reaction_time_ms BIGINT NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Analysis jobs table (read model projection)
CREATE TABLE analysis_jobs (
    job_id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES experiment_sessions(session_id),
    job_type VARCHAR(100) NOT NULL DEFAULT 'SPIRIT_ANALYSIS',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    temporal_workflow_id VARCHAR(255),
    parameters JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    results JSONB,
    error_message TEXT
);

-- Indexes for better query performance
CREATE INDEX idx_participants_status ON participants(status);
CREATE INDEX idx_participants_email ON participants(email);
CREATE INDEX idx_experiment_sessions_participant_id ON experiment_sessions(participant_id);
CREATE INDEX idx_experiment_sessions_status ON experiment_sessions(status);
CREATE INDEX idx_word_responses_session_id ON word_responses(session_id);
CREATE INDEX idx_analysis_jobs_session_id ON analysis_jobs(session_id);
CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_analysis_jobs_temporal_workflow_id ON analysis_jobs(temporal_workflow_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_participants_updated_at
    BEFORE UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
