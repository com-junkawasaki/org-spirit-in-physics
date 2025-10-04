-- Schema for storing analysis pipeline results based on the Kawasaki Model.

-- Create a table to log analysis runs with specific parameters.
CREATE TABLE analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  model_version TEXT NOT NULL,
  parameters JSONB, -- To store hyperparameters like alpha, gamma, eta, lambda
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE analysis_runs IS 'Logs each execution of the analysis pipeline, capturing model version and parameters.';

-- Create a table for skin potential time-series data.
CREATE TABLE response_skin_potential_timeseries (
  id BIGSERIAL PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES participant_response_data(id) ON DELETE CASCADE,
  -- Timestamp relative to the start of the response event.
  timestamp_offset_ms INTEGER NOT NULL,
  value DECIMAL(10, 4) NOT NULL,
  UNIQUE(response_id, timestamp_offset_ms)
);
CREATE INDEX idx_response_skin_potential_response_id ON response_skin_potential_timeseries(response_id);
COMMENT ON TABLE response_skin_potential_timeseries IS 'Stores time-series data for skin potential, linked to a specific response.';

-- Create a table for emotion time-series data from external APIs like Hume.
CREATE TABLE response_emotion_timeseries (
  id BIGSERIAL PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES participant_response_data(id) ON DELETE CASCADE,
  -- Timestamp relative to the start of the response event.
  timestamp_offset_ms INTEGER NOT NULL,
  source TEXT, -- e.g., 'hume_api_video', 'hume_api_audio'
  emotion_data JSONB NOT NULL, -- To store the rich output from the emotion analysis API.
  UNIQUE(response_id, source, timestamp_offset_ms)
);
CREATE INDEX idx_response_emotion_response_id ON response_emotion_timeseries(response_id);
COMMENT ON TABLE response_emotion_timeseries IS 'Stores time-series emotion data from services like Hume AI.';

-- Create a table to store the final analysis results.
CREATE TABLE analysis_results (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
  response_id UUID NOT NULL REFERENCES participant_response_data(id) ON DELETE CASCADE,
  p_value DOUBLE PRECISION, -- The final P(w_O | w_I)
  -- Store individual components for detailed analysis
  word2vec_component DOUBLE PRECISION,
  reaction_time_component DOUBLE PRECISION,
  skin_potential_component DOUBLE PRECISION,
  emotion_component DOUBLE PRECISION,
  -- Store the raw inputs that generated the result for reproducibility
  raw_inputs JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(run_id, response_id)
);
CREATE INDEX idx_analysis_results_run_id ON analysis_results(run_id);
CREATE INDEX idx_analysis_results_response_id ON analysis_results(response_id);
COMMENT ON TABLE analysis_results IS 'Stores the computed results from the Kawasaki Model for each response.';

-- Enable RLS for all new tables
ALTER TABLE analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_skin_potential_timeseries ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_emotion_timeseries ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- POLICIES --
-- By default, analysis data should be restricted. Access for researchers
-- would typically be granted via the service_role key on the server-side
-- or specific roles for logged-in researchers. For simplicity, we'll allow
-- authenticated users read access for now.

CREATE POLICY "Allow read access to authenticated users" ON analysis_runs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users" ON response_skin_potential_timeseries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users" ON response_emotion_timeseries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users" ON analysis_results
  FOR SELECT TO authenticated USING (true);

-- Server-side processes using the service_role key will be able to insert/update/delete.
