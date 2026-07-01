// Smoke test for the BUILT worker (out/worker.js) — validates the actual
// deployable ESM artifact (export default { fetch }, ESM/npm interop under
// :js-provider :import) rather than the cljs source. Routes touching D1/R2
// are NOT exercised here (no bindings in this bare-Node context); those are
// covered by the wrangler-dev parity pass. Run after `npm run build:worker`:
//
//   node smoke.mjs

import worker from "./out/worker.js";

const env = { API_MODE: "worker-partial" };

let failures = 0;
function check(name, cond) {
  if (cond) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name}`);
  }
}

async function call(method, path, headers) {
  const url = `https://smoke.example${path}`;
  const res = await worker.fetch(new Request(url, { method, headers }), env);
  let body = null;
  try { body = res.status === 204 ? null : await res.json(); } catch { /* non-json */ }
  return { res, body };
}

async function main() {
  check("default export is { fetch }", typeof worker?.fetch === "function");

  {
    const { res, body } = await call("GET", "/api/health");
    check("health → 200", res.status === 200);
    check("health body ok:true mode:worker-partial", body?.ok === true && body?.mode === "worker-partial");
  }

  {
    const { res, body } = await call("GET", "/api/capabilities");
    check("capabilities → 200", res.status === 200);
    check("capabilities lists participants", Array.isArray(body?.available) && body.available.includes("participants"));
  }

  {
    const { res, body } = await call("GET", "/api/stimulus-words");
    check("stimulus-words → 200", res.status === 200);
    check("stimulus-words has 100 entries", Array.isArray(body?.words) && body.words.length === 100);
  }

  {
    const { res } = await call("GET", "/totally/unknown");
    check("unknown path → 404", res.status === 404);
  }

  {
    const { res, body } = await call("GET", "/api/not-a-real-endpoint");
    check("unmatched /api/* → 501", res.status === 501);
    check("unmatched /api/* error=not_implemented", body?.error === "not_implemented");
  }

  {
    const { res } = await call("OPTIONS", "/api/health", { origin: "https://spirit-in-physics.com" });
    check("OPTIONS preflight → 204", res.status === 204);
    check("preflight allow-methods includes POST",
      (res.headers.get("access-control-allow-methods") || "").includes("POST"));
  }

  {
    const { res } = await call("GET", "/api/health", { origin: "https://spirit-in-physics.com" });
    check("CORS echoes request origin",
      res.headers.get("access-control-allow-origin") === "https://spirit-in-physics.com");
    check("CORS allow-credentials true", res.headers.get("access-control-allow-credentials") === "true");
  }

  {
    // no DB binding in `env` above -> require-db throws -> caught -> 500
    const { res, body } = await call("GET", "/api/participants");
    check("missing DB binding → 500", res.status === 500);
    check("missing DB binding error=internal_error", body?.error === "internal_error");
  }

  console.log(failures === 0 ? "\nsmoke: PASS" : `\nsmoke: ${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error("smoke crashed:", e); process.exit(1); });
