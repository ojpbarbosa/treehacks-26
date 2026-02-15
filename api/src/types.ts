/**
 * Treemux – Black box layer types
 * Task → N × Implementation (Modal + Claude Code CLI) → GitHub → Vercel
 *
 * All WebSocket messages use the unified wrapper: { type: string, payload: ... }
 * Every payload carries a `taskId` so clients can subscribe to a specific channel.
 */

/** Input for POST /v1.0/task */
export interface TaskInput {
  taskDescription: string;
  workers: number;
  workerDescriptions: string[];
  evaluator?: EvaluatorSpec;
  /** Claude model to use (e.g. "sonnet", "opus"). Omit for default. */
  model?: string;
}

export interface EvaluatorSpec {
  count: number;
  role: string;
  criteria: string;
}

/** One idea per worker from ideation module */
export interface IdeationIdea {
  idea: string;
  risk: number;
  temperature: number;
}

/** Payload we send to implementation module (e.g. Modal). One branch per worker. */
export interface ImplementationJob {
  /** Parent task that spawned this job */
  taskId: string;
  jobId: string;
  idea: string;
  risk: number;
  temperature: number;
  workerProfile: string;
  callbackBaseUrl: string;
  /** Branch to push to and to use as Vercel ref */
  branch: string;
  repoUrl?: string;
  githubToken?: string;
  /** Passed to worker so it can re-trigger Vercel after first push */
  vercelToken?: string;
  /** Git committer identity (must match GitHub account owner for Vercel auto-deploy) */
  gitUserName?: string;
  gitUserEmail?: string;
  /** Claude Code OAuth token for CLI auth in the sandbox */
  claudeOauthToken?: string;
  /** Claude model to use (e.g. "sonnet", "opus"). Omit for default. */
  model?: string;
  /** API keys passed through to sandbox environment */
  anthropicApiKey?: string;
  openaiApiKey?: string;
  openrouterApiKey?: string;
}

// ─── Unified WebSocket event types ───────────────────────────────

/** Every WS message has this shape */
export type WsEvent =
  | { type: "IDEATION_DONE"; payload: IdeationDonePayload }
  | { type: "JOB_STARTED"; payload: JobStartedPayload }
  | { type: "JOB_STEP_LOG"; payload: JobStepLogPayload }
  | { type: "JOB_DONE"; payload: JobDonePayload }
  | { type: "JOB_ERROR"; payload: JobErrorPayload }
  | { type: "JOB_PUSH"; payload: JobPushPayload }
  | { type: "JOB_DEPLOYMENT"; payload: JobDeploymentPayload }
  | { type: "ALL_DONE"; payload: AllDonePayload }
  | { type: "EVAL_PROGRESS"; payload: EvalProgressPayload }
  | { type: "EVAL_COMPLETE"; payload: EvalCompletePayload };

/** Eval progress event forwarded from evaluator */
export interface EvalProgressPayload {
  taskId: string;
  eventType: string;
  message: string;
  projectName?: string;
  judgeName?: string;
  score?: number;
}

/** Final eval results */
export interface EvalCompletePayload {
  taskId: string;
  rankings: Array<{
    projectName: string;
    compositeScore: number;
    overallScores: Record<string, number>;
  }>;
  summary: string;
}

export interface IdeationDonePayload {
  taskId: string;
  ideas: IdeationIdea[];
  workerDescriptions?: string[];
}

/** Sent when the sandbox starts — includes plan + context for the UI pipeline */
export interface JobStartedPayload {
  taskId: string;
  jobId: string;
  idea: string;
  temperature: number;
  risk: number;
  branch: string;
  /** Total planned steps (parsed from numbered plan) */
  totalSteps: number;
  /** One-line-per-step plan for the pipeline UI */
  planSteps: string[];
}

/** Per-step log — shown as a node/log-line in the pipeline UI */
export interface JobStepLogPayload {
  taskId: string;
  jobId: string;
  stepIndex: number;
  totalSteps: number;
  done: boolean;
  /** Concise label for the pipeline node (e.g. "Installing dependencies") */
  summary: string;
}

/** Job finished */
export interface JobDonePayload {
  taskId: string;
  jobId: string;
  repoUrl: string;
  /** The original idea given to the worker */
  idea: string;
  /** A compelling elevator pitch for the evaluator */
  pitch: string;
  success: boolean;
  error?: string;
  branch?: string;
}

/** Non-fatal error during job execution (e.g. git push failed) */
export interface JobErrorPayload {
  taskId: string;
  jobId: string;
  error: string;
  /** Raw stderr from the failed command */
  stderr?: string;
  /** Which phase failed (e.g. "git_init", "git_push", "agent") */
  phase?: string;
}

/** Successful git push for a step */
export interface JobPushPayload {
  taskId: string;
  jobId: string;
  stepIndex: number;
  branch: string;
  summary: string;
}

/** Vercel deployment URL available */
export interface JobDeploymentPayload {
  taskId: string;
  jobId: string;
  url: string;
}

/** All jobs done → evaluator webhook fired */
export interface AllDonePayload {
  taskId: string;
  evaluator: EvaluatorSpec | null;
  builds: DeploymentResult[];
}

/** Final webhook payload when all deployments are ready */
export interface DeploymentResult {
  url: string;
  idea: string;
  pitch: string;
}

export type WebhookPayload = AllDonePayload;

// ─── Server state (shared between controller & server) ──────────

export type OnAllDone = (payload: AllDonePayload) => void | Promise<void>;

export interface ServerState {
  /** How many jobs were spawned per repoUrl */
  jobsPerRepoUrl: Map<string, number>;
  /** How many jobs have completed per repoUrl */
  completedJobs: Map<string, number>;
  /** Evaluator spec stored per repoUrl (set at task creation time) */
  evaluators: Map<string, EvaluatorSpec>;
  /** taskId stored per repoUrl (set at task creation time) */
  taskIds: Map<string, string>;
  /** Accumulated results (url + idea + pitch + repoUrl for grouping) */
  results: { url: string; idea: string; pitch: string; repoUrl: string }[];
  onAllDone?: OnAllDone;
}
