/**
 * Treemux – Evaluator bridge.
 * After ALL_DONE fires, this module calls the eval-agent library to evaluate
 * all builds, streaming progress events over the existing WS channel.
 */

import type { AllDonePayload, EvalProgressPayload, EvalCompletePayload } from "./types.ts";
import type { ObservabilityHandlers } from "./observability.ts";
import { log } from "./logger.ts";

/**
 * Kick off evaluation for a completed task.
 * Runs asynchronously — progress and results are broadcast via WS.
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

  log.treemux("[eval:" + taskId + "] Starting evaluation with " + builds.length + " builds");

  // Broadcast initial progress
  obs.broadcast({
    type: "EVAL_PROGRESS",
    payload: {
      taskId,
      eventType: "starting",
      message: "Starting evaluation of " + builds.length + " projects…",
    },
  });

  try {
    // Dynamic import to avoid requiring eval-agent deps at startup
    const { createEvaluator } = await import("eval-agent");

    const context = evaluator.criteria
      ? `You are evaluating projects as a "${evaluator.role}". Judge based on: ${evaluator.criteria}.`
      : `You are evaluating projects as a "${evaluator.role}".`;

    const evalInstance = createEvaluator({
      context,
      judgeCount: evaluator.count || 3,
      outputDir: `/tmp/treemux-eval-${taskId}`,
      local: true,
    });

    const projects = builds.map((b, i) => ({
      name: `build-${i + 1}`,
      url: b.url || undefined,
      idea: b.idea,
      pitch: b.pitch,
    }));

    const results = await evalInstance.evaluate({
      projects,
      onProgress: (event: { type: string; message?: string; projectName?: string; judgeName?: string; overallScore?: number }) => {
        const progressPayload: EvalProgressPayload = {
          taskId,
          eventType: event.type,
          message: event.message ?? event.type,
          projectName: event.projectName,
          judgeName: event.judgeName,
          score: event.overallScore,
        };

        obs.broadcast({ type: "EVAL_PROGRESS", payload: progressPayload });
        log.treemux("[eval:" + taskId + "] " + event.type + ": " + (event.message ?? ""));
      },
    });

    // Build the completion payload
    const rankings = results.rankings.map((r) => ({
      projectName: r.projectName,
      compositeScore: r.compositeScore,
      overallScores: r.overallScores,
    }));

    const completePayload: EvalCompletePayload = {
      taskId,
      rankings,
      summary: results.reports.summary,
    };

    obs.broadcast({ type: "EVAL_COMPLETE", payload: completePayload });
    log.treemux("[eval:" + taskId + "] Evaluation complete, " + rankings.length + " projects ranked");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("[eval:" + taskId + "] Evaluation failed: " + message);

    obs.broadcast({
      type: "EVAL_PROGRESS",
      payload: {
        taskId,
        eventType: "error",
        message: "Evaluation failed: " + message,
      },
    });
  }
}
