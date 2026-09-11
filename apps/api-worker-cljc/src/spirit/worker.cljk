(ns spirit.worker
  "Cloudflare Worker (workerd) entry point. shadow-cljs :esm build emits
  `export default { fetch }`; `fetch` delegates to the router. Port of
  apps/api-worker/src/index.ts's `export default app` (Hono).

  Env bindings (see wrangler.jsonc):
    DB              D1 database (participants/sessions/graph_*/webauthn_*/...)
    ARTIFACTS       R2 bucket (uploaded assessment artifacts)
    SESSION_SECRET  HMAC key for the `sip_session` cookie (wrangler secret)
    API_MODE        free-text mode string echoed by /api/health"
  (:require [spirit.router :as router]))

(defn fetch-handler [req env _ctx]
  (router/handle req env))

;; default export object for workerd: { fetch }
(def handler #js {:fetch fetch-handler})
