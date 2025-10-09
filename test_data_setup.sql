-- テストデータセットアップスクリプト
-- このスクリプトは新しいテーブル構造とビューをテストするためのサンプルデータを作成します

-- テスト参加者データ
INSERT INTO participants (id, age, gender, handedness, created_at, updated_at)
VALUES
  ('144b325f-5966-4d59-a629-f2ca421388cc', 25, 'prefer-not-to-say', 'right', NOW(), NOW()),
  ('15592cdb-86cf-4baf-86f5-66184169ee39', 30, 'female', 'right', NOW(), NOW()),
  ('25111604-c7db-4bfd-8662-e55060e332d6', 35, 'male', 'left', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- テスト単語刺激語データ
INSERT INTO word_stimuli (id, word, created_at)
VALUES
  (1, '蛙', NOW()),
  (2, '別れる', NOW()),
  (3, '踊る', NOW()),
  (4, '塗る', NOW()),
  (5, '毛皮', NOW()),
  (6, '山', NOW()),
  (7, '怖がる', NOW()),
  (8, '幸運', NOW()),
  (9, '茎', NOW()),
  (10, '空腹', NOW())
ON CONFLICT (id) DO NOTHING;

-- テスト実験セッションデータ
INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', '144b325f-5966-4d59-a629-f2ca421388cc', '550e8400-e29b-41d4-a716-446655440000', 'session-1', '2025-08-01 10:00:00+00', '2025-08-01 10:30:00+00', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440001', '15592cdb-86cf-4baf-86f5-66184169ee39', '550e8400-e29b-41d4-a716-446655440001', 'session-2', '2025-08-01 11:00:00+00', '2025-08-01 11:30:00+00', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- テスト応答データ
INSERT INTO participant_response_data (id, participant_id, experiment_id, word_stimulus_id, stimulus_word, response_word, reaction_time_ms, session, timestamp, created_at, updated_at)
VALUES
  ('660e8400-e29b-41d4-a716-446655440000', '144b325f-5966-4d59-a629-f2ca421388cc', '550e8400-e29b-41d4-a716-446655440000', 1, '蛙', '蛙', 3062, 'session-1', '2025-08-01 10:04:57.969+00', NOW(), NOW()),
  ('660e8400-e29b-41d4-a716-446655440001', '144b325f-5966-4d59-a629-f2ca421388cc', '550e8400-e29b-41d4-a716-446655440000', 2, '別れる', '別れる', 2007, 'session-1', '2025-08-01 10:05:03.974+00', NOW(), NOW()),
  ('660e8400-e29b-41d4-a716-446655440002', '144b325f-5966-4d59-a629-f2ca421388cc', '550e8400-e29b-41d4-a716-446655440000', 3, '踊る', '踊る', 1316, 'session-1', '2025-08-01 10:05:09.981+00', NOW(), NOW()),
  ('660e8400-e29b-41d4-a716-446655440003', '144b325f-5966-4d59-a629-f2ca421388cc', '550e8400-e29b-41d4-a716-446655440000', 4, '塗る', '塗る', 1645, 'session-1', '2025-08-01 10:05:15.985+00', NOW(), NOW()),
  ('660e8400-e29b-41d4-a716-446655440004', '144b325f-5966-4d59-a629-f2ca421388cc', '550e8400-e29b-41d4-a716-446655440000', 5, '毛皮', '毛皮', 3224, 'session-1', '2025-08-01 10:05:21.99+00', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- テスト分析結果データ（複数の参加者に分散）
INSERT INTO participant_analysis_results (id, participant_id, experiment_id, word_stimulus_id, stimulus_word, response_word, reaction_time_ms, spirit_probability, word2vec_component, reaction_time_component, skin_potential_component, emotion_component, emotion_data, physiological_data, created_at, updated_at)
VALUES
  ('770e8400-e29b-41d4-a716-446655440000', '144b325f-5966-4d59-a629-f2ca421388cc', '550e8400-e29b-41d4-a716-446655440000', 1, '蛙', '蛙', 3062, 0.6231, 0.25, 0.25, 0.25, 0.25, '{"joy": 0.3, "fear": 0.1}', '{"skin_potential": -0.05}', NOW(), NOW()),
  ('770e8400-e29b-41d4-a716-446655440001', '144b325f-5966-4d59-a629-f2ca421388cc', '550e8400-e29b-41d4-a716-446655440000', 2, '別れる', '別れる', 2007, 0.6663, 0.25, 0.25, 0.25, 0.25, '{"sadness": 0.4, "anger": 0.2}', '{"skin_potential": 0.02}', NOW(), NOW()),
  ('770e8400-e29b-41d4-a716-446655440002', '144b325f-5966-4d59-a629-f2ca421388cc', '550e8400-e29b-41d4-a716-446655440000', 3, '踊る', '踊る', 1316, 0.7159, 0.25, 0.25, 0.25, 0.25, '{"joy": 0.6, "excitement": 0.3}', '{"skin_potential": 0.08}', NOW(), NOW()),
  ('770e8400-e29b-41d4-a716-446655440003', '144b325f-5966-4d59-a629-f2ca421388cc', '550e8400-e29b-41d4-a716-446655440000', 4, '塗る', '塗る', 1645, 0.6890, 0.25, 0.25, 0.25, 0.25, '{"neutral": 0.5}', '{"skin_potential": -0.02}', NOW(), NOW()),
  ('770e8400-e29b-41d4-a716-446655440004', '144b325f-5966-4d59-a629-f2ca421388cc', '550e8400-e29b-41d4-a716-446655440000', 5, '毛皮', '毛皮', 3224, 0.6184, 0.25, 0.25, 0.25, 0.25, '{"disgust": 0.2, "fear": 0.1}', '{"skin_potential": -0.08}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ブラウザでアクセス中の参加者（5ac869a3-b8db-49c3-9362-3e149a5415e9）にテストデータ追加
INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES
  ('660e8400-e29b-41d4-a716-446655440005', '5ac869a3-b8db-49c3-9362-3e149a5415e9', '660e8400-e29b-41d4-a716-446655440005', 'session-1', '2025-08-01 14:00:00+00', '2025-08-01 14:30:00+00', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 追加の分析結果データ（ブラウザでアクセス中の参加者用）
INSERT INTO participant_analysis_results (id, participant_id, experiment_id, word_stimulus_id, stimulus_word, response_word, reaction_time_ms, spirit_probability, word2vec_component, reaction_time_component, skin_potential_component, emotion_component, emotion_data, physiological_data, created_at, updated_at)
VALUES
  ('880e8400-e29b-41d4-a716-446655440010', '5ac869a3-b8db-49c3-9362-3e149a5415e9', '660e8400-e29b-41d4-a716-446655440005', 1, '喜び', '喜び', 1500, 0.9234, 0.8, 0.3, 0.2, 0.7, '{"joy": 0.9, "excitement": 0.3}', '{"skin_potential": 0.12}', NOW(), NOW()),
  ('880e8400-e29b-41d4-a716-446655440011', '5ac869a3-b8db-49c3-9362-3e149a5415e9', '660e8400-e29b-41d4-a716-446655440005', 2, '悲しみ', '悲しみ', 2200, 0.4567, 0.2, 0.8, 0.1, 0.4, '{"sadness": 0.8, "disappointment": 0.2}', '{"skin_potential": -0.15}', NOW(), NOW()),
  ('880e8400-e29b-41d4-a716-446655440012', '5ac869a3-b8db-49c3-9362-3e149a5415e9', '660e8400-e29b-41d4-a716-446655440005', 3, '怒り', '怒り', 1800, 0.6789, 0.3, 0.5, 0.6, 0.5, '{"anger": 0.7, "frustration": 0.3}', '{"skin_potential": 0.08}', NOW(), NOW()),
  ('880e8400-e29b-41d4-a716-446655440013', '5ac869a3-b8db-49c3-9362-3e149a5415e9', '660e8400-e29b-41d4-a716-446655440005', 4, '恐れ', '恐れ', 2500, 0.3456, 0.1, 0.9, 0.3, 0.3, '{"fear": 0.9, "anxiety": 0.4}', '{"skin_potential": -0.20}', NOW(), NOW()),
  ('880e8400-e29b-41d4-a716-446655440014', '5ac869a3-b8db-49c3-9362-3e149a5415e9', '660e8400-e29b-41d4-a716-446655440005', 5, '驚き', '驚き', 1200, 0.7890, 0.6, 0.2, 0.4, 0.6, '{"surprise": 0.8, "amazement": 0.2}', '{"skin_potential": 0.18}', NOW(), NOW()),
  ('880e8400-e29b-41d4-a716-446655440015', '5ac869a3-b8db-49c3-9362-3e149a5415e9', '660e8400-e29b-41d4-a716-446655440005', 6, '信頼', '信頼', 1600, 0.8543, 0.7, 0.4, 0.5, 0.8, '{"trust": 0.8, "confidence": 0.3}', '{"skin_potential": 0.05}', NOW(), NOW()),
  ('880e8400-e29b-41d4-a716-446655440016', '5ac869a3-b8db-49c3-9362-3e149a5415e9', '660e8400-e29b-41d4-a716-446655440005', 7, '希望', '希望', 1400, 0.9123, 0.9, 0.3, 0.6, 0.9, '{"hope": 0.9, "optimism": 0.2}', '{"skin_potential": 0.10}', NOW(), NOW()),
  ('880e8400-e29b-41d4-a716-446655440017', '5ac869a3-b8db-49c3-9362-3e149a5415e9', '660e8400-e29b-41d4-a716-446655440005', 8, '絶望', '絶望', 2800, 0.2345, 0.1, 0.9, 0.2, 0.2, '{"despair": 0.9, "hopelessness": 0.3}', '{"skin_potential": -0.25}', NOW(), NOW()),
  ('880e8400-e29b-41d4-a716-446655440018', '5ac869a3-b8db-49c3-9362-3e149a5415e9', '660e8400-e29b-41d4-a716-446655440005', 9, '愛情', '愛情', 1700, 0.8765, 0.8, 0.4, 0.7, 0.9, '{"love": 0.9, "affection": 0.2}', '{"skin_potential": 0.15}', NOW(), NOW()),
  ('880e8400-e29b-41d4-a716-446655440019', '5ac869a3-b8db-49c3-9362-3e149a5415e9', '660e8400-e29b-41d4-a716-446655440005', 10, '憎しみ', '憎しみ', 2100, 0.1234, 0.0, 0.8, 0.3, 0.1, '{"hate": 0.9, "anger": 0.4}', '{"skin_potential": -0.18}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
