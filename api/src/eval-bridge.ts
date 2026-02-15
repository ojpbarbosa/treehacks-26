/**
 * Treemux – Evaluator bridge.
 * After ALL_DONE fires, connects to the eval-agent WebSocket server,
 * sends the evaluation request, and forwards progress events to the frontend
 * via the existing WS channel.
 *
 * The eval-agent must be deployed separately (it has its own Dockerfile).
 * Set EVAL_WS_URL env var to point to it (e.g. wss://eval.example.com/evaluate).
 */

import type { AllDonePayload, EvalProgressPayload, EvalCompletePayload } from "./types.ts";
import type { ObservabilityHandlers } from "./observability.ts";
import { log } from "./logger.ts";

const EVAL_WS_URL = process.env.EVAL_WS_URL; // e.g. ws://localhost:3002/evaluate

/**
 * Kick off evaluation for a completed task.
 * Connects to the eval-agent WebSocket server, sends builds + evaluator spec,
 * and relays progress/results to the frontend via the existing broadcast mechanism.
 */
export async function runEvaluation(
  payload: AllDonePayload,
  obs: ObservabilityHandlers,
): Promise<void> {
  const { taskId, evaluator, builds } = payload;

  if (!evaluator) {
    log.treemux("[eval:" + taskId + "] No evaluator spec, skipping evaluation");
    return;
  }

  if (!EVAL_WS_URL) {
    log.treemux("[eval:" + taskId + "] EVAL_WS_URL not set, skipping evaluation");
    obs.broadcast({
      type: "EVAL_COMPLETE",
      payload: {
        taskId,
        rankings: [],
        summary: "Evaluation skipped: EVAL_WS_URL not configured. Deploy the eval service and set EVAL_WS_URL.",
      },
    });
    return;
  }

  log.treemux("[eval:" + taskId + "] Connecting to eval-agent at " + EVAL_WS_URL);

  obs.broadcast({
    type: "EVAL_PROGRESS",
    payload: {
      taskId,
      eventType: "connecting",
      message: "Connecting to evaluation service…",
    },
  });

  return new Promise<void>((resolve) => {
    const ws = new WebSocket(EVAL_WS_URL);
    let resultReceived = false;

    const timeout = setTimeout(() => {
      log.error("[eval:" + taskId + "] WebSocket connection timeout after 30s");
      resultReceived = true;
      obs.broadcast({
        type: "EVAL_COMPLETE",
        payload: { taskId, rankings: [], summary: "Evaluation connection timeout — eval service may be unavailable" },
      });
      ws.close();
      resolve();
    }, 30_000);

    ws.onopen = () => {
      clearTimeout(timeout);
      log.treemux("[eval:" + taskId + "] Connected to eval-agent, sending request");

      // Send the evaluation request matching the eval-agent protocol
      const request = {
        type: "evaluate",
        evaluator: {
          counter: evaluator.count || 3,
          criteria: evaluator.criteria,
          role: evaluator.role,
        },
        builds: builds.map(b => ({
          url: b.url,
          idea: b.idea,
          pitch: b.pitch,
        })),
      };

      ws.send(JSON.stringify(request));

      obs.broadcast({
        type: "EVAL_PROGRESS",
        payload: {
          taskId,
          eventType: "starting",
          message: "Evaluation started with " + builds.length + " projects…",
        },
      });
    };

    ws.onmessage = (event) => {
      let msg: {
        type: string;
        runId?: string;
        event?: Record<string, unknown>;
        status?: string;
        rankings?: Array<{
          projectName: string;
          compositeScore: number;
          overallScores: Record<string, number>;
        }>;
        summary?: string;
        error?: string;
      };
      try {
        msg = JSON.parse(typeof event.data === "string" ? event.data : String(event.data));
      } catch {
        return;
      }

      if (msg.type === "queued") {
        log.treemux("[eval:" + taskId + "] Evaluation queued, runId=" + msg.runId);
        obs.broadcast({
          type: "EVAL_PROGRESS",
          payload: { taskId, eventType: "queued", message: "Evaluation queued…" },
        });
      } else if (msg.type === "progress" && msg.event) {
        const ev = msg.event;
        // Map ProgressEvent fields — some event types use `message`, others use `error`
        const evType = String(ev.type ?? "unknown");
        const evMessage = String(ev.message ?? ev.error ?? evType);
        const progressPayload: EvalProgressPayload = {
          taskId,
          eventType: evType,
          message: evMessage,
          projectName: ev.projectName as string | undefined,
          judgeName: ev.judgeName as string | undefined,
          score: typeof ev.overallScore === "number" ? ev.overallScore : undefined,
        };
        obs.broadcast({ type: "EVAL_PROGRESS", payload: progressPayload });
        log.treemux("[eval:" + taskId + "] " + evType + ": " + evMessage);
      } else if (msg.type === "result") {
        if (msg.status === "success" && msg.rankings) {
          const completePayload: EvalCompletePayload = {
            taskId,
            rankings: msg.rankings,
            summary: msg.summary ?? "",
          };
          obs.broadcast({ type: "EVAL_COMPLETE", payload: completePayload });
          log.treemux("[eval:" + taskId + "] Evaluation complete, " + msg.rankings.length + " ranked");
        } else {
          const errMsg = msg.error ?? "unknown error";
          log.error("[eval:" + taskId + "] Evaluation failed: " + errMsg);
          // Send a terminal EVAL_COMPLETE so the frontend exits the 'evaluating' phase
          obs.broadcast({
            type: "EVAL_COMPLETE",
            payload: {
              taskId,
              rankings: [],
              summary: "Evaluation failed: " + errMsg,
            },
          });
        }
        resultReceived = true;
        resolve();
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timeout);
      if (!resultReceived) {
        resultReceived = true;
        const message = err instanceof Error ? err.message : String(err);
        log.error("[eval:" + taskId + "] WebSocket error: " + message);
        obs.broadcast({
          type: "EVAL_COMPLETE",
          payload: { taskId, rankings: [], summary: "Evaluation connection error: " + message },
        });
      }
      resolve();
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      log.treemux("[eval:" + taskId + "] WebSocket closed");
      // If no result was received (unexpected close), send terminal event
      if (!resultReceived) {
        resultReceived = true;
        obs.broadcast({
          type: "EVAL_COMPLETE",
          payload: { taskId, rankings: [], summary: "Evaluation service disconnected unexpectedly" },
        });
      }
      resolve();
    };
  });
}
