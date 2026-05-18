# ADR: Cloudflare DNS への移行と GCP プロジェクトの decommission

Date: 2026-05-17

Status: Accepted

## Context

`spirit-in-physics.com` の authoritative DNS と関連 GCP リソースの状態は移行
途上のまま膠着していた。

- `apps/api-worker`、`apps/web`、`apps/researcher` の runtime は
  [adr-2026-05-14-cloudflare-worker-d1-langgraph-pregel.md](adr-2026-05-14-cloudflare-worker-d1-langgraph-pregel.md)
  で Cloudflare Workers に確定済み。`apps/*/wrangler.jsonc` には
  `custom_domain` / zone route が宣言されており、Cloudflare 側にゾーンを
  立てて NS を委譲すれば即座に traffic を引き取れる状態だった。
- レジストリ上の registrar は **Squarespace Domains II LLC** に既に変更
  されていた。これは過去に Google Domains(consumer)→ Squarespace 移管
  (2024) と Google Cloud Domains(GCP product)→ Squarespace registrar
  化(2025 の deprecation)を経た結果である。`whois` の `Updated Date` は
  2026-02-03。
- authoritative nameserver はまだ Google Cloud DNS
  (`ns-cloud-b{1,2,3,4}.googledomains.com`)を指していたが、`com-junkawasaki-sip`
  GCP project の billing は disabled で、Cloud DNS managed zone は既に
  応答していなかった。`dig` は全レコード SERVFAIL/empty。実質的には DNS
  解決が失敗し続けている state だった。
- このため email、cert 自動更新を含めて domain 配下のすべての integration
  は事実上停止しており、復元する既存レコードも存在しなかった。
- Cloudflare アカウント `ai-gftd-cloud`
  (`4da88288dc30d9ee257f319d3c33ecf0`)に登録するのが目的の topology
  と整合した。

GCP 側には Spirit in Physics 由来の以下のリソースが残っていた。

- `com-junkawasaki-sip` (project owner: `Jun784@gmail.com`)
  - GKE cluster `spirit-in-physics` namespace と TimescaleDB 等の archived
    runtime resource。
  - Cloud Domains API は有効化されていたが billing 停止で読み書き不可。
- billing account は `01D19B-270951-8AEBF5` (displayName "JK") を含めて
  すべて `open: false`。新規 billing 接続なしでは GCP API 全体が動かない。
- `com-junkawasaki`、`com-junkawasaki-gene`、`gen-lang-client-0796855340`
  も同様に billing なしで実質非稼働。

## Decision

1. `spirit-in-physics.com` の authoritative DNS を **Cloudflare** に移す。
   Cloudflare zone を `ai-gftd-cloud` アカウント配下に作成し、Squarespace
   registrar 側で NS を Cloudflare に張り替える。registrar 自体の移管
   (Cloudflare Registrar への transfer)は今回は実施しない。
2. 3 つの Worker(`spirit-in-physics-api`、`spirit-in-physics-web`、
   `spirit-in-physics-researcher`)を Cloudflare zone に bind する。route /
   custom_domain は `apps/*/wrangler.jsonc` に既に宣言されているので、
   `wrangler deploy` 実行で DNS proxied record と Universal SSL の DCV を
   トリガする。
3. `apps/*/wrangler.jsonc` に **`account_id` を明示**して、`wrangler` が
   `/memberships` の列挙(token に `User Details:Read` が無いと失敗)を
   不要にする。次回以降の deploy で env var を毎回 export する必要を
   なくす。
4. Spirit in Physics 専用 GCP project `com-junkawasaki-sip` を含め、
   Active billing も Active なリソースも持たない 4 つの GCP project を
   **soft-delete (`gcloud projects delete`)** する。30 日の undelete
   window 内で巻き戻し可能であることを前提とする。
5. cutover の操作手順と前提を実状に合わせて
   [docs/cloudflare-dns-cutover.md](cloudflare-dns-cutover.md) に書き直す。
   将来再度同じ作業をするときに、Cloud DNS billing 停止下の特殊事情と
   Squarespace registrar 側の挙動が再現できる粒度で残す。

## Consequences

positive consequences:

- 公開 hostname がすべて Cloudflare edge で扱われ、TLS、Routing、Bot
  Management、WAF、Workers binding が一貫した単一 control plane に揃う。
- Cloud DNS / GKE / Cloud SQL/TimescaleDB を含む archived GCP runtime に
  対する operational debt が(soft-delete 後 30 日で)消える。billing
  事故、孤立 IAM、サービスアカウント残骸の risk も同時に解消する。
- `wrangler.jsonc` に `account_id` がハードコードされるので、CI や
  別端末からの deploy で `CLOUDFLARE_ACCOUNT_ID` を毎回設定する手順
  をなくせる。
- 旧 NS が Google Cloud DNS のままだった状況(`dig` が SERVFAIL)から
  Cloudflare edge に揃うので、email を含めた今後の hostname 追加が
  再現性ある方法で 1 か所(Cloudflare DNS UI / API)で扱える。

tradeoffs:

- `com-junkawasaki-sip` 配下の TimescaleDB に残っていた raw participant /
  session / event データは soft-delete 期限後に永久消滅する。Cloudflare D1
  (`spirit-in-physics`, `f52a6c82-1f2a-444b-9ee6-a241b61bcbe5`)に必要分が
  既に移っているという前提に立つ。`Consequences` のために移し残しが
  ないかは別途確認する責任が残る。
- registrar は依然 Squarespace。registrar 機能(連絡先変更、DNSSEC、
  WHOIS privacy、auth code 取得、transfer 受付など)は Squarespace UI
  に行く必要があり、その Squarespace アカウントの特定が課題として
  残った。jun784@gmail.com の Squarespace 配下にはこの domain が無く、
  どの Squarespace アカウントが authoritative かはこの ADR の時点では
  未確定。
- Cloudflare API token のスコープ要件が増える: zone 作成は dashboard
  か `Account → Zone:Edit` 権限の token が必要、deploy には `Zone:Edit`
  / `DNS:Edit` / `Workers Routes:Edit` / `Workers Scripts:Edit` を伴う
  scoped token を維持する。
- Cloud Domains 廃止フローに乗らずに自分で registrar を移したい場合は
  別途 Squarespace 上で transfer lock を解除して EPP code を取り、
  Cloudflare Registrar 等に transfer する必要がある(本 ADR の範囲外)。

## Implementation

実施手順は
[docs/cloudflare-dns-cutover.md](cloudflare-dns-cutover.md) を参照する。
要点だけ再掲する。

1. Cloudflare dashboard で `spirit-in-physics.com` を `ai-gftd-cloud`
   account に追加。Free plan。割り当てられた NS をメモする(今回は
   `everton.ns.cloudflare.com` / `vivienne.ns.cloudflare.com`)。
2. `apps/web` と `apps/researcher` を `pnpm build`。`.svelte-kit/cloudflare`
   の artifact を更新する。
3. 各 Worker を deploy する。

   ```sh
   export CLOUDFLARE_API_TOKEN=...   # zone/DNS/Workers の scoped token
   (cd apps/api-worker && wrangler deploy)
   (cd apps/web        && wrangler deploy)
   (cd apps/researcher && wrangler deploy)
   ```

   `wrangler.jsonc` に `account_id` が入っているので
   `CLOUDFLARE_ACCOUNT_ID` env var は不要。

4. Cloudflare zone に proxied AAAA `100::` レコード(apex / `www` /
   `researcher`)と Worker route 3 本、custom domain 3 本が作成されて
   いることを API で確認する。
5. Squarespace の `https://account.squarespace.com/domains/managed/spirit-in-physics.com/dns/dns-settings`
   で Nameservers を以下のように差し替える:

   ```text
   - ns-cloud-b1.googledomains.com
   - ns-cloud-b2.googledomains.com
   - ns-cloud-b3.googledomains.com
   - ns-cloud-b4.googledomains.com
   + everton.ns.cloudflare.com
   + vivienne.ns.cloudflare.com
   ```

6. 不要 GCP project を soft-delete する。

   ```sh
   gcloud projects delete com-junkawasaki
   gcloud projects delete com-junkawasaki-gene
   gcloud projects delete com-junkawasaki-sip
   gcloud projects delete gen-lang-client-0796855340
   ```

   30 日以内なら `gcloud projects undelete <id>` で巻き戻せる。残るは
   `jun784` のみ。

7. `dig @1.1.1.1 spirit-in-physics.com NS +short` が Cloudflare NS を
   返し、`curl -I https://spirit-in-physics.com/` が 2xx/3xx を返し、
   `/api/health` が応答することを確認する。

## Rejected Alternatives

### Cloud DNS billing を再開して維持する

dead 状態の Cloud DNS を復活させる積極的な理由がない。runtime はすでに
Cloudflare に揃っており、DNS だけ別 control plane に残す利点はなく、
billing 復活には別途 open な billing account の用意が必要になる。

### Cloudflare Registrar に transfer も同時に行う

registrar transfer は EPP code の取得、transfer lock の解除、5〜7 日の
リードタイム、新 registrar 側での連絡先確認を伴う。今回の主目的(DNS
authoritative の切替)とは独立しており、後追いで実施可能なため初回
スコープから外す。

### `account_id` を `wrangler.jsonc` に書かず、毎回 env var に頼る

`User Details:Read` 権限を token に付与すれば `wrangler` が
`/memberships` で account を自動解決できるが、token scope を増やすより
config に書き出す方が監査と再現性の観点で簡単。`account_id` 自体は
公開しても問題ない identifier である。

### `com-junkawasaki-sip` を保持し続ける

Active な resource が無く、billing が closed の状態でプロジェクトを
残しても、誰かが billing を再 attach した瞬間に意図しない charge が
発生する risk がある。runtime が Cloudflare 側に揃っている以上、project
を保持する積極的な理由がない。

## Verification

- `dig @everton.ns.cloudflare.com spirit-in-physics.com +short` →
  `100::`(proxied placeholder)
- NS 切替後、`dig @1.1.1.1 spirit-in-physics.com NS +short` →
  `everton.ns.cloudflare.com.` / `vivienne.ns.cloudflare.com.`
- `curl -I https://spirit-in-physics.com/` → 2xx/3xx
- `curl -I https://www.spirit-in-physics.com/` → 2xx/3xx
- `curl -I https://researcher.spirit-in-physics.com/` → 2xx/3xx
- `curl -I https://spirit-in-physics.com/api/health` → 2xx
- `gcloud projects list --filter="lifecycleState:ACTIVE"` →
  `jun784` のみ
- Cloudflare zone status が `pending → active` に遷移する

## References

- [docs/cloudflare-dns-cutover.md](cloudflare-dns-cutover.md)
- [docs/cloudflare-native-architecture.md](cloudflare-native-architecture.md)
- [docs/adr-2026-05-14-cloudflare-worker-d1-langgraph-pregel.md](adr-2026-05-14-cloudflare-worker-d1-langgraph-pregel.md)
- Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Squarespace registrar docs: https://support.squarespace.com/hc/en-us/articles/206541567
- Google Cloud Domains shutdown: https://cloud.google.com/domains/docs/deprecations/feature-deprecations
