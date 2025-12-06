# @visualization-components パッケージ機能対応表

## 概要
React版の`@visualization-components`パッケージと現在のSvelte実装の機能対応状況をまとめた表です。

---

## 1. メインコンポーネント

| コンポーネント | React版 | Svelte版 | 状態 | 備考 |
|---|---|---|---|---|
| **TimelineVisualization** | `packages/visualization-components/src/TimelineVisualization.tsx` (2946行) | `apps/svelte/src/lib/visualization-components/TimelineVisualization.svelte` (233行) | ❌ **未実装** | React版は統合ダッシュボード、Svelte版はシンプルなCanvas描画のみ |
| **Force3DWordGraph** | `packages/visualization-components/src/Force3DWordGraphTypeGPU.tsx` | `apps/svelte/src/lib/visualization-components/Force3DWordGraph.svelte` (204行) | ⚠️ **部分実装** | 基本的な3Dグラフは実装済み、コントロールパネルなし |

---

## 2. サブコンポーネント

| コンポーネント | React版 | Svelte版 | 状態 | 機能概要 |
|---|---|---|---|---|
| **TimelineChart** | `timeline/TimelineChart.tsx` (1016行) | ❌ なし | ❌ **未実装** | D3ベースのタイムラインチャート、オーバービュー、ブラシ選択、ツールチップ |
| **KPICards** | `timeline/KPICards.tsx` (127行) | ❌ なし | ❌ **未実装** | 平均反応時間、平均反応値、反応率、総反応数のKPIカード（スパークライン付き） |
| **DumbbellChart** | `timeline/DumbbellChart.tsx` (202行) | ❌ なし | ❌ **未実装** | 前半・後半の比較ダンベルチャート |
| **SmallMultiples** | `timeline/SmallMultiples.tsx` (114行) | ❌ なし | ❌ **未実装** | 単語ごとのスモールマルチプル可視化（上位12単語） |
| **Force3DControls** | `timeline/Force3DControls.tsx` (318行) | `PhysicsControls.svelte` (部分) | ⚠️ **部分実装** | 3Dフォースパラメータのコントロールパネル（プリセット、詳細設定） |
| **StructureAnalysisPanel** | `timeline/StructureAnalysisPanel.tsx` (231行) | ❌ なし | ❌ **未実装** | 空白エリア検出、密度分析、重複検出の結果表示 |
| **DebugPanel** | `timeline/DebugPanel.tsx` (399行) | `researcher/+page.svelte` (簡易版) | ⚠️ **部分実装** | データソース状態、パイプラインステップ、接続統計、感情ベクトル統計 |

---

## 3. データ取得・管理

| 機能 | React版 | Svelte版 | 状態 | 備考 |
|---|---|---|---|---|
| **useTimelineData** | `timeline/useTimelineData.ts` (447行) | `researcher/graphql-client.ts` | ⚠️ **別実装** | React版はAPIエンドポイント使用、Svelte版はGraphQLクライアント使用 |
| **データフィルタリング** | `FilterSettings` (12項目) | `filters.ts` (簡易版) | ⚠️ **部分実装** | React版はより詳細なフィルター設定 |
| **時間範囲管理** | `TimeRange` + ブラシ選択 | ❌ なし | ❌ **未実装** | D3ブラシによる時間範囲選択 |

---

## 4. 可視化モード

| モード | React版 | Svelte版 | 状態 |
|---|---|---|---|
| **timeline** | ✅ D3ベースのタイムラインチャート | ⚠️ Canvasベースの簡易版 | ⚠️ **部分実装** |
| **kpi** | ✅ KPICardsコンポーネント | ❌ なし | ❌ **未実装** |
| **dumbbell** | ✅ DumbbellChartコンポーネント | ❌ なし | ❌ **未実装** |
| **small-multiples** | ✅ SmallMultiplesコンポーネント | ❌ なし | ❌ **未実装** |
| **force-3d-typegpu** | ✅ Force3DWordGraphTypeGPU + コントロール | ⚠️ Force3DWordGraphTypeGPUのみ | ⚠️ **部分実装** |
| **distance** | ✅ 距離可視化（k-NNグラフ） | ❌ なし | ❌ **未実装** |
| **split** | ✅ 分割表示モード | ❌ なし | ❌ **未実装** |

---

## 5. ユーティリティ・ライブラリ

| 機能 | React版 | Svelte版 | 状態 | 備考 |
|---|---|---|---|---|
| **emotion-normalization** | `lib/emotion-normalization.ts` (233行) | `lib/emotion-normalization.ts` (78行) | ⚠️ **簡易版** | React版はより詳細な正規化ロジック |
| **structure-analysis** | `lib/structure-analysis.ts` (605行) | ❌ なし | ❌ **未実装** | 空白エリア検出、密度分析、重複検出、共通特徴抽出 |
| **word-distance** | `lib/word-distance.ts` (167行) | ❌ なし | ❌ **未実装** | 単語間距離計算（コサイン類似度、重み付き距離） |
| **constants/jung** | `constants/jung.ts` (JUNG_STIMULUS_WORDS) | `constants/jung.ts` | ✅ **実装済み** | 刺激語リスト |

---

## 6. 3D Force Graph機能

| 機能 | React版 | Svelte版 | 状態 |
|---|---|---|---|
| **基本3D描画** | ✅ Force3DWordGraphTypeGPU | ✅ Force3DWordGraphTypeGPU | ✅ **実装済み** |
| **フォースパラメータ** | ✅ 12個のパラメータ | ⚠️ 一部のみ | ⚠️ **部分実装** |
| **プリセット** | ✅ 4種類（balanced, tight, loose, slow） | ❌ なし | ❌ **未実装** |
| **感情アンカー** | ✅ 10個の感情アンカーノード | ❌ なし | ❌ **未実装** |
| **トポロジ調整** | ✅ topK, minW, weightGamma | ❌ なし | ❌ **未実装** |
| **Kawasaki model** | ✅ alpha, gamma, lambda, eta | ❌ なし | ❌ **未実装** |
| **距離ベースグラフ** | ✅ k-NNグラフ生成 | ❌ なし | ❌ **未実装** |

---

## 7. データ処理機能

| 機能 | React版 | Svelte版 | 状態 |
|---|---|---|---|
| **感情ベクトル正規化** | ✅ 正規化ロジック | ⚠️ 簡易版 | ⚠️ **部分実装** |
| **モダリティフィルタリング** | ✅ prosody/burst/face/language | ❌ なし | ❌ **未実装** |
| **セグメント抽出** | ✅ first100/next100/all | ❌ なし | ❌ **未実装** |
| **データ集約** | ✅ マテリアライズドビュー対応 | ⚠️ GraphQLクエリのみ | ⚠️ **部分実装** |
| **コサイン類似度計算** | ✅ 実装済み | ❌ なし | ❌ **未実装** |
| **重み付き距離計算** | ✅ 4つの指標（感情0.4、反応値0.2、反応時間0.2、生理0.2） | ❌ なし | ❌ **未実装** |

---

## 8. UI機能

| 機能 | React版 | Svelte版 | 状態 |
|---|---|---|---|
| **タブ切り替え** | ✅ timeline/force3d/words/distance/split | ❌ なし | ❌ **未実装** |
| **フィルターUI** | ✅ 詳細なフィルター設定 | ⚠️ 簡易版 | ⚠️ **部分実装** |
| **ツールチップ** | ✅ データポイント詳細表示 | ❌ なし | ❌ **未実装** |
| **データポイント選択** | ✅ クリックで選択 | ❌ なし | ❌ **未実装** |
| **時間範囲ブラシ** | ✅ D3ブラシによる選択 | ❌ なし | ❌ **未実装** |
| **単語テーブル** | ✅ 並び替え可能な単語一覧 | ❌ なし | ❌ **未実装** |
| **距離テーブル** | ✅ 単語ペア間距離一覧 | ❌ なし | ❌ **未実装** |

---

## 9. 型定義

| 型 | React版 | Svelte版 | 状態 | 差異 |
|---|---|---|---|---|
| **TimelineDataPoint** | ✅ 詳細な型定義 | ⚠️ TimelinePoint (簡易版) | ⚠️ **部分実装** | フィールド名の違い（timestamp vs time） |
| **WordAggregateData** | ✅ 完全な型定義 | ⚠️ WordAggregate (簡易版) | ⚠️ **部分実装** | フィールドの一部が不足 |
| **EmotionVectorData** | ✅ 完全な型定義 | ⚠️ EmotionVector (簡易版) | ⚠️ **部分実装** | フィールドの一部が不足 |
| **WordNode/WordLink** | ✅ 完全な型定義 | ✅ 実装済み | ✅ **実装済み** | ほぼ同等 |
| **FilterSettings** | ✅ 12項目 | ⚠️ 簡易版 | ⚠️ **部分実装** | フィルター項目が不足 |
| **ForcePreset** | ✅ 実装済み | ❌ なし | ❌ **未実装** | - |
| **WordDistancePair** | ✅ 実装済み | ❌ なし | ❌ **未実装** | - |
| **GapArea/DensityRegion/DuplicateCandidate** | ✅ 実装済み | ❌ なし | ❌ **未実装** | - |

---

## 10. 依存関係

| 依存 | React版 | Svelte版 | 状態 |
|---|---|---|---|
| **d3** | ✅ d3@^7.9.0 | ❌ なし | ❌ **未実装** |
| **react/react-dom** | ✅ peerDependencies | ❌ 不要 | ✅ **不要** |
| **typegpu** | ✅ typegpu@^0.7.1 | ✅ 使用中 | ✅ **実装済み** |

---

## まとめ

### 実装状況
- ✅ **完全実装**: 2項目（Force3DWordGraphTypeGPU、JUNG_STIMULUS_WORDS）
- ⚠️ **部分実装**: 8項目（TimelineVisualization、Force3DWordGraph、emotion-normalization、データ取得、フィルター、デバッグパネル、型定義）
- ❌ **未実装**: 20項目以上

### 優先度の高い未実装機能
1. **TimelineChart** - D3ベースのタイムラインチャート（オーバービュー、ブラシ選択）
2. **KPICards** - KPIカード表示
3. **StructureAnalysisPanel** - 構造分析パネル
4. **Force3DControls** - 3Dコントロールパネル（プリセット、詳細設定）
5. **距離可視化** - k-NNグラフ生成
6. **モダリティフィルタリング** - prosody/burst/face/language
7. **タブ切り替え** - 複数の可視化モード

### 移植時の注意点
1. **D3依存**: TimelineChart、DumbbellChart、SmallMultiplesはD3が必要
2. **データ形式**: React版とSvelte版でデータ形式が異なる（timestamp vs timeなど）
3. **状態管理**: React hooks → Svelte runes ($state, $derived, $effect)への変換が必要
4. **イベントハンドリング**: ReactのonClick → Svelteのonclickへの変換
5. **スタイリング**: className → class、Tailwind CSSの使用は共通

