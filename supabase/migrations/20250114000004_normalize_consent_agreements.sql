-- Merkle DAG: consent_normalization -> consent_agreements_table
-- 同意項目のJSONBを正規化テーブルに変換

-- 同意項目タイプのマスターテーブル
CREATE TABLE IF NOT EXISTS agreement_types (
  id SERIAL PRIMARY KEY,
  agreement_type TEXT NOT NULL UNIQUE, -- 'understand', 'voluntary', 'withdraw', 'recording', etc.
  description TEXT,
  required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 同意項目テーブル
CREATE TABLE IF NOT EXISTS consent_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_consent_id UUID NOT NULL REFERENCES participant_consents(id) ON DELETE CASCADE,
  agreement_type_id INTEGER NOT NULL REFERENCES agreement_types(id) ON DELETE CASCADE,
  agreed BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_consent_id, agreement_type_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_consent_agreements_consent_id ON consent_agreements(participant_consent_id);
CREATE INDEX IF NOT EXISTS idx_consent_agreements_agreement_type ON consent_agreements(agreement_type_id);

-- 初期データ投入（participant_consents.agreementsから）
-- 同意項目タイプを抽出して登録
INSERT INTO agreement_types (agreement_type) 
SELECT DISTINCT 
  jsonb_object_keys(agreements)::TEXT as agreement_type
FROM participant_consents 
WHERE agreements != '{}'::jsonb
ON CONFLICT (agreement_type) DO NOTHING;

