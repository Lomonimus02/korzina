/**
 * Moonely Static Bundler
 *
 * Compiles user-generated React/TSX files into a single self-contained HTML file
 * using esbuild with a virtual filesystem plugin.
 *
 * Input:  Record<string, string>  (file paths → file contents, e.g. from Sandpack)
 * Output: { 'index.html': string } ready to be served by nginx
 */

import { build, type Plugin } from "esbuild";
import path from "path";

// ── Constants ────────────────────────────────────────────────────────────────

/** Possible entry-file names, checked in order */
const ENTRY_CANDIDATES = [
  "/App.tsx",
  "/App.jsx",
  "/index.tsx",
  "/index.jsx",
  "/App.ts",
  "/index.ts",
];

/** Virtual path of the injected render entry */
const VIRTUAL_ENTRY = "/__moonely_entry__.tsx";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise a file key so it always starts with "/" */
function normalise(p: string): string {
  return p.startsWith("/") ? p : "/" + p;
}

/** Resolve a relative import from a virtual importer, trying common extensions */
function resolveVirtual(
  importer: string,
  importPath: string,
  normalised: Record<string, string>
): string | null {
  const base = path.posix.resolve(path.posix.dirname(importer), importPath);
  const exts = ["", ".tsx", ".ts", ".jsx", ".js"];

  for (const ext of exts) {
    if (normalised[base + ext]) return base + ext;
  }
  // Try index files
  for (const ext of [".tsx", ".ts", ".jsx", ".js"]) {
    const idx = base + "/index" + ext;
    if (normalised[idx]) return idx;
  }
  return null;
}

// ── Bundler ──────────────────────────────────────────────────────────────────

export async function bundleToStaticFiles(
  files: Record<string, string>
): Promise<Record<string, string>> {
  // 1. Normalise keys
  const normalised: Record<string, string> = {};
  for (const [fp, content] of Object.entries(files)) {
    normalised[normalise(fp)] = content;
  }

  // 2. If user already provided a plain index.html (no TSX), return as-is
  if (normalised["/index.html"]) {
    return { "index.html": normalised["/index.html"] };
  }

  // 3. Find the React entry point
  const entryFile = ENTRY_CANDIDATES.find((c) => normalised[c]);
  if (!entryFile) {
    // Fallback: if there's no recognisable entry, return files unchanged
    console.warn("[Bundler] No entry file found — returning files as-is");
    return files;
  }

  // 4. Virtual entry that renders the app
  const entryContent = `
import React from "react";
import ReactDOM from "react-dom/client";
import App from ".${entryFile}";

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(React.createElement(App, null));
} else {
  console.error("[Moonely] #root element not found");
}
`.trim();

  // 5. esbuild virtual filesystem plugin
  const virtualPlugin: Plugin = {
    name: "moonely-virtual",
    setup(build) {
      // The synthetic entry
      build.onResolve({ filter: /^\/__moonely_entry__/ }, () => ({
        path: VIRTUAL_ENTRY,
        namespace: "virtual",
      }));

      // Relative imports from virtual files → stay in virtual namespace
      build.onResolve(
        { filter: /^\./, namespace: "virtual" },
        (args) => {
          const resolved = resolveVirtual(args.importer, args.path, normalised);
          if (resolved) return { path: resolved, namespace: "virtual" };
          // Not found in virtual FS — let esbuild handle it normally (node_modules)
          return null;
        }
      );

      // Non-relative imports from virtual files (react, lucide-react, etc.)
      // → resolve from node_modules using resolveDir; stub missing packages
      build.onResolve(
        { filter: /^[^./]/, namespace: "virtual" },
        async (args) => {
          const result = await build.resolve(args.path, {
            resolveDir: process.cwd(),
            kind: args.kind,
          });
          if (result.errors.length > 0) {
            // Package not installed — return a stub so the build doesn't fail
            return { path: args.path, namespace: "stub" };
          }
          return result;
        }
      );

      // Stub loader for missing packages — returns empty ESM module
      build.onLoad({ filter: /.*/, namespace: "stub" }, (args) => {
        console.warn(`[Bundler] Stubbing missing package: ${args.path}`);
        return {
          contents: `
export default new Proxy({}, { get: (_, k) => typeof k === 'string' ? (() => null) : undefined });
export const Toaster = () => null;
export const toast = Object.assign(() => {}, { success: () => {}, error: () => {}, info: () => {} });
`,
          loader: "js",
        };
      });

      // Load virtual files
      build.onLoad({ filter: /.*/, namespace: "virtual" }, (args) => {
        if (args.path === VIRTUAL_ENTRY) {
          return { contents: entryContent, loader: "tsx", resolveDir: process.cwd() };
        }
        const content = normalised[args.path];
        if (content === undefined) {
          return { contents: "// not found: " + args.path, loader: "js", resolveDir: process.cwd() };
        }
        const ext = path.extname(args.path).slice(1).toLowerCase();
        const loaderMap: Record<string, "tsx" | "ts" | "jsx" | "js" | "css"> = {
          tsx: "tsx",
          ts: "ts",
          jsx: "jsx",
          js: "js",
          css: "css",
        };
        return { contents: content, loader: loaderMap[ext] ?? "js", resolveDir: process.cwd() };
      });
    },
  };

  // 6. Bundle with esbuild
  const result = await build({
    entryPoints: [VIRTUAL_ENTRY],
    bundle: true,
    write: false,
    format: "iife",
    // Use automatic JSX runtime — no need for explicit `import React`
    jsx: "automatic",
    target: "es2020",
    plugins: [virtualPlugin],
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    logLevel: "silent",
    // Allow esbuild to resolve node_modules (react, lucide-react, etc.) normally
    absWorkingDir: process.cwd(),
  });

  const jsCode = result.outputFiles[0].text;

  // 7. Wrap in HTML
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Сайт на Moonely</title>
  <!-- Tailwind CSS (CDN) -->
  <script src="https://cdn.tailwindcss.com"></script>
  <style>*, *::before, *::after { box-sizing: border-box; } body { margin: 0; font-family: system-ui, sans-serif; }</style>
</head>
<body>
  <div id="root"></div>

  <script>${jsCode}</script>
</body>
</html>`;

  return { "index.html": html };
}
