/**
 * Safety Layer Injector
 *
 * Injects noindex meta tag into user-generated sites before deployment
 * to prevent search engine indexing of sandbox content.
 */

const ROBOTS_META = `<meta name="robots" content="noindex, nofollow" />`;

/**
 * Injects anti-SEO meta tag into the user's layout.tsx.
 *
 * @param files  Record of filePath → fileContent (the user's generated project)
 * @returns      A new record with the same files but with the safety layer applied
 */
export function injectSafetyLayer(
  files: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = { ...files };

  // Locate layout.tsx — may be keyed as "app/layout.tsx" or "/app/layout.tsx"
  const layoutKey =
    Object.keys(result).find((k) =>
      k.replace(/^\//, "").toLowerCase() === "app/layout.tsx"
    ) ?? null;

  if (!layoutKey) {
    return result;
  }

  let layout = result[layoutKey];

  // Inject noindex meta
  if (layout.includes("<head>") && !layout.includes("noindex")) {
    layout = layout.replace("<head>", `<head>\n        ${ROBOTS_META}`);
  } else if (layout.includes("<Head>") && !layout.includes("noindex")) {
    layout = layout.replace("<Head>", `<Head>\n        ${ROBOTS_META}`);
  } else if (!layout.includes("noindex") && layout.includes("export const metadata")) {
    layout = layout.replace(
      /export const metadata[^=]*=\s*\{/,
      `export const metadata = {\n  robots: { index: false, follow: false },`
    );
  }

  result[layoutKey] = layout;
  return result;
}
