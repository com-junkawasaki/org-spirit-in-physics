# ADR: WebAuthn (passkey) を唯一の認証手段にし、Clerk を除去する

Date: 2026-05-17

Status: Accepted

## Context

`apps/web` および `apps/researcher` は当初 [Clerk](https://clerk.com)
(`svelte-clerk`)を ID provider として使い、`ClerkProvider` / `SignedIn`
/ `SignedOut` / `UserButton` 等を `+layout.svelte`、Consent フロー、
`ResearcherGuard` などで参照していた。`apps/web/src/lib/subscription.ts`
は Clerk の `publicMetadata` をサブスクリプション判定に利用し、
Capacitor の `capacitor.config.{ts,json}` には Clerk OAuth callback 用の
deep link 許可ドメインが宣言されていた。

直近の作業で次の事実が判明した。

- `CLAUDE.md` に `CLERK_SECRET_KEY` (`sk_live_...`) が平文で commit されて
  いた。git 履歴に残存しているため、当該シークレットは漏洩済みと
  見なす必要がある。
- `apps/api-worker` (`Hono` + LangGraph Pregel + Kysely-D1 + R2) はすでに
  Cloudflare runtime に揃っており、相関する `users` / セッションを D1 に
  持つだけで自己完結した認証が可能。
- ユーザー数が小さい研究プラットフォームなので、外部 IdP の MAU 上限や
  料金・契約・ベンダー依存を負う価値が薄い。
- 受け手はおおむね最新ブラウザ + iOS Capacitor (iOS 16+)。**WebAuthn /
  passkey** に依存しても問題が出にくい。

## Decision

`apps/web` と `apps/researcher` の認証を **WebAuthn のみ** に置き換え、
Clerk を完全に除去する。サーバー側は `apps/api-worker` が D1 を直接
扱う。具体的な構成は次のとおり。

1. **依存**
   - 削除: `svelte-clerk` (web, researcher)
   - 追加:
     - api-worker: `@simplewebauthn/server` ^11
     - web / researcher: `@simplewebauthn/browser` ^11

2. **D1 schema** (`apps/api-worker/migrations/0004_webauthn_auth.sql`)
   - `users` (`id`, `email`, `display_name`, `role`, `created_at_ms`,
     `updated_at_ms`)。`email` に unique index。
   - `webauthn_credentials` (`id` = base64url credential id, `user_id`,
     `public_key` BLOB, `counter`, `transports`, `device_type`,
     `backed_up`, `nickname`, `created_at_ms`, `last_used_at_ms`)。
   - `webauthn_challenges` (`id`, `user_id`, `ceremony`,
     `expires_at_ms`, `created_at_ms`)。TTL 5 分、read 時に best-effort
     で GC。
   - `auth_sessions` (`id`, `user_id`, `expires_at_ms`,
     `created_at_ms`, `last_seen_at_ms`, `user_agent`)。TTL 30 日。
     既存 `sessions`(実験 session)との衝突回避のため別テーブル。

3. **サーバー API** (`apps/api-worker/src/index.ts`)
   - `POST /api/auth/register/options`: email + displayName を受け、
     最初のユーザーは `role='researcher'` で作成、それ以降は
     `role='participant'`。登録チャレンジを発行し
     `webauthn_challenges` に保存。
   - `POST /api/auth/register/verify`: クライアントから返ってきた
     attestation response を `verifyRegistrationResponse` で検証し、
     `webauthn_credentials` に登録、署名付きセッションクッキー
     `sip_session` を発行。
   - `POST /api/auth/login/options`: 任意の email を引数に取り、
     対応する allowCredentials 入りの authentication options を返す。
   - `POST /api/auth/login/verify`: assertion response を検証、
     `counter` を更新、セッションを発行。
   - `POST /api/auth/logout`: D1 から session 行を削除、Set-Cookie で
     クッキーを空にする。
   - `GET /api/auth/me`: 現在のセッションから user を解決。
   - CORS は `origin: echo request origin` + `credentials: true` に変更
     (クッキー付きリクエスト用)。

4. **セッションクッキー** (`apps/api-worker/src/auth/session.ts`)
   - 形式: `<random sessionId>.<HMAC-SHA256(SESSION_SECRET, sessionId)>`
   - 属性: `HttpOnly`, `SameSite=Lax`, `Secure` (HTTPS 配信時のみ),
     `Max-Age=2592000` (30 日), `Path=/`。
   - `SESSION_SECRET` (>= 16 chars) は **`wrangler secret put`** で
     注入する。Wrangler の `vars` には書かない(可視 var ではない)。

5. **Relying Party** (`apps/api-worker/src/auth/webauthn.ts`)
   - `rpName = "Spirit in Physics"`
   - `rpID = "spirit-in-physics.com"`(apex / `www` / `researcher` 共有)。
   - `localhost` 開発時は `rpID = "localhost"`。
   - `*.workers.dev` プレビュー上で登録した passkey は本番ドメインに
     **移管されない**(rpID が異なるため別 RP 扱い)。本番テストは
     `spirit-in-physics.com` の NS 切替完了後に行うこと。

6. **クライアントライブラリ** (`apps/{web,researcher}/src/lib/auth/`)
   - `client.ts`: `register({email, displayName})`, `login({email?})`,
     `logout()`, `fetchMe()`。`@simplewebauthn/browser` を thin に包む。
   - `store.svelte.ts`: Svelte 5 runes による reactive store
     (`auth.user`, `auth.status`, `auth.isSignedIn`, `auth.isResearcher`,
     `auth.init/signIn/signUp/signOut`)。両アプリで同内容コピー
     (将来 `pkg/auth` に括り出す候補)。

7. **コンポーネント** (`apps/{web,researcher}/src/lib/components/auth/`)
   - `SignInButton.svelte`: passkey 認証を即開始。
   - `SignUpButton.svelte`: email + displayName の最小フォーム → 登録。
   - `UserMenu.svelte`: avatar pill + sign out。
   - `AuthGuard.svelte`: signed-in / signed-out / forbidden で snippet
     を分岐(`require: 'any' | 'researcher'`)。
   - `ResearcherGuard.svelte`: `auth.isResearcher` を直接見る単純版。

8. **ロール**
   - 最初の登録ユーザーが自動的に `researcher` になる(ブートストラップ)。
   - 以降は `participant`。
   - 昇格は D1 SQL: `UPDATE users SET role='researcher' WHERE email=?`。
   - `ResearcherGuard` はクライアントの guard。新規追加する researcher 限定
     API endpoint には別途サーバー側で `resolveSessionUser` + `role` check
     を実装する。

9. **クリーンアップ**
   - `apps/{web,researcher}/package.json` から `svelte-clerk` を削除。
   - `apps/{web,researcher}/src/lib/env.svelte.ts` から
     `PUBLIC_CLERK_PUBLISHABLE_KEY` を削除、対応する `window.ENV` の
     placeholder も `apps/{web,researcher}/src/app.html` から削除。
   - `apps/mobile/capacitor.config.{ts,json}` の `allowNavigation` から
     `*.clerk.{accounts.dev,com}`、`accounts.clerk.com`、テスト用
     `charming-monkey-45.clerk.accounts.dev` を削除。
   - `apps/web/src/routes/privacy/+page.svelte` の third-party services
     セクションから Clerk を外し、WebAuthn / 自前認証 + Cloudflare の
     記述に置換。
   - `BUDGET_LIMITS.md` の Clerk MAU 行を WebAuthn 自前運用に置換。
   - `claude.md` (= `CLAUDE.md`) の Clerk セクションを WebAuthn セクション
     に書き換え。
   - Clerk 関連 leaked secret は revoke 対象として残す
     (このリポジトリ外作業)。

## Consequences

positive consequences:

- ベンダー依存が 1 つ減る。Cloudflare 配下に完結し、Workers / D1 / R2
  以外の外部サービスを auth で持たない(Hume AI のみ別系統)。
- パスワード保存 0、phishable な OTP に依存しない、デバイス バウンドな
  passkey で UX とセキュリティを両立。
- Clerk SaaS の MAU 上限・サブスクリプション課金・テナント設定 UI を
  意識せずに済む。
- ロール (`researcher` / `participant`) を D1 に直接持つので、研究者用
  endpoint からの参照や bulk update が SQL で完結する。

tradeoffs:

- WebAuthn は **HTTPS 必須**(`localhost` だけ例外)。dev サーバを
  HTTPS で立てるか、`*.spirit-in-physics.com` 配下を使う必要がある。
- iOS Capacitor は WKWebView の WebAuthn 対応に依存する。iOS 16+ で動作
  するが、古い OS は事実上ログイン不可。
- Passkey 紛失時のリカバリは別途整備が必要(本 ADR の範囲外)。当面の
  運用案: support@spirit-in-physics.com への email で身元確認の上、
  運営が D1 から該当 credential を削除し、再登録を促す。
- `pkg/auth` のような共有ワークスペースパッケージを切り出していない
  ため、`apps/web` と `apps/researcher` で 6 ファイル相当のコピーが
  発生している。将来重複削減のために `pkg/auth` 化する余地あり。
- WebAuthn `attestationType: 'none'` を採用しているので、authenticator
  の真正性証明はしていない(研究プロジェクトとして十分な水準)。
- 旧 Clerk secret はリポジトリ履歴に残ったまま。本 ADR は新規依存
  ゼロを実現するが、漏洩済み secret の rotate / 履歴書き換えは
  別タスク。

## Implementation Mapping

新規ファイル:

- `apps/api-worker/migrations/0004_webauthn_auth.sql`
- `apps/api-worker/src/auth/session.ts`
- `apps/api-worker/src/auth/webauthn.ts`
- `apps/{web,researcher}/src/lib/auth/{client.ts, store.svelte.ts}`
- `apps/{web,researcher}/src/lib/components/auth/{SignInButton,SignUpButton,UserMenu,AuthGuard}.svelte`

書き換え:

- `apps/api-worker/src/index.ts` (auth endpoints / CORS / bindings)
- `apps/api-worker/src/db/schema.ts` (4 テーブル分の型 + Row 別名)
- `apps/api-worker/wrangler.jsonc` (SESSION_SECRET 説明コメント)
- `apps/{web,researcher}/package.json` (clerk 削除 + browser webauthn 追加)
- `apps/{web,researcher}/src/lib/env.svelte.ts`, `src/app.html`
- `apps/{web,researcher}/src/lib/components/auth/{UserSync,ResearcherGuard}.svelte`
- `apps/web/src/lib/components/{ParticipantView,ConsentForm}.svelte`
- `apps/web/src/lib/subscription.ts` (Clerk metadata → role baseline)
- `apps/web/src/lib/jung-voice-assessment/store.svelte.ts`
  (`syncWithClerk → syncWithAuthUser`)
- `apps/web/src/routes/+layout.svelte`
- `apps/web/src/routes/{analyzer,participant,experiment,experiment/consent,participant/consent}/+page.svelte` ほか
  participant / experiment の `+layout.svelte`
- `apps/web/src/routes/privacy/+page.svelte`
- `apps/researcher/src/routes/+layout.svelte`
- `apps/mobile/capacitor.config.{ts,json}` (allowNavigation から Clerk
  ドメイン削除)
- `claude.md` (= `CLAUDE.md`) と `BUDGET_LIMITS.md`

型チェック:

- `pnpm --dir apps/api-worker check` → 0 errors
- `pnpm --dir apps/web check` → 0 errors (12 CSS warnings、既存)
- `pnpm --dir apps/researcher check` → 0 errors (2 既存 warnings)

## Rejected Alternatives

### Clerk を残したまま secret だけローテーション

漏洩は塞がるが、ベンダー依存・MAU 課金・SaaS 設定 UI のメンテナンス
責任は残る。Cloudflare 内に閉じる本 ADR の利点が得られない。

### Auth0 / Supabase Auth / Firebase Auth に乗せ換え

別 SaaS への移行で、Clerk 依存が別の SaaS 依存に変わるだけ。本 ADR の
動機(ベンダー削減・Cloudflare 内完結)と矛盾するため不採用。

### email + password を D1 に自前保存

passkey の UX とセキュリティ(phishing 耐性、ブルートフォース耐性、
パスワード忘れフロー不要)を捨てる理由がない。研究参加者の機微情報を
扱うため、保存資産を最小化したい。

### Magic link (passwordless email)

実装は容易だが、メール送信基盤(Resend / SES など)を別途必要とし、
受信遅延・誤送信・spam 経路の運用負担が増える。passkey の方が
レイテンシも UX も良い。

## Verification

最小確認:

1. `SESSION_SECRET` を Worker に設定:
   `wrangler secret put SESSION_SECRET` (32+ chars)
2. D1 migration を remote に適用:
   `pnpm --dir apps/api-worker db:migrate:remote`
3. 3 worker を re-deploy:
   `(cd apps/api-worker && wrangler deploy)`、web / researcher は
   `pnpm build` の後 deploy。
4. ブラウザで `https://spirit-in-physics.com/experiment` を開き、
   *Create passkey* → メール + display name → ブラウザ passkey
   登録 → 登録完了後に `/api/auth/me` が user JSON を返すこと。
5. 再アクセスして *Sign in* で同じ passkey でログインできること。
6. D1 で `SELECT id, email, role FROM users;` を実行し、初回ユーザーが
   `role='researcher'` になっていること。
7. `https://researcher.spirit-in-physics.com/` がログイン状態かつ
   `role='researcher'` で表示され、`participant` ロールのユーザーは
   "Access Denied" になること。

## References

- [docs/adr-2026-05-14-cloudflare-worker-d1-langgraph-pregel.md](adr-2026-05-14-cloudflare-worker-d1-langgraph-pregel.md)
- [docs/adr-2026-05-17-cloudflare-dns-and-gcp-decommission.md](adr-2026-05-17-cloudflare-dns-and-gcp-decommission.md)
- [docs/cloudflare-dns-cutover.md](cloudflare-dns-cutover.md)
- @simplewebauthn docs: https://simplewebauthn.dev/
- WebAuthn spec: https://www.w3.org/TR/webauthn-3/
