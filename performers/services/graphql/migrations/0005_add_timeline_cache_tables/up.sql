-- Timeline cache table for pre-computed participant timeline data
CREATE TABLE participant_timeline_cache (
  participant_id UUID PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  timeline_data JSONB NOT NULL,  -- Pre-computed timeline data points array
  metadata JSONB NOT NULL,  -- Metadata (totalDataPoints, emotionEntries, etc.)
  data_version INTEGER NOT NULL DEFAULT 1,  -- Data version for change tracking
  last_response_timestamp TIMESTAMPTZ,  -- Timestamp of last processed response
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- When computation was performed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batch jobs table for tracking timeline computation jobs
CREATE TABLE participant_timeline_batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),  -- Progress percentage
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',  -- Additional job-specific data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_timeline_cache_computed_at ON participant_timeline_cache(computed_at);
CREATE INDEX idx_timeline_cache_last_response_timestamp ON participant_timeline_cache(last_response_timestamp);

CREATE INDEX idx_timeline_batch_jobs_participant ON participant_timeline_batch_jobs(participant_id);
CREATE INDEX idx_timeline_batch_jobs_status ON participant_timeline_batch_jobs(status);
CREATE INDEX idx_timeline_batch_jobs_status_created ON participant_timeline_batch_jobs(status, created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timeline_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_timeline_batch_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_participant_timeline_cache_updated_at
  BEFORE UPDATE ON participant_timeline_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_cache_updated_at();

CREATE TRIGGER update_participant_timeline_batch_jobs_updated_at
  BEFORE UPDATE ON participant_timeline_batch_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_batch_jobs_updated_at();

-- Comments for documentation
COMMENT ON TABLE participant_timeline_cache IS 'Pre-computed timeline data for participants to improve query performance';
COMMENT ON TABLE participant_timeline_batch_jobs IS 'Tracks batch jobs for computing participant timeline data';
COMMENT ON COLUMN participant_timeline_cache.timeline_data IS 'JSONB array of TimelineDataPoint objects';
COMMENT ON COLUMN participant_timeline_cache.metadata IS 'JSONB object with totalDataPoints, emotionEntries, physiologicalEntries, etc.';
COMMENT ON COLUMN participant_timeline_cache.data_version IS 'Incremented when data is recomputed';
COMMENT ON COLUMN participant_timeline_cache.last_response_timestamp IS 'Timestamp of the most recent response included in this cache';

