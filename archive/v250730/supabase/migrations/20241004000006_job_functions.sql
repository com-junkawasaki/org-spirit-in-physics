-- Functions for durable job management

-- Function to get the next ready job (considering dependencies and priority)
CREATE OR REPLACE FUNCTION get_next_ready_job()
RETURNS TABLE (
  id UUID,
  run_id UUID,
  response_id UUID,
  job_type TEXT,
  status TEXT,
  priority INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER,
  max_retries INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
AS $$
  SELECT aj.*
  FROM analysis_jobs aj
  WHERE aj.status = 'queued'
    AND NOT EXISTS (
      -- Check if this job has any incomplete dependencies
      SELECT 1 FROM analysis_job_dependencies ajd
      JOIN analysis_jobs dep_job ON ajd.depends_on_job_id = dep_job.id
      WHERE ajd.job_id = aj.id
        AND dep_job.status NOT IN ('completed', 'cancelled')
    )
  ORDER BY aj.priority DESC, aj.created_at ASC
  LIMIT 1;
$$;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER
LANGUAGE sql
AS $$
  DELETE FROM analysis_cache 
  WHERE expires_at < NOW()
  RETURNING id;
$$;

-- Function to get job statistics for a run
CREATE OR REPLACE FUNCTION get_run_job_stats(run_id_param UUID)
RETURNS TABLE (
  total_jobs BIGINT,
  completed_jobs BIGINT,
  failed_jobs BIGINT,
  running_jobs BIGINT,
  queued_jobs BIGINT,
  avg_completion_time INTERVAL
)
LANGUAGE sql
AS $$
  SELECT 
    COUNT(*) as total_jobs,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
    COUNT(*) FILTER (WHERE status = 'running') as running_jobs,
    COUNT(*) FILTER (WHERE status = 'queued') as queued_jobs,
    AVG(completed_at - started_at) FILTER (WHERE status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL) as avg_completion_time
  FROM analysis_jobs 
  WHERE run_id = run_id_param;
$$;

-- Function to automatically retry failed jobs
CREATE OR REPLACE FUNCTION retry_failed_jobs()
RETURNS TABLE (job_id UUID, retry_attempt INTEGER)
LANGUAGE sql
AS $$
  UPDATE analysis_jobs 
  SET 
    status = 'queued',
    retry_count = retry_count + 1,
    error_message = NULL,
    started_at = NULL,
    completed_at = NULL,
    updated_at = NOW()
  WHERE status = 'failed' 
    AND retry_count < max_retries
    AND updated_at < NOW() - INTERVAL '5 minutes'  -- Wait 5 minutes before retry
  RETURNING id, retry_count;
$$;
