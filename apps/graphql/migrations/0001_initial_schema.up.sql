-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    age INTEGER CHECK (age >= 0 AND age <= 150),
    gender VARCHAR(50),
    handedness VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Experiments table
CREATE TABLE IF NOT EXISTS experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Windows table
CREATE TABLE IF NOT EXISTS windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    word VARCHAR(255) NOT NULL,
    start TIMESTAMP WITH TIME ZONE NOT NULL,
    end TIMESTAMP WITH TIME ZONE NOT NULL,
    reaction_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Emotion aggregations table
CREATE TABLE IF NOT EXISTS emotion_aggregations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    window_id UUID NOT NULL REFERENCES windows(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL,
    emotion VARCHAR(100) NOT NULL,
    score DECIMAL(10, 6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Physiological aggregations table
CREATE TABLE IF NOT EXISTS physiological_aggregations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    window_id UUID NOT NULL REFERENCES windows(id) ON DELETE CASCADE,
    channels JSONB,
    avg DECIMAL(10, 6),
    quality DECIMAL(5, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Kernel fusion runs table
CREATE TABLE IF NOT EXISTS kernel_fusion_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    weights JSONB NOT NULL,
    normalization VARCHAR(50),
    dimensions INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Embedding results table
CREATE TABLE IF NOT EXISTS embedding_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kernel_fusion_run_id UUID NOT NULL REFERENCES kernel_fusion_runs(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL,
    dimensions INTEGER NOT NULL,
    points JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_created_at ON participants(created_at);
CREATE INDEX IF NOT EXISTS idx_experiments_participant_id ON experiments(participant_id);
CREATE INDEX IF NOT EXISTS idx_windows_experiment_id ON windows(experiment_id);
CREATE INDEX IF NOT EXISTS idx_windows_start ON windows(start);
CREATE INDEX IF NOT EXISTS idx_emotion_aggregations_window_id ON emotion_aggregations(window_id);
CREATE INDEX IF NOT EXISTS idx_physiological_aggregations_window_id ON physiological_aggregations(window_id);
CREATE INDEX IF NOT EXISTS idx_kernel_fusion_runs_participant_id ON kernel_fusion_runs(participant_id);
CREATE INDEX IF NOT EXISTS idx_embedding_results_kernel_fusion_run_id ON embedding_results(kernel_fusion_run_id);

-- Foreign key constraints
ALTER TABLE IF EXISTS experiments ADD CONSTRAINT fk_experiments_participant_id 
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE;

ALTER TABLE IF NOT EXISTS windows ADD CONSTRAINT fk_windows_experiment_id 
    FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS emotion_aggregations ADD CONSTRAINT fk_emotion_aggregations_window_id 
    FOREIGN KEY (window_id) REFERENCES windows(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS physiological_aggregations ADD CONSTRAINT fk_physiological_aggregations_window_id 
    FOREIGN KEY (window_id) REFERENCES windows(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS kernel_fusion_runs ADD CONSTRAINT fk_kernel_fusion_runs_participant_id 
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS embedding_results ADD CONSTRAINT fk_embedding_results_kernel_fusion_run_id 
    FOREIGN KEY (kernel_fusion_run_id) REFERENCES kernel_fusion_runs(id) ON DELETE CASCADE;
