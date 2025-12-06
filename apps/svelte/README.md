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

## ルーティング構造

- `/demo` - デモアプリケーション
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
│   │   ├── graphql/                    # GraphQLクライアント
│   │   └── auth/                       # 認証ヘルパー
│   └── hooks.server.ts                 # サーバーフック（Clerk）
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.js
├── houdini.config.js
└── package.json
```

## 移行状況

- ✅ SvelteKitプロジェクト初期化
- ✅ Tailwind CSS統合
- ✅ Houdini 2.x設定
- ✅ Clerk認証統合
- ✅ ルーティング構造作成
- ✅ jung-voice-assessmentパッケージ移植（基本構造）
- ✅ visualization-componentsパッケージ移植（基本構造）
- ✅ 各機能の基本ページ作成
- ✅ 既存Astroアプリのアーカイブ

## 次のステップ

各機能の詳細な実装が必要です：

1. **demo機能**: 3D Force Graph可視化の完全実装
2. **paper機能**: MDXコンテンツの読み込みと表示、KaTeX統合
3. **participant機能**: ユング音声評価テストの完全実装
4. **researcher機能**: GraphQLクエリ実装、ダッシュボードUI完成

## 既存アプリのアーカイブ

既存のAstroアプリは`apps/_archive/`に移動されています：
- `apps/_archive/demo`
- `apps/_archive/paper`
- `apps/_archive/participant`
- `apps/_archive/researcher`
