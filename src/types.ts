/**
 * Epoch – Black box layer types
 * Idea → Ideation (OpenRouter) → N × Implementation (Modal + Claude) → GitHub → Vercel
 */

/** Mocked input: task + workers (evaluator unused for now) */
export interface TaskInput {
  taskDescription: string;
  workers: number;
  workerDescriptions: string[];
  evaluator?: EvaluatorSpec;
}

export interface EvaluatorSpec {
  count: number;
  role: string;
  criteria: string[];
}

/** One idea per worker from ideation module */
export interface IdeationIdea {
  idea: string;
  risk: number;
  temperature: number;
}

/** Payload we send to implementation module (e.g. Modal). One branch per worker. */
export interface ImplementationJob {
  jobId: string;
  idea: string;
  risk: number;
  temperature: number;
  workerProfile: string;
  callbackBaseUrl: string;
  /** Branch to push to and to use as Vercel ref (e.g. epoch-job-0) */
  branch: string;
  repoUrl?: string;
  githubToken?: string;
}

/** Step update from implementation module → orchestrator (then WS) */
export interface StepUpdate {
  jobId: string;
  step: string;
  stepIndex: number;
  done: boolean;
  message?: string;
}

/** Done payload from implementation module */
export interface ImplementationDone {
  jobId: string;
  repoUrl: string;
  pitch: string;
  success: boolean;
  error?: string;
  /** Branch that was pushed (use as ref for Vercel) */
  branch?: string;
}

/** Final webhook payload when all deployments are ready */
export interface DeploymentResult {
  url: string;
  pitch: string;
}

export type WebhookPayload = DeploymentResult[];
