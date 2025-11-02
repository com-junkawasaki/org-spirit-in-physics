# Supabase移行後のテストガイド

このドキュメントは、Neo4jからSupabaseへの移行後のテストと検証手順を説明します。

---

## 📋 テスト概要

### 1. データベース接続とスキーマ検証

#### 検証スクリプトの実行

```bash
# 環境変数を設定
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# 検証スクリプトを実行
tsx scripts/verify-supabase-migration.ts
```

**検証項目:**
- ✅ Supabase接続の確認
- ✅ 必須テーブルの存在確認（11テーブル）
- ✅ データアクセス層の動作確認
- ✅ データリレーションシップの整合性確認

**期待される結果:**
- 全ての検証が成功（✅）
- エラーがないこと

---

### 2. APIエンドポイントの動作確認

#### テストスクリプトの実行

```bash
# Visualizer Appが起動していることを確認
# Patient Appが起動していることを確認

# テストスクリプトを実行
BASE_URL=http://localhost:3000 \
PATIENT_BASE_URL=http://localhost:25250 \
VISUALIZER_BASE_URL=http://localhost:3000 \
TEST_PARTICIPANT_ID="your-participant-id" \
bash scripts/test-api-endpoints.sh
```

**テスト対象API:**

**Visualizer App:**
- `GET /api/participants` - 参加者一覧取得
- `GET /api/dashboard-stats` - ダッシュボード統計取得
- `GET /api/analysis-report` - 分析レポート取得
- `GET /api/participants/[id]/timeline` - 参加者タイムライン取得
- `GET /api/participants/[id]/word2vec` - Word2Vecデータ取得

**Patient App:**
- `GET /api/admin/experimental-data?type=participants` - 実験データ取得
- `GET /api/admin/experimental-data?type=analytics` - 分析データ取得

**非推奨エンドポイント:**
- `POST /api/pipeline/save-to-neo4j` - 410エラーを返すことを確認

---

### 3. パフォーマンス検証

#### パフォーマンステストの実行

```bash
# 環境変数を設定
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# パフォーマンステストを実行
tsx scripts/performance-test.ts
```

**測定項目:**
- 参加者一覧取得の実行時間
- セッション一覧取得の実行時間
- 応答データ取得の実行時間
- 感情分析ジョブ取得の実行時間
- 分析結果取得の実行時間
- 集計クエリの実行時間

**パフォーマンス基準:**
- **良好**: 全てのクエリが500ms未満
- **要改善**: 一部のクエリが500ms以上1秒未満
- **要最適化**: 1秒以上のクエリがある

**最適化が必要な場合:**
```bash
# インデックス最適化SQLを実行
psql $DATABASE_URL -f supabase/migrations/optimize_indexes.sql
```

---

### 4. データ整合性の検証

#### 手動検証項目

1. **参加者とセッションの関係**
   ```sql
   -- 孤立したセッションがないか確認
   SELECT s.id, s.participant_id 
   FROM participant_experiment_sessions s
   LEFT JOIN participants p ON s.participant_id = p.id
   WHERE p.id IS NULL;
   ```

2. **セッションと応答データの関係**
   ```sql
   -- 孤立した応答データがないか確認
   SELECT r.id, r.experiment_id
   FROM participant_response_data r
   LEFT JOIN participant_experiment_sessions s ON r.experiment_id = s.id
   WHERE s.id IS NULL;
   ```

3. **感情分析ジョブと予測データの関係**
   ```sql
   -- 孤立した予測データがないか確認
   SELECT p.id, p.job_id
   FROM participant_hume_language_predictions p
   LEFT JOIN participant_hume_analysis_jobs j ON p.job_id = j.id
   WHERE j.id IS NULL;
   ```

---

### 5. エンドツーエンドテスト

#### 主要ワークフローの確認

1. **参加者データインポート**
   ```bash
   curl -X POST http://localhost:25250/api/admin/import/participants
   ```

2. **セッションデータインポート**
   ```bash
   curl -X POST http://localhost:25250/api/admin/import/sessions
   ```

3. **感情データインポート**
   ```bash
   curl -X POST http://localhost:25250/api/admin/import/emotions
   ```

4. **データ可視化**
   - Visualizer Appのダッシュボードにアクセス
   - 参加者一覧が表示されることを確認
   - 参加者詳細ページが正常に動作することを確認

---

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. 接続エラー

**症状**: `Failed to connect to Supabase`

**解決方法:**
- 環境変数が正しく設定されているか確認
- Supabaseプロジェクトが有効か確認
- ネットワーク接続を確認

#### 2. テーブルが見つからない

**症状**: `relation "participants" does not exist`

**解決方法:**
- Supabaseダッシュボードでテーブルが存在するか確認
- マイグレーションが実行されているか確認

#### 3. 権限エラー

**症状**: `permission denied for table`

**解決方法:**
- Row Level Security (RLS) ポリシーを確認
- アノンキーに適切な権限があるか確認

#### 4. パフォーマンスが遅い

**症状**: クエリが1秒以上かかる

**解決方法:**
- インデックス最適化SQLを実行
- EXPLAIN ANALYZEでクエリプランを確認
- 不要なデータを削除

---

## 📊 テスト結果の記録

テスト結果は以下の形式で記録してください：

```markdown
## テスト実行日: YYYY-MM-DD

### データベース接続検証
- [x] Supabase接続: ✅ 成功
- [x] テーブル確認: ✅ 11/11 テーブル存在
- [x] データアクセス: ✅ 成功
- [x] リレーションシップ: ✅ 整合性確認済み

### APIエンドポイントテスト
- [x] GET /api/participants: ✅ HTTP 200
- [x] GET /api/dashboard-stats: ✅ HTTP 200
- [x] POST /api/pipeline/save-to-neo4j: ✅ HTTP 410 (期待通り)

### パフォーマンステスト
- 平均実行時間: 245ms
- 最大実行時間: 521ms
- 評価: ✅ 良好

### 問題点
- なし

### 次のアクション
- なし
```

---

## 🚀 クイックスタート

全てのテストを一度に実行する場合：

```bash
# 1. 環境変数を設定
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# 2. データベース検証
tsx scripts/verify-supabase-migration.ts

# 3. パフォーマンステスト
tsx scripts/performance-test.ts

# 4. APIエンドポイントテスト（アプリ起動後）
bash scripts/test-api-endpoints.sh
```

---

**テスト完了後、問題がなければ本番環境へのデプロイを検討できます。**

