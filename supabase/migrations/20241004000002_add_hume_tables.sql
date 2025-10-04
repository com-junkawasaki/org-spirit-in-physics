-- Merkle DAG: initial_schema -> hume_integration_schema

-- Create a table to track Hume AI analysis jobs
CREATE TABLE participant_hume_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_experiment_session_id UUID NOT NULL REFERENCES participant_experiment_sessions(id) ON DELETE CASCADE,
  source_media_path TEXT, -- Path to the source audio or video file
  hume_job_id UUID, -- The job ID from Hume AI
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for Hume AI burst predictions (vocal expressions)
CREATE TABLE participant_hume_burst_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES participant_hume_analysis_jobs(id) ON DELETE CASCADE,
  begin_time DECIMAL(10, 4) NOT NULL,
  end_time DECIMAL(10, 4) NOT NULL,
  emotions JSONB,
  expressions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for Hume AI language predictions (from transcript)
CREATE TABLE participant_hume_language_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES participant_hume_analysis_jobs(id) ON DELETE CASCADE,
  text TEXT,
  begin_time DECIMAL(10, 4) NOT NULL,
  end_time DECIMAL(10, 4) NOT NULL,
  confidence DECIMAL(5, 4),
  speaker_confidence DECIMAL(5, 4),
  emotions JSONB,
  toxicity JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for Hume AI prosody predictions
CREATE TABLE participant_hume_prosody_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES participant_hume_analysis_jobs(id) ON DELETE CASCADE,
  begin_time DECIMAL(10, 4) NOT NULL,
  end_time DECIMAL(10, 4) NOT NULL,
  confidence DECIMAL(5, 4),
  features JSONB, -- For pitch, intensity, etc.
  emotions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_participant_hume_analysis_jobs_session_id ON participant_hume_analysis_jobs(participant_experiment_session_id);
CREATE INDEX idx_participant_hume_burst_predictions_job_id ON participant_hume_burst_predictions(job_id);
CREATE INDEX idx_participant_hume_language_predictions_job_id ON participant_hume_language_predictions(job_id);
CREATE INDEX idx_participant_hume_prosody_predictions_job_id ON participant_hume_prosody_predictions(job_id);

-- Add updated_at triggers
CREATE TRIGGER update_participant_hume_analysis_jobs_updated_at BEFORE UPDATE ON participant_hume_analysis_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
