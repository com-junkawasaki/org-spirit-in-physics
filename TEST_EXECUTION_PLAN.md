# テストと検証実行計画

**作成日**: 2025-11-02  
**優先度**: 高

---

## 📋 テスト実行チェックリスト

### 1. 環境準備

- [ ] Supabaseプロジェクトが起動している
- [ ] 環境変数が設定されている
  ```bash
  export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
  ```
- [ ] Patient Appが起動している（ポート25250）
- [ ] Visualizer Appが起動している（ポート3000）

### 2. データベース接続とスキーマ検証

```bash
# 検証スクリプトを実行
tsx scripts/verify-supabase-migration.ts
```

**期待される結果**:
- ✅ Supabase接続成功
- ✅ 11テーブル全て存在確認
- ✅ データアクセス層動作確認
- ✅ リレーションシップ整合性確認

### 3. APIエンドポイント動作確認

```bash
# APIテストスクリプトを実行
bash scripts/test-api-endpoints.sh
```

**テスト対象**:
- GET /api/participants
- GET /api/dashboard-stats
- GET /api/analysis-report
- GET /api/admin/experimental-data
- POST /api/pipeline/save-to-neo4j (410エラー期待)

### 4. パフォーマンス検証

```bash
# パフォーマンステストを実行
tsx scripts/performance-test.ts
```

**評価基準**:
- 良好: 全クエリが500ms未満
- 要改善: 500ms以上1秒未満
- 要最適化: 1秒以上

### 5. データ整合性検証

手動SQLクエリで確認:
- 孤立したセッションがないか
- 孤立した応答データがないか
- 孤立した感情分析データがないか

---

## 🚀 クイック実行コマンド

```bash
# 1. 環境変数設定
source .envrc

# 2. データベース検証
tsx scripts/verify-supabase-migration.ts

# 3. パフォーマンステスト
tsx scripts/performance-test.ts

# 4. APIテスト（アプリ起動後）
bash scripts/test-api-endpoints.sh
```

---

## 📊 テスト結果記録テンプレート

```markdown
## テスト実行日: YYYY-MM-DD

### データベース接続検証
- [ ] Supabase接続: ✅/❌
- [ ] テーブル確認: ✅/❌ (X/11)
- [ ] データアクセス: ✅/❌
- [ ] リレーションシップ: ✅/❌

### APIエンドポイントテスト
- [ ] GET /api/participants: ✅/❌ (HTTP XXX)
- [ ] GET /api/dashboard-stats: ✅/❌ (HTTP XXX)
- [ ] POST /api/pipeline/save-to-neo4j: ✅/❌ (HTTP 410期待)

### パフォーマンステスト
- 平均実行時間: XXXms
- 最大実行時間: XXXms
- 評価: ✅ 良好 / ⚠️ 要改善 / ❌ 要最適化

### 問題点
- なし / [問題を記載]

### 次のアクション
- なし / [アクションを記載]
```

