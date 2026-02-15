/**
 * Spawn implementation modules (Modal or mock).
 * Each job gets idea, risk, temperature, callback URL, repo URL, GitHub token.
 */

import type { ImplementationJob } from "./types.ts";
import { getObservabilityHandlers } from "./observability.ts";
import { log } from "./logger.ts";

const CALLBACK_BASE = process.env.CALLBACK_BASE_URL ?? "http://localhost:3001";

async function postStep(jobId: string, step: string, stepIndex: number, done: boolean) {
  const url = `${CALLBACK_BASE}/internal/step`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, step, stepIndex, done, message: step }),
  });
  if (!res.ok) log.warn("step callback failed " + res.status);
}

async function postDone(
  jobId: string,
  repoUrl: string,
  pitch: string,
  success: boolean,
  error?: string,
  branch?: string
) {
  const url = `${CALLBACK_BASE}/internal/done`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, repoUrl, pitch, success, error, branch }),
  });
  if (!res.ok) log.warn("done callback failed " + res.status);
}

/**
 * Run mock implementation (no Modal): log steps and report done with repoUrl.
 * Used when MODAL_IMPLEMENTATION_URL is not set (terminal-first).
 */
export async function runMockImplementation(
  job: ImplementationJob,
  obs: ReturnType<typeof getObservabilityHandlers>
): Promise<void> {
  const { jobId, idea, risk, temperature, repoUrl } = job;
  log.spawn("mock implementation start " + jobId + " risk=" + risk + " temp=" + temperature);
  obs.broadcast({ type: "implementation_start", jobId, idea, risk, temperature });

  const steps = [
    "Plan: scaffold Next.js app",
    "Create app layout and page",
    "Implement core feature from idea",
    "Add styling and polish",
    "Verify build",
  ];
  for (let i = 0; i < steps.length; i++) {
    await postStep(jobId, steps[i]!, i, false);
    await new Promise((r) => setTimeout(r, 500));
  }
  await postStep(jobId, "Complete", steps.length, true);

  const pitch = "Built with Epoch: " + idea;
  const branch = job.branch ?? "main";
  await postDone(jobId, repoUrl ?? "https://github.com/epoch/demo", pitch, true, undefined, branch);
  log.spawn("mock implementation done " + jobId);
}

/**
 * Spawn real implementation on Modal via web endpoint.
 */
export async function runModalImplementation(
  job: ImplementationJob,
  obs: ReturnType<typeof getObservabilityHandlers>
): Promise<void> {
  const url = process.env.MODAL_IMPLEMENTATION_URL;
  if (!url) {
    log.warn("MODAL_IMPLEMENTATION_URL not set, using mock");
    return runMockImplementation(job, obs);
  }

  log.spawn("triggering Modal implementation " + job.jobId);
  obs.broadcast({
    type: "implementation_start",
    jobId: job.jobId,
    idea: job.idea,
    risk: job.risk,
    temperature: job.temperature,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_id: job.jobId,
      idea: job.idea,
      risk: job.risk,
      temperature: job.temperature,
      worker_profile: job.workerProfile,
      callback_base_url: job.callbackBaseUrl,
      branch: job.branch,
      repo_url: job.repoUrl,
      github_token: job.githubToken,
    }),
  });

  if (!res.ok) {
    log.error("Modal trigger failed " + res.status + " " + (await res.text()));
    await postDone(job.jobId, job.repoUrl ?? "", "Implementation failed.", false, "Modal request failed");
  }
  // Modal runs async; it will call /internal/step and /internal/done when done.
}
