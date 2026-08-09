import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { contentType, resolveRequestPath } from "../scripts/dev.mjs";

test("static server resolves app files but rejects traversal", () => {
  const root = resolve("/tmp/spirit-app");
  assert.equal(resolveRequestPath(root, "/src/app.js"), resolve(root, "src/app.js"));
  assert.equal(resolveRequestPath(root, "/"), resolve(root, "index.html"));
  assert.equal(resolveRequestPath(root, "/..%2Fsecret"), null);
});

test("static server emits strict content types for browser modules", () => {
  assert.equal(contentType("app.js"), "text/javascript; charset=utf-8");
  assert.equal(contentType("style.css"), "text/css; charset=utf-8");
  assert.equal(contentType("unknown.bin"), "application/octet-stream");
});
