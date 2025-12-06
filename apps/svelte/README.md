# Spirit in Physics - SvelteKit統合アプリ

4つのAstroアプリ（demo, paper, participant, researcher）をSvelteKit 2.xで統合した単一アプリケーションです。

## 技術スタック

- **SvelteKit 2.x** - フレームワーク
- **Svelte 5.x** - UIフレームワーク
- **TypeScript** - 型安全性（strict mode）
- **Tailwind CSS** - スタイリング
- **Houdini 2.x** - GraphQLクライアント
- **Clerk** - 認証
- **mdsvex** - MDXサポート
- **KaTeX** - 数式レンダリング
- **Vitest** - テストフレームワーク

## ルーティング構造

- `/demo` - デモアプリケーション（3D Force Graph可視化）
- `/paper` - 研究論文表示（MDX）
- `/participant` - 参加者向けアプリ（認証、テスト）
- `/researcher` - 研究者向けダッシュボード

## セットアップ

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm dev

# ビルド
pnpm build

# プレビュー
pnpm preview

# テスト実行
pnpm test

# テスト（UI）
pnpm test:ui

# テスト（カバレッジ）
pnpm test:coverage
```

## 環境変数

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
# Clerk Authentication
PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# GraphQL API
GRAPHQL_API_URL=http://localhost:8080/api/graphql

# Supabase
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## プロジェクト構造

```
apps/svelte/
├── src/
│   ├── routes/
│   │   ├── demo/          # デモアプリ
│   │   ├── paper/         # 研究論文
│   │   ├── participant/   # 参加者アプリ
│   │   └── researcher/    # 研究者ダッシュボード
│   ├── lib/
│   │   ├── jung-voice-assessment/      # ユング音声評価コンポーネント
│   │   ├── visualization-components/   # 可視化コンポーネント
│   │   ├── researcher/                 # 研究者向けユーティリティ
│   │   ├── paper/                      # 論文関連ユーティリティ
│   │   ├── graphql/                    # GraphQLクライアント
│   │   └── auth/                       # 認証ヘルパー
│   ├── test/                           # テストユーティリティ
│   └── hooks.server.ts                 # サーバーフック（Clerk）
├── svelte.config.js
├── vite.config.ts
└── vitest.config.ts
```

## 実装済み機能

### demo機能
- ✅ 3D Force Graph基本構造
- ⏳ WebGPU実装（進行中）
- ⏳ 物理シミュレーション
- ⏳ インタラクティブコントロール

### paper機能
- ✅ MDXコンテンツ読み込み
- ✅ KaTeX数式レンダリング
- ✅ 動的コンテンツ読み込み
- ✅ 複数論文のサポート

### participant機能
- ✅ ユング音声評価テスト基本実装
- ✅ 音声認識統合
- ✅ リアクションタイム測定
- ✅ データ保存とGraphQL統合

### researcher機能
- ✅ GraphQLクエリ実装
- ✅ ダッシュボードUI
- ✅ TimelineVisualization実装
- ✅ Force3DWordGraph実装
- ⏳ フィルタリング機能
- ⏳ エクスポート機能

## テスト

テストはVitest + jsdomを使用しています。

```bash
# すべてのテストを実行
pnpm test

# ウォッチモード
pnpm test --watch

# UIモード
pnpm test:ui

# カバレッジレポート
pnpm test:coverage
```

テストファイルは`*.test.ts`または`*.spec.ts`の命名規則に従います。

## 次のステップ

1. WebGPU完全実装と物理シミュレーション
2. インタラクティブコントロールの実装
3. フィルタリングとエクスポート機能の追加
4. E2Eテストの実装
