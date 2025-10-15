# @import/ で @participants/ の実験データを import する手順

## 概要

このドキュメントでは、`@participants/` ディレクトリの実験データを `@import/` 機能を通じてインポートする手順を定義します。

## アーキテクチャ

### Merkle DAG 構造
```
import/
├── participants/           # 参加者データインポート
│   ├── scan_participants   # ディレクトリスキャン
│   ├── read_consent        # consent.json 読み取り
│   ├── validate_consent    # データ検証
│   ├── check_existing      # 重複チェック
│   ├── create_participant  # Neo4j ノード作成
│   └── update_metadata     # メタデータ更新
├── sessions/               # セッションデータインポート
│   ├── read_session_data   # session_data.json 読み取り
│   ├── validate_session    # データ検証
│   ├── extract_responses   # 単語応答抽出
│   ├── calculate_stats     # 統計計算
│   └── store_responses     # Neo4j 格納
└── emotions/               # 感情分析データインポート
    ├── find_hume_data      # HumeAI_artifacts 検索
    ├── process_predictions # 予測データ処理
    ├── process_csv_data    # CSV データ処理
    └── store_emotions      # Neo4j 格納
```

## データ構造

### @participants/ ディレクトリ構造
```
dataset/participants/{participantId}/
├── consent.json              # 同意情報
├── session_data.json         # セッションイベントデータ
├── *.CSV                     # 生理データ（Mod-002）
├── HumeAI_artifacts_*/       # Hume AI 感情分析結果
│   ├── HumeAI_predictions_*.json  # 感情予測データ
│   └── registry_file-*/csv/*/     # CSV 形式の詳細データ
└── session-*-video.webm      # ビデオファイル
```

### Neo4j グラフ構造
```
(Participant)-[:HAS_SESSION]->(SessionEvent)
(Participant)-[:HAS_EMOTION_ANALYSIS]->(EmotionAnalysis)
(Participant)-[:HAS_PHYSIOLOGICAL_DATA]->(PhysiologicalData)
```

## API エンドポイント

### 1. 参加者データインポート
**Endpoint:** `POST /api/admin/import/participants`

**処理フロー:**
1. `dataset/participants/` ディレクトリスキャン
2. 各参加者ディレクトリの `consent.json` を読み取り
3. データ構造検証（participantId, agreedAt 必須）
4. Neo4j での重複チェック
5. 参加者ノード作成（ACID トランザクション）
6. メタデータ更新（hasSessionData, hasVideoFiles, hasHumeData）

### 2. セッションデータインポート
**Endpoint:** `POST /api/admin/import/sessions`

**処理フロー:**
1. 参加者存在確認
2. `session_data.json` 読み取り
3. イベントデータ検証
4. 重複セッションデータチェック
5. 単語応答データ抽出（response_window_closed イベント）
6. セッション統計計算（平均反応時間、継続時間）
7. Neo4j へのイベントデータ格納

### 3. 感情分析データインポート
**Endpoint:** `POST /api/admin/import/emotions`

**処理フロー:**
1. 参加者存在確認
2. `HumeAI_artifacts_*` ディレクトリ検索
3. `HumeAI_predictions_*.json` 読み取り
4. 感情データ構造検証
5. 重複感情データチェック
6. 感情エントリ処理（テキスト、時間、感情スコア）
7. CSV データ処理（バースト、韻律、言語、顔データ）
8. Neo4j への感情データ格納

## UI インターフェース

### インポートページ (`/admin/import`)
- **タブ構造:** 参加者データ / セッションデータ / 感情分析データ
- **各タブ機能:**
  - インポート実行ボタン
  - リアルタイム進捗表示
  - 結果表示（成功/エラー/スキップ）
  - 詳細なエラーメッセージ

### ステータス表示
```typescript
type ImportStatus = 'idle' | 'running' | 'completed' | 'error';

interface ImportResult {
  participantId: string;
  status: 'success' | 'error';
  message: string;
  details?: any;
}
```

## エラーハンドリング

### エラータイプ
- **file_not_found:** 必須ファイルが存在しない
- **invalid_format:** データ構造が不正
- **database_error:** Neo4j 操作失敗
- **duplicate_data:** 重複データ検出
- **network_error:** 接続エラー

### エラーログ
```typescript
interface ImportError {
  participantId: string;
  stage: 'validation' | 'file_read' | 'database' | 'processing';
  errorType: string;
  message: string;
  details?: any;
  timestamp: string;
  recoverable: boolean;
}
```

### リトライ戦略
- **参加者インポート:** ファイル不在時はスキップ（recoverable = true）
- **セッションインポート:** DB エラー時はリトライ（recoverable = true）
- **感情インポート:** データ破損時はスキップ（recoverable = false）

## トランザクション管理（ACID）

### Atomicity（原子性）
- 各参加者のインポートは完全成功または完全失敗
- 部分的なコミットは許可されない

### Consistency（一貫性）
- 参照整合性の検証（参加者存在確認）
- データ構造の整合性チェック

### Isolation（分離性）
- 並行インポート時の競合防止
- トランザクション内でのみデータ変更

### Durability（持続性）
- コミットされた変更は永続的に保存
- ログファイルによる監査証跡

## 実行手順

### 1. 前提条件確認
```bash
# データセット存在確認
ls -la dataset/participants/

# Neo4j 接続確認
# 環境変数設定確認
```

### 2. インポート実行
```typescript
// 参加者データインポート
const participantResult = await fetch('/api/admin/import/participants', {
  method: 'POST'
});

// セッションデータインポート
const sessionResult = await fetch('/api/admin/import/sessions', {
  method: 'POST'
});

// 感情分析データインポート
const emotionResult = await fetch('/api/admin/import/emotions', {
  method: 'POST'
});
```

### 3. 結果確認
- UI でのステータス確認
- ログファイル確認 (`logs/imports/{importId}.json`)
- Neo4j でのデータ検証

## 監視と保守

### ログ管理
- インポートログは `logs/imports/` に保存
- 30日を超えたログは自動削除
- エラーレポート生成機能

### パフォーマンス監視
- 大規模データセットでのメモリ使用量監視
- Neo4j クエリ実行時間監視
- 並行処理数の最適化

### データ品質保証
- インポート後のデータ整合性検証
- 重複データ検出と除去
- 不正データのパージ機能

## セキュリティ考慮事項

- **データ検証:** すべての入力データを構造検証
- **権限管理:** 管理者権限でのみ実行可能
- **ログセキュリティ:** 個人情報はログに記録しない
- **トランザクション分離:** 他の操作との干渉防止

## 拡張性

### 新しいデータタイプ追加
1. 新しい API エンドポイント作成
2. データ構造定義追加
3. トランザクション操作追加
4. UI タブ追加

### パフォーマンス最適化
- バッチ処理の実装
- 非同期インポートキュー
- 並列処理の最適化

この手順により、`@participants/` の実験データを安全かつ効率的に `@import/` 機能を通じてインポートすることができます。
