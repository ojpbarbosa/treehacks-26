/**
 * Epoch – Black box orchestrator (terminal-first).
 * Flow: mock input → ideation (OpenRouter) → N × implementation (Modal or mock) → GitHub → Vercel → evaluator webhook.
 */

import { MOCK_INPUT, CALLBACK_BASE_URL, EVALUATOR_WEBHOOK_URL } from "./config.ts";
import type { TaskInput, IdeationIdea, ImplementationJob } from "./types.ts";
import { ideate } from "./ideation.ts";
import { createServer } from "./server.ts";
import { createRepo } from "./github.ts";
import { runMockImplementation, runModalImplementation } from "./implementation-spawn.ts";
import { getObservabilityHandlers } from "./observability.ts";
import { log } from "./logger.ts";

const USE_MODAL = Boolean(process.env.MODAL_IMPLEMENTATION_URL);

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

  obs.broadcast({ type: "ideation", ideas });
  log.epoch("Ideation done, spawning " + ideas.length + " implementation(s)");

  const jobs: ImplementationJob[] = [];
  for (let i = 0; i < ideas.length; i++) {
    const idea = ideas[i]!;
    const jobId = `job-${i}`;
    let repoUrl: string | undefined;
    let githubToken: string | undefined;
    if (process.env.GITHUB_TOKEN) {
      try {
        const repo = await createRepo(`epoch-${jobId}`);
        repoUrl = repo.cloneUrl;
        githubToken = process.env.GITHUB_TOKEN;
      } catch (e) {
        log.warn("GitHub repo creation failed for " + jobId + " " + String(e));
      }
    }
    const branch = `epoch-${jobId}`;
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
