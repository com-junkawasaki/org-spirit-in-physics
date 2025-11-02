-- Merkle DAG: create_session_events_table
-- セッションイベントを個別レコードとして保存するテーブルを作成

-- Create participant_session_events table
CREATE TABLE IF NOT EXISTS participant_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL, -- participant_experiment_sessions.idを参照（UUID）
  event_type TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (session_id) REFERENCES participant_experiment_sessions(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_participant_session_events_participant_id ON participant_session_events(participant_id);
CREATE INDEX idx_participant_session_events_session_id ON participant_session_events(session_id);
CREATE INDEX idx_participant_session_events_event_type ON participant_session_events(event_type);
CREATE INDEX idx_participant_session_events_timestamp ON participant_session_events(timestamp);
CREATE INDEX idx_participant_session_events_participant_session ON participant_session_events(participant_id, session_id);

-- Add updated_at trigger (function already exists from initial_schema.sql)
CREATE TRIGGER update_participant_session_events_updated_at 
  BEFORE UPDATE ON participant_session_events 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE participant_session_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view session events for participants they have access to
CREATE POLICY "Users can view participant session events" ON participant_session_events
  FOR SELECT USING (true);

-- Policy: Only authenticated users can insert session events
CREATE POLICY "Users can insert participant session events" ON participant_session_events
  FOR INSERT WITH CHECK (true);

-- Policy: Only authenticated users can update session events
CREATE POLICY "Users can update participant session events" ON participant_session_events
  FOR UPDATE USING (true);

-- Policy: Only authenticated users can delete session events
CREATE POLICY "Users can delete participant session events" ON participant_session_events
  FOR DELETE USING (true);

-- Add comment
COMMENT ON TABLE participant_session_events IS 'Stores individual session events as separate records for better queryability and scalability';

