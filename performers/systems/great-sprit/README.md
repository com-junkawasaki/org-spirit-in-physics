# Great Spirit GPU Physics System

物理法則に基づく「スピリット位置」のリアルタイム計算システム。

## 概要

開放系ダイナミクス、共振駆動、相殺メカニズムを統合し、wgpuでGPU並列処理を実現。大規模（N×P=10,000,000以上）に対応し、RDF/OWL知識グラフ（TerminusDB）と統合する。

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
a[t] = -∇U(s[t]) - C·ṡ[t] + α(ψ̄[t] - s[t]) + β·R[t]
ṡ[t+1] = ṡ[t] + a[t]·Δt
s[t+1] = s[t] + ṡ[t+1]·Δt
```

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
│   ├── gpu/                       # GPU実装
│   ├── kg/                        # 知識グラフ統合
│   ├── graphql/                   # GraphQL API
│   ├── visualization/             # 可視化
│   └── config.rs                  # 設定管理
└── resources/
    └── shaders/
        └── spirit_step.wgsl
```

## ビルドと実行

```bash
cargo build --release
cargo run
```

## ライセンス

MIT

