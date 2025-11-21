-- Merkle DAG: enum_optimization -> create_enum_types
-- 固定値のTEXT型をENUM型に変換するためのENUM型定義

-- 1. emotion_file_type ENUM型の作成
CREATE TYPE emotion_file_type AS ENUM ('burst', 'face', 'language', 'prosody');

-- 2. handedness_type ENUM型の作成
CREATE TYPE handedness_type AS ENUM ('left', 'right', 'ambidextrous', 'unknown');

-- 3. event_type ENUM型の作成（既存のevent_typesテーブルから値を動的に抽出）
-- 注意: 既存の値を確認してからENUM型を作成する必要があるため、
-- 20250114000018_convert_to_enum_types.sqlで動的に作成する

-- 4. agreement_type ENUM型の作成（既存のagreement_typesテーブルから値を動的に抽出）
-- 注意: 既存の値を確認してからENUM型を作成する必要があるため、
-- 20250114000018_convert_to_enum_types.sqlで動的に作成する

-- 5. measurement_type ENUM型の作成（既存のphysiological_measurement_typesテーブルから値を動的に抽出）
-- 注意: 既存の値を確認してからENUM型を作成する必要があるため、
-- 20250114000018_convert_to_enum_types.sqlで動的に作成する

