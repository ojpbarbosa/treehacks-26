/**
 * Treemux orchestrator server: WebSocket + HTTP callbacks for implementation modules.
 * POST /v1.0/task  — accepts TaskInput, kicks off the pipeline, returns { success }.
 * POST /v1.0/log/* — worker callbacks (start, step, error, push, deployment, done).
 * WS   /ws         — real-time broadcast to UI clients.
 */

import type { TaskInput, ServerState, JobStartedPayload, JobStepLogPayload, JobDonePayload, JobErrorPayload, JobPushPayload, JobDeploymentPayload } from "./types.ts";
import { getObservabilityHandlers } from "./observability.ts";
import { createDeployment } from "./vercel.ts";
import { parseRepoFullName } from "./github.ts";
import { EVALUATOR_WEBHOOK_URL } from "./config.ts";
import { runTask } from "./task.ts";
import { log } from "./logger.ts";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

/* ── Shared state & observability (singleton) ────────────────── */
const obs = getObservabilityHandlers(PORT);

const state: ServerState = {
  totalJobs: 0,
  doneCount: 0,
  results: [],
  deploymentUrls: {},
  async onAllDone(results) {
    log.treemux("All deployments done: " + results.length);
    if (EVALUATOR_WEBHOOK_URL) {
      log.treemux("Sending evaluator webhook to " + EVALUATOR_WEBHOOK_URL);
      const res = await fetch(EVALUATOR_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(results),
      });
      log.treemux("Evaluator webhook response " + res.status);
    } else {
      log.treemux("No EVALUATOR_WEBHOOK_URL set, skipping evaluator webhook");
    }
  },
};

/* ── Route: POST /v1.0/task ──────────────────────────────────── */
async function handleTask(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body: TaskInput;
  try {
    body = (await req.json()) as TaskInput;
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!body.taskDescription || !body.workers) {
    return new Response(JSON.stringify({ success: false, error: "taskDescription and workers are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const result = await runTask(body, obs, state);
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}

/* ── Route: POST /v1.0/log/start ─────────────────────────────── */
async function handleStart(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body: JobStartedPayload;
  try {
    body = (await req.json()) as JobStartedPayload;
  } catch {
    log.error("/v1.0/log/start invalid JSON");
    return new Response("Invalid JSON", { status: 400 });
  }
  log.server("JOB_STARTED " + body.jobId + " totalSteps=" + body.totalSteps);
  obs.broadcast({ type: "JOB_STARTED", payload: body });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

/* ── Route: POST /v1.0/log/step ──────────────────────────────── */
async function handleStep(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body: JobStepLogPayload;
  try {
    body = (await req.json()) as JobStepLogPayload;
  } catch {
    log.error("/v1.0/log/step invalid JSON");
    return new Response("Invalid JSON", { status: 400 });
  }
  log.server("JOB_STEP_LOG " + body.jobId + " [" + body.stepIndex + "/" + body.totalSteps + "] " + body.summary);
  obs.broadcast({ type: "JOB_STEP_LOG", payload: body });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

/* ── Route: POST /v1.0/log/error ─────────────────────────────── */
async function handleError(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body: JobErrorPayload;
  try {
    body = (await req.json()) as JobErrorPayload;
  } catch {
    log.error("/v1.0/log/error invalid JSON");
    return new Response("Invalid JSON", { status: 400 });
  }
  log.server("JOB_ERROR " + body.jobId + " phase=" + (body.phase ?? "unknown") + " " + body.error);
  obs.broadcast({ type: "JOB_ERROR", payload: body });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

/* ── Route: POST /v1.0/log/push ──────────────────────────────── */
async function handlePush(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body: JobPushPayload;
  try {
    body = (await req.json()) as JobPushPayload;
  } catch {
    log.error("/v1.0/log/push invalid JSON");
    return new Response("Invalid JSON", { status: 400 });
  }
  log.server("JOB_PUSH " + body.jobId + " step=" + body.stepIndex + " branch=" + body.branch);
  obs.broadcast({ type: "JOB_PUSH", payload: body });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

/* ── Route: POST /v1.0/log/deployment ────────────────────────── */
async function handleDeployment(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body: JobDeploymentPayload;
  try {
    body = (await req.json()) as JobDeploymentPayload;
  } catch {
    log.error("/v1.0/log/deployment invalid JSON");
    return new Response("Invalid JSON", { status: 400 });
  }
  log.server("JOB_DEPLOYMENT " + body.jobId + " url=" + body.url);
  if (state.deploymentUrls) state.deploymentUrls[body.jobId] = body.url;
  obs.broadcast({ type: "JOB_DEPLOYMENT", payload: body });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

/* ── Route: POST /v1.0/log/done ──────────────────────────────── */
async function handleDone(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body: JobDonePayload;
  try {
    body = (await req.json()) as JobDonePayload;
  } catch {
    log.error("/v1.0/log/done invalid JSON");
    return new Response("Invalid JSON", { status: 400 });
  }
  log.server("JOB_DONE " + body.jobId + " success=" + body.success);
  obs.broadcast({ type: "JOB_DONE", payload: body });

  let url = state.deploymentUrls?.[body.jobId] ?? body.repoUrl;
  if (body.success && body.repoUrl && !state.deploymentUrls?.[body.jobId] && process.env.VERCEL_TOKEN) {
    try {
      const [org, repo] = parseRepoFullName(body.repoUrl);
      if (org && repo) {
        const ref = body.branch ?? "main";
        const deploy = await createDeployment({
          name: `treemux-${body.jobId}`,
          org,
          repo,
          ref,
        });
        url = deploy.url || (deploy.deploymentId ? `https://${deploy.deploymentId}.vercel.app` : body.repoUrl);
        obs.broadcast({ type: "JOB_DEPLOYMENT", payload: { jobId: body.jobId, url } });
      }
    } catch (e) {
      log.warn("Vercel deploy failed for " + body.jobId + " " + String(e));
    }
  }
  if (url) {
    log.server("Deployment endpoint " + body.jobId + ": " + url);
  }

  state.results.push({ url: url || body.repoUrl, idea: body.idea ?? "", pitch: body.pitch ?? "" });
  state.doneCount += 1;
  log.server("progress " + state.doneCount + " / " + state.totalJobs);

  if (state.doneCount >= state.totalJobs) {
    log.server("all implementations done, firing evaluator webhook");
    obs.broadcast({ type: "ALL_DONE", payload: { results: state.results } });
    await state.onAllDone?.(state.results);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

/* ── Boot server ─────────────────────────────────────────────── */
const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    const u = new URL(req.url);
    if (u.pathname === "/ws") {
      if (server.upgrade(req)) return;
      return new Response("Upgrade failed", { status: 426 });
    }
    if (u.pathname === "/v1.0/task") return handleTask(req);
    if (u.pathname === "/v1.0/log/start") return handleStart(req);
    if (u.pathname === "/v1.0/log/step") return handleStep(req);
    if (u.pathname === "/v1.0/log/error") return handleError(req);
    if (u.pathname === "/v1.0/log/push") return handlePush(req);
    if (u.pathname === "/v1.0/log/deployment") return handleDeployment(req);
    if (u.pathname === "/v1.0/log/done") return handleDone(req);
    if (u.pathname === "/health") return new Response("ok");
    return new Response("Not found", { status: 404 });
  },
  websocket: {
    open(ws) { obs.wsOpen(ws); },
    close(ws) { obs.wsClose(ws); },
    message(ws, msg) { obs.wsMessage(ws, msg); },
  },
});

log.server(
  "Listening on :" + server.port +
  " — POST /v1.0/task, /v1.0/log/{start,step,error,push,deployment,done}, WS /ws"
);
