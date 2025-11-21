# マイグレーション最終報告

## 実施日
2025年1月14日

## 適用したマイグレーション

以下の13個のマイグレーションファイルを本番環境に適用しました：

1. ✅ `20250114000000_add_timeline_points_pk.sql` - timeline_pointsに主キーを追加
2. ✅ `20250114000001_normalize_emotion_scores.sql` - 感情スコアの正規化テーブル作成
3. ✅ `20250114000002_normalize_physiological_data.sql` - 生理データの正規化テーブル作成
4. ✅ `20250114000003_normalize_session_events.sql` - セッションイベントの正規化テーブル作成
5. ✅ `20250114000004_normalize_consent_agreements.sql` - 同意項目の正規化テーブル作成
6. ✅ `20250114000005_integrate_sessions_tables.sql` - セッションテーブルの統合
7. ✅ `20250114000006_migrate_jsonb_data.sql` - 既存JSONBデータの正規化テーブルへの移行
8. ✅ `20250114000007_update_views.sql` - ビューの更新
9. ✅ `20250114000008_remove_jsonb_columns.sql` - JSONBカラムの削除
10. ✅ `20250114000009_remove_stimulus_word.sql` - stimulus_wordカラムの削除
11. ✅ `20250114000010_cleanup_unused_tables.sql` - 未使用テーブルの整理
12. ✅ `20250114000011_remove_unused_tables.sql` - 不要なテーブルの削除
13. ✅ `20250114000012_recreate_views.sql` - ビューの再作成

## 最終状態

- **テーブル数**: 20テーブル
- **ビュー数**: 3ビュー
- **データがあるテーブル**: 17テーブル
- **総データ行数**: 2,309,920行

## 主な変更内容

### 正規化テーブルの作成
- 感情スコア: `burst_emotion_scores`, `face_emotion_scores`, `language_emotion_scores`, `prosody_emotion_scores`
- 生理データ: `physiological_measurements`
- セッションイベント: `session_events`
- 同意項目: `consent_agreements`（テーブルが存在する場合のみ）

### JSONBカラムの削除
- `emotion_scores` JSONBカラムを削除
- `emotions` JSONBカラムを削除
- `physiological` JSONBカラムを削除
- `events` JSONBカラムを削除
- `agreements` JSONBカラムを削除

### テーブルの統合
- `participant_experiment_sessions` → `sessions`に統合

### 不要なテーブルの削除
- 13テーブルを削除（0件で使用されていないテーブル）

## 完了日時

2025年1月14日

