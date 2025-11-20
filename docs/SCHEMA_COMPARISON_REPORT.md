# スキーマ比較レポート

## 実施日時
2025年11月20日

## 目的
ローカルデータベーススキーマとSupabase本番データベーススキーマの一致状況を評価する。

## 接続情報

### ローカルデータベース
- URL: `postgresql://postgres:postgres@localhost:5432/spirit_in_physics`
- PostgreSQLバージョン: 15.x (TimescaleDB 2.23.1)

### Supabase本番データベース
- URL: `postgresql://postgres.pxsuqemlayhnmcxuiigk:***@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`
- PostgreSQLバージョン: 17.4 (ドキュメントより)

## ローカルデータベーススキーマ

### テーブル一覧 (18テーブル)

1. `hume_burst_emotion_data`
2. `hume_burst_emotion_scores`
3. `hume_burst_metadata`
4. `hume_face_emotion_data`
5. `hume_face_emotion_scores`
6. `hume_face_metadata`
7. `hume_language_emotion_data`
8. `hume_language_emotion_scores`
9. `hume_language_metadata`
10. `hume_prosody_emotion_data`
11. `hume_prosody_emotion_scores`
12. `hume_prosody_metadata`
13. `participants`
14. `physiological_measurements`
15. `session_events`
16. `sessions`
17. `timeline_emotion_entries`
18. `timeline_points`

### `timeline_points`テーブル構造

| カラム名 | データ型 | NULL許可 | デフォルト値 |
|---------|---------|---------|------------|
| `time` | `timestamp with time zone` | NO | - |
| `participant_id` | `uuid` | NO | - |
| `session_id` | `uuid` | NO | - |
| `word` | `text` | YES | - |
| `event_type` | `text` | YES | - |
| `reaction_value` | `double precision` | YES | - |
| `reaction_time` | `double precision` | YES | - |
| `has_response` | `boolean` | YES | `false` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `metadata` | `jsonb` | YES | `'{}'::jsonb` |

**主キー**: `(time, participant_id, session_id)`

**インデックス**:
- `timeline_points_pkey` (PRIMARY KEY)
- `idx_timeline_points_participant_session_time`
- `idx_timeline_points_participant_time`
- `idx_timeline_points_session_time`
- `idx_timeline_points_time`
- `idx_timeline_points_word_time`
- `timeline_points_time_idx`

**外部キー制約**:
- `timeline_points_participant_id_fkey` → `participants(id)`
- `timeline_points_session_id_fkey` → `sessions(id)`

**参照されているテーブル**:
- `physiological_measurements`
- `timeline_emotion_entries`

**トリガー**:
- `refresh_timeline_views_trigger` → `trigger_refresh_timeline_views()`

**TimescaleDB**:
- ハイパーテーブルとして設定済み
- パーティションキー: `time`

## マイグレーションファイルからの期待値

### `20250111000002_create_timeseries_tables.sql`
- `metadata JSONB DEFAULT '{}'` カラムが定義されている

### `20250114000031_remove_jsonb_columns.sql`
- `emotions` と `physiological` カラムは削除される
- `metadata` カラムは削除されない（このマイグレーションでは対象外）

### 現在の状態
- ✅ `metadata` カラムが存在する（手動で追加済み）
- ✅ `emotions` と `physiological` カラムは削除されている
- ✅ TimescaleDBハイパーテーブルとして設定されている

## Supabase本番データベースとの比較

### 接続状況
⚠️ **接続エラー**: パスワード認証に失敗しています。

接続文字列のパスワードを確認してください：
```bash
export SUPABASE_DATABASE_URL="postgresql://postgres.pxsuqemlayhnmcxuiigk:[正しいパスワード]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
```

### 推奨される確認方法

1. **Supabase Dashboardから確認**
   - Supabase Dashboard > Database > Tables
   - `timeline_points`テーブルの構造を確認

2. **Supabase CLIを使用**
   ```bash
   supabase link --project-ref pxsuqemlayhnmcxuiigk --password "[パスワード]"
   supabase db diff
   ```

3. **SQL Editorから直接確認**
   ```sql
   \d timeline_points
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'timeline_points'
   ORDER BY ordinal_position;
   ```

## 重要な差分の可能性

### 1. `metadata`カラム
- **ローカル**: ✅ 存在（`jsonb DEFAULT '{}'`）
- **Supabase**: 確認必要

### 2. TimescaleDB拡張機能
- **ローカル**: ✅ TimescaleDB 2.23.1有効
- **Supabase**: ⚠️ PostgreSQL 17.4（TimescaleDBのサポート状況要確認）

### 3. インデックス
- **ローカル**: 7つのインデックスが存在
- **Supabase**: 確認必要

## 推奨アクション

1. **Supabase接続情報の確認**
   - 正しいパスワードを取得
   - 接続文字列の形式を確認

2. **スキーマ同期**
   - Supabaseに`metadata`カラムが存在しない場合は追加
   - マイグレーションファイルを適用

3. **マイグレーション適用**
   ```bash
   # Supabase CLIを使用
   supabase db push
   
   # または、SQL Editorから直接実行
   ALTER TABLE timeline_points ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
   ```

## 次のステップ

1. Supabase Dashboardから`timeline_points`テーブルの構造を確認
2. 差分があれば、マイグレーションを適用
3. 接続テストを実行して確認

