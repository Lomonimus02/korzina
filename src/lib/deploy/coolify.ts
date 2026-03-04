/**
 * Moonely Static Deploy Client
 *
 * Sends user files to the on-server Deploy Agent which writes them to
 * /var/www/sandboxes/{chatId}/ and nginx serves them instantly.
 *
 * Deploy time: < 1 second (no build step).
 *
 * Required environment variables:
 *   DEPLOY_BASE_DOMAIN    e.g. deploy.moonely.ru
 *   DEPLOY_AGENT_URL      e.g. http://213.171.10.37:4099
 *   DEPLOY_AGENT_SECRET   shared secret token
 */

import { injectSafetyLayer } from "./injector";

//  Types 

export interface CoolifyApplication {
  uuid: string;
  name: string;
  fqdn: string;
}

export interface DeployResult {
  uuid: string;
  url: string;
  status: "prepared" | "deployed" | "error";
  message?: string;
}

//  Config 

function getConfig() {
  const agentUrl = process.env.DEPLOY_AGENT_URL;
  const agentSecret = process.env.DEPLOY_AGENT_SECRET;
  const baseDomain = process.env.DEPLOY_BASE_DOMAIN;

  if (!agentUrl || !agentSecret || !baseDomain) {
    throw new Error(
      "Missing DEPLOY_AGENT_URL / DEPLOY_AGENT_SECRET / DEPLOY_BASE_DOMAIN"
    );
  }

  return {
    agentUrl: agentUrl.replace(/\/$/, ""),
    agentSecret,
    baseDomain,
  };
}

//  Public API 

/**
 * Full deployment pipeline:
 *  1. Applies safety layer (noindex meta + Sandbox badge) to files.
 *  2. Sends files to the Deploy Agent via HTTP POST.
 *  3. Agent writes files to /var/www/sandboxes/{chatId}/ on the server.
 *  4. nginx serves them instantly at https://{chatId}.deploy.moonely.ru
 *
 * Deploy time: < 1 second.
 */
export async function deployFiles(
  chatId: string,
  files: Record<string, string>
): Promise<DeployResult> {
  const { agentUrl, agentSecret, baseDomain } = getConfig();

  // 1. Apply safety layer (noindex + sandbox badge)
  const safeFiles = injectSafetyLayer(files);

  // 2. Send to deploy agent
  const res = await fetch(`${agentUrl}/deploy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${agentSecret}`,
    },
    body: JSON.stringify({ chatId, files: safeFiles }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Deploy agent error [${res.status}]: ${text}`);
  }

  const data = (await res.json()) as { url?: string };
  const url = data.url ?? `https://${chatId}.${baseDomain}`;

  return {
    uuid: chatId,
    url,
    status: "deployed",
    message: "Сайт опубликован.",
  };
}

/**
 * @deprecated Legacy helper  kept for backward compatibility.
 */
export async function createApplication(
  chatId: string
): Promise<CoolifyApplication> {
  const { baseDomain } = getConfig();
  return {
    uuid: chatId,
    name: `sandbox-${chatId}`,
    fqdn: `https://${chatId}.${baseDomain}`,
  };
}

/** Returns the public sandbox URL for a given chatId without creating anything. */
export function getSandboxUrl(chatId: string): string {
  const { baseDomain } = getConfig();
  return `https://${chatId}.${baseDomain}`;
}