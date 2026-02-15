'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ─── Event types matching api/src/types.ts ──────────────────────

export interface EvaluatorSpec {
  count: number
  role: string
  criteria: string
}

export interface TaskInput {
  taskDescription: string
  workers: number
  workerDescriptions: string[]
  evaluator?: EvaluatorSpec
  model?: string
}

export interface IdeationIdea {
  idea: string
  risk: number
  temperature: number
}

export interface JobStep {
  stepIndex: number
  summary: string
  done: boolean
}

export interface JobPush {
  stepIndex: number
  branch: string
  summary: string
}

export interface JobError {
  error: string
  stderr?: string
  phase?: string
}

export interface DeploymentResult {
  url: string
  idea: string
  pitch: string
}

export interface Job {
  jobId: string
  taskId: string
  idea: string
  temperature: number
  risk: number
  branch: string
  totalSteps: number
  planSteps: string[]
  currentStep: number
  steps: JobStep[]
  pushes: JobPush[]
  errors: JobError[]
  deploymentUrl?: string
  status: 'pending' | 'building' | 'deployed' | 'failed'
  success?: boolean
  pitch?: string
}

export type TaskPhase = 'idle' | 'creating' | 'ideation' | 'building' | 'done' | 'evaluating' | 'error'

export interface EvalProgress {
  eventType: string
  message: string
  projectName?: string
  judgeName?: string
  score?: number
}

export interface EvalResults {
  rankings: Array<{
    projectName: string
    compositeScore: number
    overallScores: Record<string, number>
  }>
  summary: string
}

// ─── WS event shapes ────────────────────────────────────────────

interface WsIdeationDone {
  type: 'IDEATION_DONE'
  payload: { taskId: string; ideas: IdeationIdea[]; workerDescriptions?: string[] }
}
interface WsJobStarted {
  type: 'JOB_STARTED'
  payload: {
    taskId: string; jobId: string; idea: string; temperature: number
    risk: number; branch: string; totalSteps: number; planSteps: string[]
  }
}
interface WsJobStepLog {
  type: 'JOB_STEP_LOG'
  payload: {
    taskId: string; jobId: string; stepIndex: number; totalSteps: number
    done: boolean; summary: string
  }
}
interface WsJobDone {
  type: 'JOB_DONE'
  payload: {
    taskId: string; jobId: string; repoUrl: string; idea: string
    pitch: string; success: boolean; error?: string; branch?: string
  }
}
interface WsJobError {
  type: 'JOB_ERROR'
  payload: {
    taskId: string; jobId: string; error: string; stderr?: string; phase?: string
  }
}
interface WsJobPush {
  type: 'JOB_PUSH'
  payload: {
    taskId: string; jobId: string; stepIndex: number; branch: string; summary: string
  }
}
interface WsJobDeployment {
  type: 'JOB_DEPLOYMENT'
  payload: { taskId: string; jobId: string; url: string }
}
interface WsAllDone {
  type: 'ALL_DONE'
  payload: {
    taskId: string; evaluator: EvaluatorSpec | null; builds: DeploymentResult[]
  }
}
interface WsEvalProgress {
  type: 'EVAL_PROGRESS'
  payload: {
    taskId: string; eventType: string; message: string
    projectName?: string; judgeName?: string; score?: number
  }
}
interface WsEvalComplete {
  type: 'EVAL_COMPLETE'
  payload: {
    taskId: string
    rankings: Array<{ projectName: string; compositeScore: number; overallScores: Record<string, number> }>
    summary: string
  }
}

type WsEvent =
  | WsIdeationDone | WsJobStarted | WsJobStepLog | WsJobDone
  | WsJobError | WsJobPush | WsJobDeployment | WsAllDone
  | WsEvalProgress | WsEvalComplete

// ─── Hook ───────────────────────────────────────────────────────

export interface UseTaskStreamReturn {
  phase: TaskPhase
  taskId: string | null
  taskDescription: string
  ideas: IdeationIdea[]
  jobs: Job[]
  workerDescriptions: string[]
  allDonePayload: { evaluator: EvaluatorSpec | null; builds: DeploymentResult[] } | null
  evalProgress: EvalProgress[]
  evalResults: EvalResults | null
  error: string | null
  createTask: (input: TaskInput) => Promise<void>
  reset: () => void
}

export function useTaskStream(): UseTaskStreamReturn {
  const [phase, setPhase] = useState<TaskPhase>('idle')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [taskDescription, setTaskDescription] = useState('')
  const [ideas, setIdeas] = useState<IdeationIdea[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [workerDescriptions, setWorkerDescriptions] = useState<string[]>([])
  const [allDonePayload, setAllDonePayload] = useState<UseTaskStreamReturn['allDonePayload']>(null)
  const [evalProgress, setEvalProgress] = useState<EvalProgress[]>([])
  const [evalResults, setEvalResults] = useState<EvalResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  /**
   * Buffer for events that arrive before their JOB_STARTED.
   * JOB_DEPLOYMENT can be sent from the orchestrator before the worker
   * even starts, so we hold them until the job exists.
   */
  const earlyEventsRef = useRef<Map<string, WsEvent[]>>(new Map())

  // ── Apply a single event to the jobs state ──────────────────
  function applyEvent(msg: WsEvent) {
    switch (msg.type) {
      case 'IDEATION_DONE': {
        setIdeas(msg.payload.ideas)
        if (msg.payload.workerDescriptions) {
          setWorkerDescriptions(msg.payload.workerDescriptions)
        }
        setPhase('ideation')
        break
      }

      case 'JOB_STARTED': {
        const p = msg.payload
        setJobs(prev => {
          if (prev.find(j => j.jobId === p.jobId)) return prev

          const newJob: Job = {
            jobId: p.jobId,
            taskId: p.taskId,
            idea: p.idea,
            temperature: p.temperature,
            risk: p.risk,
            branch: p.branch,
            totalSteps: p.totalSteps,
            planSteps: p.planSteps,
            currentStep: 0,
            steps: [],
            pushes: [],
            errors: [],
            status: 'building',
          }

          // Replay any buffered events for this job
          const buffered = earlyEventsRef.current.get(p.jobId)
          if (buffered) {
            earlyEventsRef.current.delete(p.jobId)
            let patched = newJob
            for (const ev of buffered) {
              patched = applyJobEvent(patched, ev)
            }
            return [...prev, patched]
          }

          return [...prev, newJob]
        })
        setPhase('building')
        break
      }

      case 'JOB_STEP_LOG':
      case 'JOB_PUSH':
      case 'JOB_ERROR':
      case 'JOB_DEPLOYMENT':
      case 'JOB_DONE': {
        const jobId = msg.payload.jobId
        setJobs(prev => {
          const idx = prev.findIndex(j => j.jobId === jobId)
          if (idx === -1) {
            // Job doesn't exist yet → buffer
            const buf = earlyEventsRef.current.get(jobId) ?? []
            buf.push(msg)
            earlyEventsRef.current.set(jobId, buf)
            return prev
          }
          const updated = [...prev]
          updated[idx] = applyJobEvent(prev[idx]!, msg)
          return updated
        })
        break
      }

      case 'ALL_DONE': {
        setAllDonePayload({
          evaluator: msg.payload.evaluator,
          builds: msg.payload.builds,
        })
        setPhase('done')
        break
      }

      case 'EVAL_PROGRESS': {
        const p = msg.payload
        setEvalProgress(prev => [...prev, {
          eventType: p.eventType,
          message: p.message,
          projectName: p.projectName,
          judgeName: p.judgeName,
          score: p.score,
        }])
        // Only transition to 'evaluating' for non-error progress events
        if (p.eventType !== 'error') {
          setPhase('evaluating')
        }
        break
      }

      case 'EVAL_COMPLETE': {
        setEvalResults({
          rankings: msg.payload.rankings,
          summary: msg.payload.summary,
        })
        setPhase('done')
        break
      }
    }
  }

  // ── WebSocket connection ────────────────────────────────────
  useEffect(() => {
    if (!taskId) return

    const wsUrl = API_URL.replace(/^http/, 'ws') + '/ws?taskId=' + taskId
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (e) => {
      let msg: WsEvent
      try {
        msg = JSON.parse(e.data) as WsEvent
      } catch {
        return
      }
      applyEvent(msg)
    }

    ws.onerror = () => {
      setError('WebSocket connection error')
    }

    ws.onclose = () => {
      wsRef.current = null
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  // ── Create task ─────────────────────────────────────────────
  const createTask = useCallback(async (input: TaskInput) => {
    setPhase('creating')
    setError(null)
    setIdeas([])
    setJobs([])
    setWorkerDescriptions([])
    setAllDonePayload(null)
    setEvalProgress([])
    setEvalResults(null)
    setTaskDescription(input.taskDescription)
    earlyEventsRef.current.clear()

    try {
      const res = await fetch(API_URL + '/v1.0/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok || !data.taskId) {
        setError(data.error ?? 'Failed to create task')
        setPhase('error')
        return
      }
      setTaskId(data.taskId)
    } catch (e) {
      setError('Network error: ' + String(e))
      setPhase('error')
    }
  }, [])

  // ── Reset ───────────────────────────────────────────────────
  const reset = useCallback(() => {
    wsRef.current?.close()
    setPhase('idle')
    setTaskId(null)
    setTaskDescription('')
    setIdeas([])
    setJobs([])
    setWorkerDescriptions([])
    setAllDonePayload(null)
    setEvalProgress([])
    setEvalResults(null)
    setError(null)
    earlyEventsRef.current.clear()
  }, [])

  return { phase, taskId, taskDescription, ideas, jobs, workerDescriptions, allDonePayload, evalProgress, evalResults, error, createTask, reset }
}

// ─── Pure job update helper ─────────────────────────────────────

function applyJobEvent(job: Job, msg: WsEvent): Job {
  switch (msg.type) {
    case 'JOB_STEP_LOG': {
      const p = msg.payload
      const step: JobStep = { stepIndex: p.stepIndex, summary: p.summary, done: p.done }
      const steps = [...job.steps.filter(s => s.stepIndex !== p.stepIndex), step]
      return { ...job, steps, currentStep: Math.max(job.currentStep, p.stepIndex + 1) }
    }
    case 'JOB_PUSH': {
      const p = msg.payload
      return { ...job, pushes: [...job.pushes, { stepIndex: p.stepIndex, branch: p.branch, summary: p.summary }] }
    }
    case 'JOB_ERROR': {
      const p = msg.payload
      return { ...job, errors: [...job.errors, { error: p.error, stderr: p.stderr, phase: p.phase }] }
    }
    case 'JOB_DEPLOYMENT': {
      return { ...job, deploymentUrl: msg.payload.url }
    }
    case 'JOB_DONE': {
      const p = msg.payload
      return {
        ...job,
        status: p.success ? 'deployed' : 'failed',
        success: p.success,
        pitch: p.pitch,
      }
    }
    default:
      return job
  }
}
