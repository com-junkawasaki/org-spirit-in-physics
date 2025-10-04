-- Schema for durable job management in the analysis pipeline

-- Create a table to manage individual analysis jobs
CREATE TABLE analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
  response_id UUID NOT NULL REFERENCES participant_response_data(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL, -- 'emotion_analysis', 'feature_extraction', 'model_calculation'
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 0, -- Higher priority jobs are processed first
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  metadata JSONB DEFAULT '{}', -- Additional job-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(run_id, response_id, job_type)
);
CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_analysis_jobs_run_id ON analysis_jobs(run_id);
CREATE INDEX idx_analysis_jobs_response_id ON analysis_jobs(response_id);
CREATE INDEX idx_analysis_jobs_priority_status ON analysis_jobs(priority DESC, status, created_at ASC);
COMMENT ON TABLE analysis_jobs IS 'Manages individual analysis jobs with status tracking and retry logic.';

-- Create a table for job dependencies (if job A must complete before job B)
CREATE TABLE analysis_job_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  depends_on_job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, depends_on_job_id),
  CHECK (job_id != depends_on_job_id) -- Prevent self-dependency
);
CREATE INDEX idx_job_dependencies_job_id ON analysis_job_dependencies(job_id);
CREATE INDEX idx_job_dependencies_depends_on ON analysis_job_dependencies(depends_on_job_id);
COMMENT ON TABLE analysis_job_dependencies IS 'Manages job dependencies for ordered execution.';

-- Create a table to cache intermediate results for durability
CREATE TABLE analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  cache_value JSONB,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, cache_key)
);
CREATE INDEX idx_analysis_cache_job_id ON analysis_cache(job_id);
CREATE INDEX idx_analysis_cache_expires_at ON analysis_cache(expires_at);
COMMENT ON TABLE analysis_cache IS 'Caches intermediate results to support durable job execution.';

-- Add updated_at triggers
CREATE TRIGGER update_analysis_jobs_updated_at BEFORE UPDATE ON analysis_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analysis_cache_updated_at BEFORE UPDATE ON analysis_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_job_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow read access to authenticated users" ON analysis_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to authenticated users" ON analysis_job_dependencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to authenticated users" ON analysis_cache FOR SELECT TO authenticated USING (true);
