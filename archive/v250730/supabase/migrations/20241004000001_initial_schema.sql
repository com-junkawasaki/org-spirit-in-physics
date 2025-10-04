-- Create custom types
CREATE TYPE session_type AS ENUM ('session-1', 'session-2');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer-not-to-say');

-- Create participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age INTEGER,
  gender gender_type,
  handedness TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create consents table
CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  signature TEXT NOT NULL,
  agreements JSONB NOT NULL DEFAULT '{}',
  agreed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_id)
);

-- Create experiment_sessions table
CREATE TABLE experiment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  session_type session_type NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_id, session_id)
);

-- Create word_stimuli table
CREATE TABLE word_stimuli (
  id INTEGER PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create response_data table
CREATE TABLE response_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  experiment_id UUID NOT NULL,
  word_stimulus_id INTEGER NOT NULL REFERENCES word_stimuli(id),
  stimulus_word TEXT NOT NULL,
  response_word TEXT NOT NULL,
  reaction_time_ms INTEGER NOT NULL,
  session session_type NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  audio_file_path TEXT,
  video_file_path TEXT,
  skin_potential DECIMAL(10,4),
  emotion TEXT,
  emotion_confidence DECIMAL(5,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_participants_created_at ON participants(created_at);
CREATE INDEX idx_consents_participant_id ON consents(participant_id);
CREATE INDEX idx_experiment_sessions_participant_id ON experiment_sessions(participant_id);
CREATE INDEX idx_experiment_sessions_session_type ON experiment_sessions(session_type);
CREATE INDEX idx_response_data_participant_id ON response_data(participant_id);
CREATE INDEX idx_response_data_experiment_id ON response_data(experiment_id);
CREATE INDEX idx_response_data_session ON response_data(session);
CREATE INDEX idx_response_data_timestamp ON response_data(timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consents_updated_at BEFORE UPDATE ON consents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_experiment_sessions_updated_at BEFORE UPDATE ON experiment_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_response_data_updated_at BEFORE UPDATE ON response_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
