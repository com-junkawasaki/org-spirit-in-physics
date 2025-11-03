# OWL/SHACL設計: アプリ責任・権限・データフロー

## 概要

本ドキュメントは、Spirit in Physicsシステムにおけるparticipant、researcher、解析パイプラインの責任と権限、プロセスをOWL/SHACLで設計・定義したものです。特に、participantの実験データからresearcherの3d-force-timelineへのデータ展開プロセスを詳細に定義しています。

## ファイル構造

```
ontology/
├── spirit-in-physics.owl.ttl          # メインオントロジー
├── timeline-dataflow.owl.ttl          # データフロー詳細
└── processes.owl.ttl                  # プロセス定義

shapes/
├── spirit-in-physics.shacl.ttl        # メインSHACL形状
├── permissions.shacl.ttl               # 権限定義
└── timeline-dataflow.shacl.ttl         # タイムラインデータフロー形状
```

## 名前空間

- `spirit: <https://spirit-in-physics.gftd.ai/ontology#>`
- `shacl: <http://www.w3.org/ns/shacl#>`
- `owl: <http://www.w3.org/2002/07/owl#>`

## アプリケーション責任と権限

### ParticipantApplication（参加者アプリケーション）

**責任:**
- 実験データ収集（DataCollectionProcess）
- データ保存（DataStorageProcess）

**権限:**
- 書き込み: 自身のparticipant_idのみ
- 読み取り: 自身のparticipant_idのみ
- RLSポリシー: "Users can insert their own *"

**生成データ:**
- `spirit:SessionEvent` - セッションイベント
- `spirit:WordResponse` - 単語応答
- `spirit:ConsentData` - 同意データ

### ResearcherApplication（研究者アプリケーション）

**責任:**
- データ可視化（VisualizationProcess）
- 時系列統合（TimelineIntegrationProcess）

**権限:**
- 読み取り: 全participant_id
- 書き込み: `participant_analysis_results`のみ
- Service role権限

**消費データ:**
- `spirit:SessionEvent` - セッションイベント
- `spirit:WordResponse` - 単語応答
- `spirit:EmotionData` - 感情データ

**生成データ:**
- `spirit:AnalysisResult` - 解析結果
- `spirit:TimelineData` - 時系列データ

### AnalysisPipeline（解析パイプライン）

**責任:**
- Spirit確率計算（AnalysisProcess）

**権限:**
- 読み取り: `participant_response_data`（全participant）
- 書き込み: `participant_analysis_results`（全participant）
- Service role権限

**処理:**
- 入力: `spirit:WordResponse`
- 出力: `spirit:AnalysisResult`
- 計算: Kawasaki Modelによる`spirit_probability`計算

## データフロー詳細

### 1. Participant → Supabase フロー

1. **ConsentStorageStep**: Consent取得 → `participant_consents`テーブル
2. **SessionStorageStep**: Session開始 → `participant_experiment_sessions`テーブル
3. **EventStorageStep**: Event記録 → `participant_session_events`テーブル
4. **WordResponseStorageStep**: WordResponse記録 → `participant_response_data`テーブル
5. **VideoStorageStep**: Video保存 → Supabase Storage (`participant-videos` bucket)

### 2. Supabase → AnalysisPipeline フロー

**トリガー:**
- Session保存完了時
- または手動実行

**処理:**
1. **ResponseDataRetrievalStep**: `participant_response_data`（participantIdでフィルタ）を取得
2. **SpiritProbabilityCalculationStep**: `calculateSpiritProbabilities()`実行
3. **AnalysisResultStorageStep**: `participant_analysis_results`テーブルに保存

### 3. Supabase → Researcher → 3D-Force-Timeline フロー

1. **TimelineAPIEndpointCall**: `/api/participants/[id]/timeline`エンドポイント呼び出し
2. **SessionDataRetrievalStep**: `getSessionData()` - `participant_session_events`から取得
3. **EmotionDataRetrievalStep**: `getEmotionData()` - `participant_hume_*_predictions`から取得
4. **PhysiologicalDataRetrievalStep**: `getPhysiologicalData()` - 将来実装予定
5. **TimelineDataIntegrationStep**: `integrateTimelineData()` - 時系列データ統合
6. **TimelineVisualizationStep**: TimelineVisualizationコンポーネントで3D可視化

## TimelineIntegrationProcess詳細

### 入力
- `spirit:SessionEvent` - セッションイベント（必須）
- `spirit:EmotionData` - 感情データ（オプション）
- `spirit:PhysiologicalData` - 生理データ（オプション）

### 出力
- `spirit:TimelineData` - 時系列データ（必須）

### 変換ルール

#### 1. 時間範囲マッチング
```
emotion.beginTime <= relativeTimestamp <= emotion.endTime
```
- セッション開始時刻を基準に相対時間でマッチング
- 感情データの時間範囲内のイベントを抽出

#### 2. 感情データ統合
```javascript
emotionDetails[] = {
  name: emotion.name,
  score: emotion.score,
  fileType: emotion.fileType  // "burst" | "face" | "language" | "prosody"
}
```

#### 3. 生理データ統合
```javascript
physiologicalValues = {
  average: number,
  max: number,
  min: number,
  channels: {
    ch1: number,
    ch2: number,
    ...
  }
}
```

#### 4. 統合データポイント作成
```javascript
timelineDataPoint = {
  timestamp: number,
  word: string,
  eventType: string,
  emotions: emotionDetails[],
  physiological: physiologicalValues,
  reactionValue: number,  // emotionValues.total + physiologicalValues.average
  metadata: {
    emotionCount: number,
    physiologicalCount: number
  }
}
```

## 権限とRLSポリシーの対応

### ParticipantApplication
- **RLSポリシー**: "Users can view/insert/update their own *"
- **SHACL権限**: `spirit:ParticipantWritePermission`, `spirit:ParticipantReadPermission`
- **対象テーブル**: `participants`, `participant_consents`, `participant_experiment_sessions`, `participant_session_events`, `participant_response_data`

### ResearcherApplication / AnalysisPipeline
- **RLSポリシー**: Service role bypasses RLS
- **SHACL権限**: `spirit:ServiceRolePermission`
- **対象テーブル**: 全テーブル読み取り、`participant_analysis_results`書き込み

## 実装ファイルとの対応

### コード参照

- **セッションデータ保存**: `apps/participant/src/server/api/routers/sessions.ts`
- **タイムラインデータ取得**: `apps/researcher/src/app/api/participants/[id]/timeline/route.ts`
- **解析パイプライン**: `apps/researcher/src/lib/workflows/analysis-pipeline.ts`
- **3D可視化コンポーネント**: `apps/researcher/src/components/TimelineVisualization.tsx`
- **RLSポリシー**: `supabase/migrations/20241004000002_enable_rls_policies.sql`

### データベーステーブル

- `participants` - 参加者情報
- `participant_consents` - 同意情報
- `participant_experiment_sessions` - 実験セッション
- `participant_session_events` - セッションイベント
- `participant_response_data` - 単語応答データ
- `participant_analysis_results` - 解析結果
- `participant_hume_*_predictions` - 感情分析データ

## 検証

SHACL形状定義により、以下の検証が可能です：

1. **アプリケーション責任の検証**: 各アプリケーションが適切な責任を持っているか
2. **権限の検証**: 各アプリケーションが適切な権限を持っているか
3. **データフローの検証**: データフローが正しく定義されているか
4. **プロセス実行順序の検証**: プロセスの実行順序が正しいか
5. **データ構造の検証**: TimelineDataなどのデータ構造が正しいか

## 拡張性

本設計は以下の拡張に対応可能です：

- 新しいアプリケーションの追加
- 新しいデータタイプの追加
- 新しいプロセスの追加
- 新しい権限モデルの追加
- 新しいデータフローの追加

## 参考文献

- [OWL 2 Web Ontology Language](https://www.w3.org/TR/owl2-overview/)
- [SHACL Shapes Constraint Language](https://www.w3.org/TR/shacl/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

