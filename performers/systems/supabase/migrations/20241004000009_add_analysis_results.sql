-- Merkle DAG: hume_integration_schema -> analysis_results_schema

-- Create participant_analysis_results table for storing detailed analysis results
CREATE TABLE participant_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  experiment_id UUID NOT NULL,
  word_stimulus_id INTEGER NOT NULL REFERENCES word_stimuli(id),
  stimulus_word TEXT NOT NULL,
  response_word TEXT NOT NULL,
  reaction_time_ms INTEGER,
  spirit_probability DECIMAL(5,4) NOT NULL,
  word2vec_component DECIMAL(5,4),
  reaction_time_component DECIMAL(5,4),
  skin_potential_component DECIMAL(5,4),
  emotion_component DECIMAL(5,4),
  emotion_data JSONB DEFAULT '{}',
  physiological_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_participant_analysis_results_participant_id ON participant_analysis_results(participant_id);
CREATE INDEX idx_participant_analysis_results_experiment_id ON participant_analysis_results(experiment_id);
CREATE INDEX idx_participant_analysis_results_word_stimulus_id ON participant_analysis_results(word_stimulus_id);
CREATE INDEX idx_participant_analysis_results_spirit_probability ON participant_analysis_results(spirit_probability);
CREATE INDEX idx_participant_analysis_results_created_at ON participant_analysis_results(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_participant_analysis_results_updated_at BEFORE UPDATE ON participant_analysis_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for participant_analysis_results
ALTER TABLE participant_analysis_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view analysis results for participants they have access to
CREATE POLICY "Users can view participant analysis results" ON participant_analysis_results
  FOR SELECT USING (true);

-- Policy: Only authenticated users can insert analysis results
CREATE POLICY "Authenticated users can insert analysis results" ON participant_analysis_results
  FOR INSERT WITH CHECK (true);

-- Policy: Only authenticated users can update analysis results
CREATE POLICY "Authenticated users can update analysis results" ON participant_analysis_results
  FOR UPDATE USING (true);

-- Policy: Only authenticated users can delete analysis results
CREATE POLICY "Authenticated users can delete analysis results" ON participant_analysis_results
  FOR DELETE USING (true);
