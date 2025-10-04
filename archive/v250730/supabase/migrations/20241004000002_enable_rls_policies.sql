-- Enable Row Level Security on all tables
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_experiment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_stimuli ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_response_data ENABLE ROW LEVEL SECURITY;

-- Create policies for participants table
-- Participants can only see their own data
CREATE POLICY "Users can view their own participant data" ON participants
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own participant data" ON participants
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own participant data" ON participants
  FOR UPDATE USING (auth.uid() = id);

-- Create policies for participant_consents table
-- Users can only see and manage their own consents
CREATE POLICY "Users can view their own consents" ON participant_consents
  FOR SELECT USING (
    participant_id IN (
      SELECT id FROM participants WHERE auth.uid() = id
    )
  );

CREATE POLICY "Users can insert their own consents" ON participant_consents
  FOR INSERT WITH CHECK (
    participant_id IN (
      SELECT id FROM participants WHERE auth.uid() = id
    )
  );

CREATE POLICY "Users can update their own consents" ON participant_consents
  FOR UPDATE USING (
    participant_id IN (
      SELECT id FROM participants WHERE auth.uid() = id
    )
  );

-- Create policies for participant_experiment_sessions table
-- Users can only see and manage their own sessions
CREATE POLICY "Users can view their own experiment sessions" ON participant_experiment_sessions
  FOR SELECT USING (
    participant_id IN (
      SELECT id FROM participants WHERE auth.uid() = id
    )
  );

CREATE POLICY "Users can insert their own experiment sessions" ON participant_experiment_sessions
  FOR INSERT WITH CHECK (
    participant_id IN (
      SELECT id FROM participants WHERE auth.uid() = id
    )
  );

CREATE POLICY "Users can update their own experiment sessions" ON participant_experiment_sessions
  FOR UPDATE USING (
    participant_id IN (
      SELECT id FROM participants WHERE auth.uid() = id
    )
  );

-- Create policies for word_stimuli table
-- Word stimuli are read-only and available to all authenticated users
CREATE POLICY "Authenticated users can view word stimuli" ON word_stimuli
  FOR SELECT TO authenticated USING (true);

-- Create policies for participant_response_data table
-- Users can only see and manage their own response data
CREATE POLICY "Users can view their own response data" ON participant_response_data
  FOR SELECT USING (
    participant_id IN (
      SELECT id FROM participants WHERE auth.uid() = id
    )
  );

CREATE POLICY "Users can insert their own response data" ON participant_response_data
  FOR INSERT WITH CHECK (
    participant_id IN (
      SELECT id FROM participants WHERE auth.uid() = id
    )
  );

CREATE POLICY "Users can update their own response data" ON participant_response_data
  FOR UPDATE USING (
    participant_id IN (
      SELECT id FROM participants WHERE auth.uid() = id
    )
  );

-- Allow service role to bypass RLS for administrative operations
-- This is needed for server-side operations
ALTER TABLE participants FORCE ROW LEVEL SECURITY;
ALTER TABLE participant_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE participant_experiment_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE word_stimuli FORCE ROW LEVEL SECURITY;
ALTER TABLE participant_response_data FORCE ROW LEVEL SECURITY;
