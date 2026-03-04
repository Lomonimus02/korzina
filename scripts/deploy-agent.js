/**
 * Moonely Deploy Agent
 *
 * Lightweight HTTP server that receives static files and writes them to
 * /var/www/sandboxes/{chatId}/ on the host machine.
 *
 * Run on server:
 *   node deploy-agent.js
 *
 * Secured by a shared secret token (DEPLOY_AGENT_SECRET env var).
 *
 * POST /deploy
 *   Body: { chatId: string, files: Record<string, string> }
 *   Headers: Authorization: Bearer <DEPLOY_AGENT_SECRET>
 *   Response: { url: string }
 *
 * DELETE /deploy/:chatId
 *   Headers: Authorization: Bearer <DEPLOY_AGENT_SECRET>
 *   Response: { ok: true }
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.DEPLOY_AGENT_PORT || 4099;
const SECRET = process.env.DEPLOY_AGENT_SECRET;
const BASE_DIR = process.env.SANDBOXES_DIR || "/var/www/sandboxes";
const BASE_DOMAIN = process.env.DEPLOY_BASE_DOMAIN || "deploy.moonely.ru";

if (!SECRET) {
  console.error("FATAL: DEPLOY_AGENT_SECRET env var is required");
  process.exit(1);
}

function authorize(req) {
  const auth = req.headers["authorization"] || "";
  return auth === `Bearer ${SECRET}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sanitizePath(filePath) {
  // Prevent directory traversal
  const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, "");
  return normalized;
}

function writeFiles(chatId, files) {
  const sandboxDir = path.join(BASE_DIR, chatId);
  fs.mkdirSync(sandboxDir, { recursive: true });

  for (const [filePath, content] of Object.entries(files)) {
    const safe = sanitizePath(filePath);
    const fullPath = path.join(sandboxDir, safe);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
  }

  return `https://${chatId}.${BASE_DOMAIN}`;
}

function deleteFiles(chatId) {
  const sandboxDir = path.join(BASE_DIR, chatId);
  if (fs.existsSync(sandboxDir)) {
    fs.rmSync(sandboxDir, { recursive: true, force: true });
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (!authorize(req)) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  try {
    // POST /deploy
    if (req.method === "POST" && req.url === "/deploy") {
      const { chatId, files } = await readBody(req);

      if (!chatId || typeof chatId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(chatId)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid chatId" }));
        return;
      }

      if (!files || typeof files !== "object") {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "files must be an object" }));
        return;
      }

      const url = writeFiles(chatId, files);
      console.log(`[deploy] ${chatId} → ${Object.keys(files).length} files → ${url}`);

      res.writeHead(200);
      res.end(JSON.stringify({ url }));
      return;
    }

    // DELETE /deploy/:chatId
    if (req.method === "DELETE" && req.url?.startsWith("/deploy/")) {
      const chatId = req.url.slice("/deploy/".length);
      if (!/^[a-zA-Z0-9_-]+$/.test(chatId)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid chatId" }));
        return;
      }
      deleteFiles(chatId);
      console.log(`[delete] ${chatId}`);
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // Health check
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, sandboxes: BASE_DIR }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (err) {
    console.error("[error]", err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Moonely Deploy Agent listening on 127.0.0.1:${PORT}`);
  console.log(`Sandboxes directory: ${BASE_DIR}`);
  console.log(`Base domain: ${BASE_DOMAIN}`);
});
