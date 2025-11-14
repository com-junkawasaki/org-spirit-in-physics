-- Merkle DAG: session_events_normalization -> session_events_table
-- セッションイベントのJSONBを正規化テーブルに変換

-- イベントタイプのマスターテーブル
CREATE TABLE IF NOT EXISTS event_types (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL UNIQUE, -- 'word_displayed', 'word_response', 'session_start', 'session_end', etc.
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- セッションイベントテーブル
CREATE TABLE IF NOT EXISTS session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_type_id INTEGER NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  event_timestamp BIGINT NOT NULL, -- Unix timestamp in milliseconds
  event_data TEXT, -- イベント固有のデータ（必要に応じて）
  word_id INTEGER REFERENCES word_stimuli(id) ON DELETE SET NULL,
  reaction_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_event_type ON session_events(event_type_id);
CREATE INDEX IF NOT EXISTS idx_session_events_timestamp ON session_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_session_events_word_id ON session_events(word_id);

-- 初期データ投入（sessions.eventsから）
-- イベントタイプを抽出して登録
INSERT INTO event_types (event_type) 
SELECT DISTINCT 
  (event->>'type')::TEXT as event_type
FROM sessions,
  LATERAL jsonb_array_elements(events) as event
WHERE events != '[]'::jsonb
ON CONFLICT (event_type) DO NOTHING;

