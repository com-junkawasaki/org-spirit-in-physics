import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDirectory, "..");

export function contentType(pathname) {
  return ({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".xmile": "application/xml; charset=utf-8",
  })[extname(pathname)] ?? "application/octet-stream";
}

export function resolveRequestPath(root, requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://127.0.0.1").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const candidate = resolve(root, relative);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;
  return candidate;
}

export function startServer({ root = appRoot, port = Number(process.env.PORT || 5173) } = {}) {
  const server = createServer((request, response) => {
    const pathname = resolveRequestPath(root, request.url || "/");
    if (!pathname || !existsSync(pathname) || !statSync(pathname).isFile()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "content-type": contentType(pathname),
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    });
    createReadStream(pathname).pipe(response);
  });
  server.listen(port, "127.0.0.1", () => console.log(`Spirit Self-Study: http://127.0.0.1:${port}/`));
  return server;
}

if (resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  const rootArgument = process.argv.indexOf("--root");
  startServer({ root: rootArgument >= 0 ? resolve(appRoot, process.argv[rootArgument + 1]) : appRoot });
}
