# Cloudflare DNS Cutover

Executed: 2026-05-17 (drafted 2026-04-20)

Move authoritative DNS for `spirit-in-physics.com` from Google Cloud DNS to
Cloudflare, and bind the apex / subdomains to the Cloudflare Workers introduced
in the Cloudflare-native refactor
([docs/cloudflare-native-architecture.md](/Users/junkawasaki/github/spirit-in-physics/docs/cloudflare-native-architecture.md)).

Registrar (Squarespace Domains II LLC, formerly Google Domains) stays the same;
only the nameservers are switched.

## Target topology

| Hostname                                 | Worker                         | Route pattern                                   |
| ---------------------------------------- | ------------------------------ | ----------------------------------------------- |
| `spirit-in-physics.com`                  | `spirit-in-physics-web`        | custom domain                                   |
| `www.spirit-in-physics.com`              | `spirit-in-physics-web`        | custom domain                                   |
| `researcher.spirit-in-physics.com`       | `spirit-in-physics-researcher` | custom domain                                   |
| `spirit-in-physics.com/api/*`            | `spirit-in-physics-api`        | zone route (`zone_name: spirit-in-physics.com`) |
| `www.spirit-in-physics.com/api/*`        | `spirit-in-physics-api`        | zone route                                      |
| `researcher.spirit-in-physics.com/api/*` | `spirit-in-physics-api`        | zone route                                      |

Routes are declared in:

- `apps/web/wrangler.jsonc`
- `apps/researcher/wrangler.jsonc`
- `apps/api-worker/wrangler.jsonc`

Cloudflare account: `ai-gftd-cloud` (`4da88288dc30d9ee257f319d3c33ecf0`).
Zone ID: `5758b297143072debc3f9939c46c080b`.

## Starting state (May 2026)

- Registrar: Squarespace Domains II LLC (`domains2.squarespace.com`).
- Authoritative NS at registry: `ns-cloud-b{1,2,3,4}.googledomains.com`.
- GCP project `com-junkawasaki-sip` billing **disabled** — Cloud DNS is no
  longer serving the zone. `dig` against the listed NS returns SERVFAIL/empty,
  and `gcloud dns` operations are blocked. There are no records to preserve
  and no rollback to Cloud DNS is possible: when billing was turned off, the
  managed zone effectively stopped existing.
- Email: not in use on the domain (no MX/SPF/DMARC to preserve).

## Step 1 — Add the zone to Cloudflare

Done via the Cloudflare Dashboard with an authenticated user on the
`ai-gftd-cloud` account. An API token alone cannot create a zone without the
`Account → Zone:Edit` permission at account scope; for a one-off cutover the
dashboard path is faster.

1. Dashboard → *Websites* → *Add a site* → `spirit-in-physics.com`.
2. Plan: **Free**.
3. Auto-scan finds nothing (Cloud DNS already inactive); click through.
4. Cloudflare assigns two nameservers, both anycasted globally:

   ```
   everton.ns.cloudflare.com
   vivienne.ns.cloudflare.com
   ```

   (Your assigned pair will differ for new zones.)

After this step the zone exists in Cloudflare in `pending` status. The public
internet still routes queries to the (dead) Cloud DNS delegation.

## Step 2 — Deploy Workers to bind routes and custom domains

A Cloudflare API token with at least:

- `Account → Workers Scripts:Edit`
- `Zone → Zone:Edit`
- `Zone → DNS:Edit`
- `Zone → Workers Routes:Edit`

scoped to "All zones from an account = ai-gftd-cloud" works. (You may also
need `Account Settings:Read` depending on wrangler version.)

Build the SvelteKit apps if their `.svelte-kit/cloudflare` output is stale:

```sh
(cd apps/web && pnpm build)
(cd apps/researcher && pnpm build)
```

Deploy each worker. `CLOUDFLARE_ACCOUNT_ID` is required because the token
above does not have `User → User Details:Read`, so wrangler cannot enumerate
accounts via `/memberships`:

```sh
export CLOUDFLARE_API_TOKEN=...          # token created above
export CLOUDFLARE_ACCOUNT_ID=4da88288dc30d9ee257f319d3c33ecf0

(cd apps/api-worker  && wrangler deploy)
(cd apps/web         && wrangler deploy)
(cd apps/researcher  && wrangler deploy)
```

Each deploy creates the necessary proxied AAAA records (Workers' `100::`
placeholder) and registers the custom-domain or zone-route bindings.
Universal SSL cert provisioning is queued but waits for DCV, which can only
succeed once Cloudflare is authoritative (Step 4).

Verify via API:

```sh
ZONE=5758b297143072debc3f9939c46c080b
ACC=4da88288dc30d9ee257f319d3c33ecf0
curl -sH "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records?per_page=50"
curl -sH "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$ACC/workers/domains?zone_id=$ZONE"
curl -sH "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE/workers/routes"
```

Expected: 3 AAAA records (apex, `www`, `researcher` → `100::`, proxied), 3
worker custom domains, 3 zone routes for `/api/*`.

## Step 3 — Dry-run validation

Query the Cloudflare nameservers directly:

```sh
for h in spirit-in-physics.com www.spirit-in-physics.com researcher.spirit-in-physics.com; do
  dig @everton.ns.cloudflare.com $h +short
done
```

Each should return `100::` (the Workers anycast placeholder; the actual edge
IPs are returned only via the public resolver path once the zone is
authoritative).

HTTPS via `--resolve` is **not** useful at this stage: edge TLS handshakes
fail until DCV completes, and DCV only completes after Step 4.

## Step 4 — Switch nameservers at the registrar (Squarespace)

1. https://account.squarespace.com/domains/managed/spirit-in-physics.com/dns/dns-settings
2. *Nameservers* section → remove all four `ns-cloud-b{1-4}.googledomains.com`
   entries → add the two Cloudflare nameservers from Step 1 → **Save**.
3. Squarespace warns "this is unlikely to cause downtime" — accurate here
   because the previous Cloud DNS delegation was already not serving.
4. Registry update is usually visible at `whois` within a few minutes;
   recursive resolver caches refresh within their TTL (typically 1h, occasionally
   up to 48h for stragglers).

## Step 5 — Post-cutover verification

```sh
dig @1.1.1.1 spirit-in-physics.com NS +short   # should list Cloudflare NS
dig @8.8.8.8 spirit-in-physics.com NS +short

for h in spirit-in-physics.com www.spirit-in-physics.com researcher.spirit-in-physics.com; do
  echo "== $h =="
  curl -sI "https://$h/" | head -1
done
curl -sI https://spirit-in-physics.com/api/health | head -1
```

Cloudflare zone status flips to `active` automatically once it sees the NS
delegation, and Universal SSL DCV unblocks shortly after. Until both happen
TLS handshakes can fail with `sslv3 alert handshake failure`; this is benign
and resolves itself once the cert pack reaches `active`.

Also check (if applicable):

- Apple App Store Connect: any *Associated Domains* configured in
  `apps/mobile/ios`.
- Hume AI webhooks (if any) — verify destination host still resolves.
- Email: not currently configured for this domain; if Google Workspace is
  re-added later, port MX/SPF/DKIM/DMARC over to Cloudflare first.

## Step 6 — Decommission

GCP-side cleanup is mostly a no-op because the project's billing is already
disabled. No further action is required unless billing is re-enabled, in
which case delete the dormant managed zone explicitly to avoid surprise
charges:

```sh
gcloud dns managed-zones delete spirit-in-physics-com \
  --project com-junkawasaki-sip   # requires billing re-enabled first
```

The old k8s gateway assets that previously fronted this domain are already
archived under
[`archive/kubernetes`](/Users/junkawasaki/github/spirit-in-physics/archive/kubernetes).

## Rollback

Rollback to Cloud DNS is **not available** in the current state because the
GCP project's billing is disabled and the managed zone is no longer serving.
If something is wrong after cutover, the practical options are:

1. Pause the Cloudflare zone (`zones/{id}/activation_check`-adjacent: use the
   dashboard *Advanced Actions → Pause Cloudflare on Site*) to bypass
   Cloudflare's edge while DNS keeps resolving directly to the origin. The
   origin here *is* Cloudflare Workers, so pausing mostly only affects WAF /
   caching / Bot Management — it does not restore Cloud DNS.
2. Roll back individual Workers (`wrangler rollback`) if the regression is in
   a deploy made during cutover.
3. As a last resort, re-enable GCP billing and re-create the Cloud DNS zone
   from scratch. Records that historically lived there are not preserved in
   this repo and would need to be reconstructed; for the current
   Workers-fronted topology there are no records to restore other than the
   delegation itself.

## Known integrations to re-check

- **Apple App Store Connect**: associated domains, if any, defined in
  `apps/mobile/ios`.
- **Hume AI** webhooks (if any) — verify destination host still resolves.
- **Email** — not in use today; revisit if reintroduced.
