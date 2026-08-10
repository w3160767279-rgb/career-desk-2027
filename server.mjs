import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const port = Number(process.env.PORT || 4173);
const root = process.cwd();
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };
const runFile = promisify(execFile);
let updateTask = null;

createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
    if (pathname === "/api/update" && req.method === "POST") {
      if (!updateTask) updateTask = runFile(process.execPath, [join(root, "scripts", "update-data.mjs")], { cwd: root, timeout: 420000 }).finally(() => { updateTask = null; });
      const result = await updateTask;
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: true, message: result.stdout.trim() }));
      return;
    }
    const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
    const file = normalize(join(root, relative));
    if (!file.startsWith(root) || !(await stat(file)).isFile()) throw new Error("not found");
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(port, () => console.log(`Career Desk: http://localhost:${port}`));
