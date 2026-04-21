# Cloudflare DNS Cutover

Date: 2026-04-20

Move `spirit-in-physics.com` from Google Cloud DNS to Cloudflare, and bind the
apex / subdomains to the Cloudflare Workers that were introduced in the
Cloudflare-native refactor ([docs/cloudflare-native-architecture.md](/Users/junkawasaki/github/spirit-in-physics/docs/cloudflare-native-architecture.md)).

## Target topology

| Hostname                              | Worker                        | Route pattern                                   |
| ------------------------------------- | ----------------------------- | ----------------------------------------------- |
| `spirit-in-physics.com`               | `spirit-in-physics-web`       | custom domain                                   |
| `www.spirit-in-physics.com`           | `spirit-in-physics-web`       | custom domain                                   |
| `researcher.spirit-in-physics.com`    | `spirit-in-physics-researcher`| custom domain                                   |
| `spirit-in-physics.com/api/*`         | `spirit-in-physics-api`       | zone route (`zone_name: spirit-in-physics.com`) |
| `www.spirit-in-physics.com/api/*`     | `spirit-in-physics-api`       | zone route                                      |
| `researcher.spirit-in-physics.com/api/*` | `spirit-in-physics-api`    | zone route                                      |

Routes are declared in:

- `apps/web/wrangler.jsonc`
- `apps/researcher/wrangler.jsonc`
- `apps/api-worker/wrangler.jsonc`

## Preconditions

1. Cloudflare account has access to the target zone (create a new zone if
   needed — see step 1).
2. GCP project `com-junkawasaki-sip` billing has been disabled, so current
   records must be captured via the Google Cloud DNS console (UI) rather than
   `gcloud`.
3. All three Workers have been deployed at least once so Cloudflare knows the
   scripts exist.

```
pnpm --filter spirit-in-physics-api deploy
pnpm --filter spirit-in-physics-web deploy
pnpm --filter spirit-in-physics-researcher deploy
```

## Step 1 — Capture the existing Google Cloud DNS zone

1. Open https://console.cloud.google.com/net-services/dns/zones in the
   `com-junkawasaki-sip` project.
2. Open the `spirit-in-physics-com` (or equivalent) zone.
3. Export the zone file: *Export record sets* → download as BIND.
4. Keep the export as a rollback artifact. Do **not** delete the zone yet.

Typical records that must be preserved:

- MX / TXT for Google Workspace (if any)
- TXT for SPF / DKIM / DMARC
- TXT for domain verification (Apple, Clerk, etc.)
- CAA
- Any third-party CNAMEs (Clerk `clkng`, auth providers, etc.)

## Step 2 — Add the zone to Cloudflare

1. Cloudflare Dashboard → *Websites* → *Add a site* → `spirit-in-physics.com`.
2. Choose a plan (Free is sufficient).
3. Cloudflare will auto-scan DNS. Verify that the scan picked up the records
   captured in step 1. Add anything missing manually.
4. Note the two Cloudflare nameservers shown (e.g. `xxx.ns.cloudflare.com`).

At this point the zone exists in Cloudflare but the public internet still uses
Google Cloud DNS. Nothing is live yet.

## Step 3 — Attach routes / custom domains to Workers

Because `wrangler.jsonc` already declares `routes` with `custom_domain: true`
and zone routes, a redeploy of each Worker will:

- create the necessary proxied DNS records inside the Cloudflare zone, and
- provision the TLS certificates for the custom domains.

```
pnpm --filter spirit-in-physics-api deploy
pnpm --filter spirit-in-physics-web deploy
pnpm --filter spirit-in-physics-researcher deploy
```

Verify in the Cloudflare Dashboard:

- Workers & Pages → each worker has the expected routes / custom domains.
- DNS → apex, `www`, and `researcher` records are proxied (orange cloud) and
  point to the Workers runtime.

Because the Cloudflare zone is not yet authoritative, these records are not
resolvable from the public internet — they only take effect after step 5.

## Step 4 — Dry-run validation

Validate the Cloudflare-served responses before cutover by hitting the zone's
Cloudflare nameservers directly:

```
dig @<cf-ns>.ns.cloudflare.com spirit-in-physics.com +short
dig @<cf-ns>.ns.cloudflare.com www.spirit-in-physics.com +short
dig @<cf-ns>.ns.cloudflare.com researcher.spirit-in-physics.com +short

curl --resolve spirit-in-physics.com:443:<cf-ip> https://spirit-in-physics.com/
curl --resolve spirit-in-physics.com:443:<cf-ip> https://spirit-in-physics.com/api/health
```

All three hostnames should serve over HTTPS via Cloudflare before touching the
registrar.

## Step 5 — Switch nameservers at the registrar

1. Open the domain registrar (Google Domains / Squarespace Domains / etc.).
2. Replace the current nameservers with the two Cloudflare nameservers from
   step 2.
3. Lower the registrar-side TTL first if available (most registrars do not
   expose this for NS).
4. Propagation usually completes in minutes but can take up to 48h.

## Step 6 — Post-cutover verification

```
dig spirit-in-physics.com NS +short          # should list Cloudflare NS
dig spirit-in-physics.com +short              # should resolve through Cloudflare
curl -I https://spirit-in-physics.com/
curl -I https://www.spirit-in-physics.com/
curl -I https://researcher.spirit-in-physics.com/
curl -I https://spirit-in-physics.com/api/health
```

Also check:

- Email flow (send/receive test) — MX/SPF/DKIM/DMARC preserved
- Clerk production sign-in — `clerk.spirit-in-physics.com` CNAME intact
- iOS app → API calls succeed

## Step 7 — Decommission Google Cloud DNS

Only after at least 72h of stable Cloudflare-served traffic:

1. In Google Cloud DNS, delete the `spirit-in-physics-com` managed zone.
2. Remove any IAM bindings / service accounts that were specific to DNS
   management.
3. Archive related Terraform / manifest references (none remain in this repo —
   the old k8s gateway assets are already under
   [`archive/kubernetes`](/Users/junkawasaki/github/spirit-in-physics/archive/kubernetes)).

## Rollback

If Cloudflare-served traffic misbehaves:

1. Revert nameservers at the registrar to the Google Cloud DNS nameservers.
2. The GCP zone still exists (step 1 kept it), so resolution returns to the
   previous behavior within the registrar TTL.

Do not rely on rollback after step 7.

## Known integrations to re-check

- **Clerk**: production key `pk_live_...` in `claude.md`. The Clerk CNAME must
  survive the zone migration.
- **Apple App Store Connect**: associated domains, if any, defined in
  `apps/mobile/ios`.
- **Hume AI** webhooks (if any) — verify destination host still resolves.
- **Email** (Google Workspace): MX / SPF / DKIM / DMARC / domain-verification
  TXT.
