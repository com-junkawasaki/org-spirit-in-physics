-- Emotion data table for storing multiple emotion scores per response
CREATE TABLE emotion_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_response_data_id UUID NOT NULL REFERENCES participant_response_data(id) ON DELETE CASCADE,
  emotion_name TEXT NOT NULL,  -- joy, sadness, anger, fear, surprise, disgust, calm, focus, excitement, confusion
  score DOUBLE PRECISION NOT NULL CHECK (score >= 0 AND score <= 1),
  file_type TEXT,  -- hume_csv, hume_json等
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emotion_data_response_id ON emotion_data(participant_response_data_id);
CREATE INDEX idx_emotion_data_timestamp ON emotion_data(timestamp);
CREATE INDEX idx_emotion_data_emotion_name ON emotion_data(emotion_name);

