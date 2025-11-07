# Great Spirit GPU Physics System

物理法則に基づく「スピリット位置」のリアルタイム計算システム。

## 概要

開放系ダイナミクス、共振駆動、相殺メカニズムを統合し、wgpuでGPU並列処理を実現。大規模（N×P=10,000,000以上）に対応し、RDF/OWL知識グラフ（TerminusDB）と統合する。RDFグラフとSHACL Shapeをベクトル場として可視化し、物理ダイナミクスに統合する。

## 技術スタック

- **言語**: Rust
- **GPU**: wgpu (Vulkan/Metal/DX12)
- **API**: async-graphql (GraphQL API)
- **データベース**: TerminusDB (RDF/OWLグラフデータベース)
- **可視化**: wgpu + egui または Bevy
- **数値計算**: カスタム実装（f16/f32対応）

## 物理モデル

### 式(A): 物理ダイナミクス

```
ẍ = -∇U(s) - C·ṡ + α(ψ̄_𝒩(t) - s) + β·R(t)
```

### 式(B): 共振駆動（離散帯域）

```
R(t) ≈ Σ_k Γ_k · (B_k * w)(t)
```

### 式(D): セミインプリシットVerlet

```
a[t] = -∇U(s[t]) - C·ṡ[t] + α(ψ̄[t] - s[t]) + β·R[t] + γ·F_shacl(s[t])
ṡ[t+1] = ṡ[t] + a[t]·Δt
s[t+1] = s[t] + ṡ[t+1]·Δt
```

### RDF/SHACL統合

- **RDFベクトル場**: RDFトリプル（subject-predicate-object）をベクトルとして可視化
- **SHACL制約力**: SHACL Shapeの制約を力ベクトルとして表現し、物理ダイナミクスに統合
- **修正された物理式**: `ẍ = -∇U(s) - C·ṡ + α(ψ̄_𝒩(t) - s) + β·R(t) + γ·F_shacl(s)`

## パフォーマンス目標

- **10万サンプル**: 0.5〜1.5 ms/step
- **100万サンプル**: 3〜8 ms/step
- **60 FPS表示、10-20 Hz再計算**に対応

## プロジェクト構造

```
/performers/systems/great-sprit/
├── Cargo.toml
├── PROJECT.jsonld
├── README.md
├── src/
│   ├── main.rs                    # GraphQLサーバーエントリーポイント
│   ├── lib.rs
│   ├── physics/                   # 物理ダイナミクス
│   │   ├── dynamics.rs            # 式(A): 加速度計算
│   │   ├── potential.rs           # 内的ポテンシャル
│   │   ├── resonance.rs           # 式(B): 共振駆動
│   │   ├── integration.rs         # 式(D): Verlet積分
│   │   ├── observation.rs        # 式(E): 観測同化
│   │   └── shacl_force.rs         # SHACL制約力統合
│   ├── gpu/                       # GPU実装
│   │   ├── device.rs              # GPUデバイス初期化
│   │   ├── buffers.rs             # バッファ管理
│   │   ├── compute_pipeline.rs    # コンピュートパイプライン
│   │   ├── kernel.rs              # GPUカーネル実行
│   │   └── optimization.rs        # 大規模最適化
│   ├── kg/                        # 知識グラフ統合
│   │   ├── terminus.rs            # TerminusDBクライアント
│   │   ├── embedding.rs           # KG埋め込み
│   │   ├── distance.rs            # グラフ距離計算
│   │   └── centroid.rs           # 近傍重心計算
│   ├── graphql/                   # GraphQL API
│   │   ├── schema.rs              # スキーマ定義
│   │   ├── query.rs               # クエリリゾルバー
│   │   └── mutation.rs            # ミューテーションリゾルバー
│   ├── visualization/             # 可視化（Bevy）
│   │   ├── renderer.rs            # レンダラー
│   │   ├── camera.rs              # カメラ制御
│   │   ├── vector_field.rs        # ベクトル場可視化
│   │   ├── potential_surface.rs   # ポテンシャル面
│   │   ├── resonance_bands.rs     # 共振帯域色表示
│   │   ├── rdf_field.rs           # RDFベクトル場可視化
│   │   └── shacl_field.rs         # SHACL制約力ベクトル可視化
│   └── config.rs                  # 設定管理
└── resources/
    └── shaders/
        └── spirit_step.wgsl        # GPUシェーダー（BPF→共振→ODE融合）
```

## ビルドと実行

```bash
cargo build --release
cargo run
```

## ライセンス

MIT

