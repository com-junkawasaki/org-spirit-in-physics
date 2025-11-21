# Neo4jからPostgreSQL + Dieselへの移行計画

## 1. データベーススキーマ設計

### 1.1 Supabaseマイグレーション作成
- `supabase/migrations/YYYYMMDDHHMMSS_migrate_neo4j_to_postgresql.sql` を作成
- Neo4jモデルをリレーショナルテーブルに変換：

**既存テーブル拡張:**
- `participants` - 既存（id, age, gender, handedness）
- `participant_experiment_sessions` - 既存（id, participant_id, session_id, session_type, start_time, end_time）

**新規テーブル作成:**
- `sessions` - Sessionノード（id, participant_id, session_index, start_ts, end_ts, events JSONB, created_at）
- `burst_emotion_data` - BurstEmotionDataノード（id, session_id, participant_id, record_id, begin_time, end_time, emotion_scores JSONB, vocal_types JSONB, created_at）
- `face_emotion_data` - FaceEmotionDataノード（id, session_id, participant_id, record_id, frame, time, emotion_scores JSONB, au_scores JSONB, probability, face_x0, face_y0, face_width, face_height, created_at）
- `language_emotion_data` - LanguageEmotionDataノード（id, session_id, participant_id, record_id, text, begin_time, end_time, emotion_scores JSONB, toxicity_scores JSONB, created_at）
- `prosody_emotion_data` - ProsodyEmotionDataノード（id, session_id, participant_id, record_id, time, emotion_scores JSONB, created_at）

**インデックス:**
- sessions: participant_id, session_id, (participant_id, session_id)
- emotion_dataテーブル: session_id, participant_id, begin_time/end_time, record_id

## 2. Rust import-service の移行

### 2.1 Diesel依存関係追加
- `performers/services/import/Cargo.toml` に追加:
  - `diesel = { version = "2.1", features = ["postgres", "chrono", "uuid", "serde_json"] }`
  - `diesel-async = { version = "0.4", features = ["postgres", "bb8"] }`
  - `bb8-diesel` - コネクションプール用

### 2.2 Dieselスキーマ生成
- `performers/services/import/src/schema.rs` を生成（`diesel print-schema`）
- `performers/services/import/src/models.rs` にモデル定義（Participant, Session, BurstEmotionData, FaceEmotionData, LanguageEmotionData, ProsodyEmotionData）

### 2.3 データベースクライアント実装
- `performers/services/import/src/db/client.rs` を作成（Neo4jClientの代替）
- `performers/services/import/src/db/mod.rs` を作成
- `performers/services/import/src/config.rs` を更新（NEO4J_* → DATABASE_URL）

### 2.4 Import処理の書き換え
- `performers/services/import/src/import/participants.rs` - Dieselクエリに変更
- `performers/services/import/src/import/sessions.rs` - Dieselクエリに変更
- `performers/services/import/src/import/emotions.rs` - Dieselクエリに変更（BurstEmotionData, FaceEmotionData, LanguageEmotionData, ProsodyEmotionData）

### 2.5 型システムの更新
- `performers/services/import/src/types/session.rs` - ValidatedSessionIdをDieselクエリベースに変更
- `performers/services/import/src/neo4j/` ディレクトリを削除または非推奨化

## 3. TypeScriptサービスの移行

### 3.1 Visualizerアプリ
- `apps/visualizer/src/lib/neo4j.ts` → `apps/visualizer/src/lib/postgres.ts` に置き換え
- `apps/visualizer/src/lib/neo4j-queries.ts` → PostgreSQLクエリに書き換え
- `apps/visualizer/src/app/api/participants/[id]/timeline/route.ts` - PostgreSQLクエリに変更
- `apps/visualizer/src/lib/neogma-models.ts` - 削除または非推奨化

### 3.2 Patientアプリ
- `apps/patient/app/api/admin/import/participants/route.ts` - PostgreSQLクエリに変更
- `apps/patient/app/api/admin/import/sessions/route.ts` - PostgreSQLクエリに変更
- `apps/patient/app/api/admin/import/emotions/route.ts` - PostgreSQLクエリに変更
- `apps/patient/scripts/src/lib/neo4j.ts` → PostgreSQLクライアントに置き換え
- `apps/patient/scripts/src/lib/database/neo4j-manager.ts` → PostgreSQLマネージャーに置き換え

### 3.3 依存関係の更新
- `apps/visualizer/package.json` - `neogma` を削除、`pg` または `@supabase/supabase-js` を追加
- `apps/patient/package.json` - 同様に更新

## 4. Docker Compose設定

### 4.1 PostgreSQLサービス追加
- `docker-compose.yml` にPostgreSQLサービスを追加（既存のSupabase設定があれば利用）
- `docker-compose.yml` からNeo4jサービスを削除またはコメントアウト

### 4.2 環境変数更新
- `apps/visualizer/env.docker` - DATABASE_URL追加、NEO4J_*削除
- `apps/patient/env.docker` - 同様に更新
- `performers/services/import` の環境変数 - DATABASE_URL追加

## 5. マイグレーション実行

### 5.1 スキーママイグレーション
- Supabaseマイグレーションを実行
- Dieselマイグレーションを実行（`diesel migration run`）

### 5.2 データ検証
- 既存のNeo4jデータは移行しない（新規データのみ）
- import-serviceで新規データが正しく保存されることを確認

## 6. テストと検証

### 6.1 単体テスト
- Rust import-serviceの各import関数のテスト
- TypeScript APIのテスト

### 6.2 統合テスト
- エンドツーエンドのimportフロー
- Timeline APIのデータ取得

## 実装順序

1. Supabaseマイグレーション作成と実行
2. Rust import-serviceのDiesel統合
3. import-serviceのimport処理書き換え
4. VisualizerアプリのPostgreSQL移行
5. PatientアプリのPostgreSQL移行
6. Docker Compose設定更新
7. テストと検証