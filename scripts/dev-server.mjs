/**
 * Dependency-free static server for local checks.
 * Serves the `site/` folder (the Firebase Hosting public directory).
 *
 * Usage: node scripts/dev-server.mjs [port]
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd(), "site");
const port = Number(process.argv[2] ?? process.env.PORT ?? 5173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const target = resolve(join(root, normalize(clean)));
  return target.startsWith(root) ? target : null;
}

const server = createServer(async (req, res) => {
  try {
    const requested = req.url === "/" ? "/index.html" : req.url;
    let filePath = safePath(requested);
    if (!filePath) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    let info = await stat(filePath).catch(() => null);
    if (info?.isDirectory()) {
      filePath = join(filePath, "index.html");
      info = await stat(filePath).catch(() => null);
    }
    if (!info) {
      const notFound = join(root, "404.html");
      const page = await readFile(notFound).catch(() => null);
      if (page) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(page);
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
      return;
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }).end(`Server error: ${error.message}`);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://localhost:${port}/`);
});
