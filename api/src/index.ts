/**
 * Epoch – Black box orchestrator (terminal-first).
 * Flow: mock input → ideation (OpenRouter) → N × implementation (Modal or mock) → GitHub → Vercel → evaluator webhook.
 */

import { customAlphabet } from "nanoid";
import { MOCK_INPUT, CALLBACK_BASE_URL, EVALUATOR_WEBHOOK_URL } from "./config.ts";
import type { TaskInput, IdeationIdea, ImplementationJob } from "./types.ts";
import { ideate } from "./ideation.ts";
import { createServer } from "./server.ts";
import { createRepo, createBranch, parseRepoFullName } from "./github.ts";
import { createDeployment } from "./vercel.ts";
import { runMockImplementation, runModalImplementation } from "./implementation-spawn.ts";
import { log } from "./logger.ts";

const USE_MODAL = Boolean(process.env.MODAL_IMPLEMENTATION_WORKER_URL);

const jobIdGenerator = customAlphabet("abcdefghijklmnopqrstuvwxyz", 21);
function generateId(): string {
  return jobIdGenerator();
}

async function main() {
  const input: TaskInput = MOCK_INPUT;
  log.epoch("========== Epoch Black Box ==========");
  log.epoch("Task: " + input.taskDescription);
  log.epoch("Workers: " + input.workers);
  log.epoch("Callback base: " + CALLBACK_BASE_URL);
  log.epoch("Implementation: " + (USE_MODAL ? "Modal" : "mock"));

  const state = {
    totalJobs: input.workers,
    doneCount: 0,
    results: [] as { url: string; pitch: string }[],
    /** Deployment URL per jobId (created when branch is created) */
    deploymentUrls: {} as Record<string, string>,
    async onAllDone(results: { url: string; pitch: string }[]) {
      log.epoch("All deployments done: " + results.length);
      if (EVALUATOR_WEBHOOK_URL) {
        log.epoch("Sending evaluator webhook to " + EVALUATOR_WEBHOOK_URL + " with " + JSON.stringify(results));
        const res = await fetch(EVALUATOR_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(results),
        });
        log.epoch("Evaluator webhook response " + res.status);
      } else {
        log.epoch("No EVALUATOR_WEBHOOK_URL set, skipping evaluator webhook");
      }
    },
  };

  const { server, obs } = createServer(state);
  const port = server.port;

  log.epoch("Running ideation (single OpenRouter call)...");
  const ideas: IdeationIdea[] = await ideate({
    taskDescription: input.taskDescription,
    workerDescriptions: input.workerDescriptions.slice(0, input.workers),
  });

  obs.broadcast({ type: "IDEATION_DONE", payload: { ideas } });
  log.epoch("Ideation done, spawning " + ideas.length + " implementation(s)");

  const jobs: ImplementationJob[] = [];
  const repo = await createRepo(`epoch-${generateId()}`);
  for (let i = 0; i < ideas.length; i++) {
    const idea = ideas[i]!;
    const jobId = generateId();
    const branch = `epoch-worker-${jobId}`;
    let repoUrl: string | undefined;
    let githubToken: string | undefined;
    if (process.env.GITHUB_TOKEN) {
      try {
        await createBranch(repo.fullName, branch);
        repoUrl = repo.cloneUrl;
        githubToken = process.env.GITHUB_TOKEN;
        if (process.env.VERCEL_TOKEN && repoUrl) {
          const [org, repoName] = parseRepoFullName(repoUrl);
          if (org && repoName) {
            try {
              const deploy = await createDeployment({
                name: repoName,
                org,
                repo: repoName,
                ref: branch,
              });
              const url = deploy.url || `https://${deploy.deploymentId}.vercel.app`;
              state.deploymentUrls[jobId] = url;
              log.vercel("Deployment endpoint for " + jobId + " (branch " + branch + "): " + url);
              obs.broadcast({ type: "JOB_DEPLOYMENT", payload: { jobId, url } });
            } catch (e) {
              log.warn("Vercel deploy failed for " + jobId + " " + String(e));
            }
          }
        }
      } catch (e) {
        log.warn("GitHub repo/branch creation failed for " + jobId + " " + String(e));
      }
    }
    jobs.push({
      jobId,
      idea: idea.idea,
      risk: idea.risk,
      temperature: idea.temperature,
      workerProfile: input.workerDescriptions[i] ?? "",
      callbackBaseUrl: CALLBACK_BASE_URL,
      branch,
      repoUrl,
      githubToken,
    });
  }

  for (const job of jobs) {
    if (USE_MODAL) {
      runModalImplementation(job, obs).catch((e) => log.error("Modal spawn error " + String(e)));
    } else {
      runMockImplementation(job, obs).catch((e) => log.error("Mock spawn error " + String(e)));
    }
  }

  log.epoch("All jobs triggered. Listen on ws://localhost:" + port + "/ws for updates.");
}

main().catch((e) => {
  log.error("Fatal " + String(e));
  process.exit(1);
});
