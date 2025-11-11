## Spirit-in-Physics Visualizer — Emotion-Kernel Tensegrity 3D Model

本プロジェクトの 3D 可視化は、感情に誘導された距離（メトリック／カーネル）で語集合に幾何（距離空間）を与え、その距離を最もよく保存するように低次元へ埋め込み、さらにテンセグリティ物理で自己支持的な立体構造へ収束させるモデルです。

### 1. データからグラフへ（Emotion Kernel Graph）
- 各語に対して 10 次元の感情ベクトル `e_i ∈ R^{10}`（Hume 等の推定値）を作成し、正規化。
- 感情ベクトル間の距離に基づき RBF カーネルで重み行列 `W` を構築。
  - `W_ij = exp(− ||e_i − e_j||^2 / σ_eff^2)`
  - `σ_eff = median_pairwise_distance × σ_ui`（UI の σ 倍率 × メディアン距離）
- 次の対角行列とラプラシアンを定義:
  - `D_ii = Σ_j W_ij`, `L = D − W`

### 2. スペクトラル初期化（Spectral Embedding）
- `L` の第 2〜4 固有ベクトルをパワー反復＋逐次直交化で近似抽出（第 1 固有ベクトル＝定数は除外）。
- 得られた 3 軸を初期 3D 座標として割当（スケールは `shellRadius × 0.8`）。
- ON/OFF と σ は UI から制御可能。

### 3. アンカー（Emotion Anchors）
- 感情マップ上のラベルを球殻へ射影した固定ノード（`fixed: true`）として追加。
- アンカーと語を張力（tension）で接続。重みは対応する感情次元のスコア。
- 正規マッピング例（内部 10 感情キー）：
  - Joy→`joy`, Sadness→`sadness`, Anger→`anger`, Fear→`fear`, Disgust→`disgust`, Calmness→`calm`, Interest/Determination→`focus`, Surprise→`surprise`, Confusion→`confusion`。

### 4. テンセグリティ物理（Unilateral Springs）
- 各エッジに片側拘束バネを付与：
  - Tension（引張のみ）: `dist > L0` の時だけ `k*(dist−L0)`
  - Compression（圧縮のみ）: `dist < L0` の時だけ `k*(dist−L0)`
- エッジ種別とパラメータ（`mode, L0, k`）は語間の結合強度から決定。
  - 強結合ほど `L0` を短く、`k` を大きく（コントラスト強化にロジスティック変換を使用）。
- 次数正規化でハブ吸込みを抑制。

### 5. ラジアル/殻/トーラスの場（Global Fields）
- 殻フォース（Shell）: 半径 `shellRadius` へ引寄せ／押出し（`shellK`）。
- 外向きラジアル斥力（`radialOutK`）: 中心からの押し広げで球面化を回避。
- トーラス吸引（任意、`torusR, torusr, torusK`）: 辺縁系の環状構造を誘導（y 軸周りの輪）。

### 6. PBD 位置拘束（Stress Minimization Approx.）
- PBD 風の長さ拘束投影を `constraintIters` 回適用（強度 `constraintStiffness`）。
- アンカーは毎フレーム初期位置へ強剛性拘束。

### 7. レンダリングと形状
- ノード形状: 正 12 角柱側面（矩形 12 面）を用い、軸方向に棒状スケーリング。両端に in/out キャップを表示。
- エッジ: 加重で色／太さに反映。
- カメラ: 重心追従の look-at（スムージング）。

### 8. UI パラメータ（主なもの）
- Kernel: `σ`（RBF 幅倍率）, `Spectral Init`（ON/OFF）
- Physics: `springK`, `repulsionK`, `damping`, `restLength`
- Emotion: `Emo Gain`, `Emo Mix`, `γ(w)`（重み強調）
- Shell/Fields: `shellRadius`, `shellK`, `radialOutK`
- Constraints: `constraintIters`, `constraintStiffness`
- Optional: `torusR`, `torusr`, `torusK`（UI 化予定）

### 9. データ/API
- Timeline API から語イベントを取得し、感情・生理指標を集約。
- 可視化向けダミー（デモ）データも提供可能（`?demo=1`）。
- Neo4j クエリは Cypher Code Builder を使用して構築。

### 10. 実行
```
pnpm i
pnpm -F apps/visualizer dev
```
ブラウザで 3D Force Timeline（`/3d-force-timeline`）へアクセス。UI で σ, Spectral Init, Shell/Constraints 等を調整します。

### 11. 設計の要点（Why it works）
- スペクトラル初期化が「感情距離」の幾何を低次元で大域的に保存。
- テンセグリティの片側拘束＋PBD で自己支持的な安定形へ漸近（ストレス最小化の近似）。
- アンカーとグローバル場（殻/トーラス/斥力）で、辺縁系の環状・層状のマクロ形態を制御。

### 12. 今後の改善
- ランチョス近似による固有分解の高速・高安定化。
- アンカー強度の UI 化（全体倍率／感情別係数）。
- σ 自動推定のロバスト化（k-NN 距離分布ベース等）。
- アンカーと語の双方向テンセグリティ（一部圧縮バー化）の最適化。

---
実装の中心ファイル:
- `apps/visualizer/src/components/TimelineVisualization.tsx`
- `apps/visualizer/src/components/Force3DWordGraph.tsx`


