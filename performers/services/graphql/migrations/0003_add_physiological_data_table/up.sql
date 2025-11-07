-- Physiological data table for storing multiple physiological measurements per response
CREATE TABLE physiological_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_response_data_id UUID NOT NULL REFERENCES participant_response_data(id) ON DELETE CASCADE,
  average DOUBLE PRECISION,
  max_value DOUBLE PRECISION,
  min_value DOUBLE PRECISION,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_physiological_data_response_id ON physiological_data(participant_response_data_id);
CREATE INDEX idx_physiological_data_timestamp ON physiological_data(timestamp);

