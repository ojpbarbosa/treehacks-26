/**
 * Vercel deployment automation via @vercel/sdk.
 * One branch per worker: ref = branch (e.g. epoch-job-0).
 * @see https://docs.vercel.com/docs/rest-api/reference/examples/deployments-automation
 */

import { Vercel } from "@vercel/sdk";
import { log } from "./logger.ts";

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 600000; // 10 min

export interface VercelDeployResult {
  url: string;
  deploymentId: string;
  status: string;
}

function getClient(): Vercel {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    log.error("VERCEL_TOKEN not set");
    throw new Error("VERCEL_TOKEN required");
  }
  return new Vercel({ bearerToken: token });
}

/**
 * Create a deployment from a GitHub repo (one ref/branch per worker) and poll until READY.
 */
export async function createDeployment(options: {
  name: string;
  org: string;
  repo: string;
  ref: string;
}): Promise<VercelDeployResult> {
  const { name, org, repo, ref } = options;
  log.vercel("Creating deployment " + name + " " + org + "/" + repo + "@" + ref + " ...");

  const vercel = getClient();
  const createResponse = await vercel.deployments.createDeployment({
    requestBody: {
      name,
      target: "production",
      gitSource: {
        type: "github",
        org,
        repo,
        ref,
      },
    },
  });

  const deploymentId = createResponse.id ?? "";
  let url = createResponse.url ?? "";
  let status = (createResponse.status ?? createResponse.readyState ?? "QUEUED") as string;

  log.vercel("Deployment created: " + deploymentId + " status=" + status);

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (status === "BUILDING" || status === "INITIALIZING" || status === "QUEUED") {
    if (Date.now() >= deadline) {
      log.warn("Vercel deployment poll timeout for " + deploymentId);
      break;
    }
    await sleep(POLL_INTERVAL_MS);
    const statusResponse = await vercel.deployments.getDeployment({
      idOrUrl: deploymentId,
      withGitRepoInfo: "true",
    });
    status = (statusResponse.status ?? status) as string;
    if (statusResponse.url) url = statusResponse.url;
    log.vercel("Deployment status: " + status);
  }

  if (status === "READY" && url) {
    log.vercel("Deployment ready: " + url);
  } else if (status === "ERROR") {
    log.warn("Deployment failed (ERROR) for " + deploymentId);
  }

  return {
    url: url || `https://${deploymentId}.vercel.app`,
    deploymentId,
    status,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
