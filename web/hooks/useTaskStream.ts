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
  status: 'building' | 'deployed' | 'failed'
  success?: boolean
  pitch?: string
}

export type TaskPhase = 'idle' | 'creating' | 'ideation' | 'building' | 'done' | 'error'

// ─── WS event shapes ────────────────────────────────────────────

interface WsIdeationDone {
  type: 'IDEATION_DONE'
  payload: { taskId: string; ideas: IdeationIdea[] }
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

type WsEvent =
  | WsIdeationDone | WsJobStarted | WsJobStepLog | WsJobDone
  | WsJobError | WsJobPush | WsJobDeployment | WsAllDone

// ─── Hook ───────────────────────────────────────────────────────

export interface UseTaskStreamReturn {
  /** Current phase of the task lifecycle */
  phase: TaskPhase
  /** The taskId returned by the API */
  taskId: string | null
  /** Ideas from ideation */
  ideas: IdeationIdea[]
  /** All jobs being tracked */
  jobs: Job[]
  /** Final results once all jobs are done */
  allDonePayload: { evaluator: EvaluatorSpec | null; builds: DeploymentResult[] } | null
  /** Any top-level error message */
  error: string | null
  /** Create a new task — kicks off the pipeline */
  createTask: (input: TaskInput) => Promise<void>
  /** Reset everything */
  reset: () => void
}

export function useTaskStream(): UseTaskStreamReturn {
  const [phase, setPhase] = useState<TaskPhase>('idle')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [ideas, setIdeas] = useState<IdeationIdea[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [allDonePayload, setAllDonePayload] = useState<UseTaskStreamReturn['allDonePayload']>(null)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

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
        console.log('WS event:', msg)
      } catch {
        console.error('Failed to parse WS event:', e.data)
        return
      }

      switch (msg.type) {
        case 'IDEATION_DONE': {
          setIdeas(msg.payload.ideas)
          setPhase('ideation')
          break
        }

        case 'JOB_STARTED': {
          const p = msg.payload
          setJobs(prev => {
            // Deduplicate
            if (prev.find(j => j.jobId === p.jobId)) return prev
            return [...prev, {
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
            }]
          })
          setPhase('building')
          break
        }

        case 'JOB_STEP_LOG': {
          const p = msg.payload
          setJobs(prev => prev.map(j => {
            if (j.jobId !== p.jobId) return j
            const step: JobStep = { stepIndex: p.stepIndex, summary: p.summary, done: p.done }
            const steps = [...j.steps.filter(s => s.stepIndex !== p.stepIndex), step]
            return { ...j, steps, currentStep: Math.max(j.currentStep, p.stepIndex + 1) }
          }))
          break
        }

        case 'JOB_PUSH': {
          const p = msg.payload
          setJobs(prev => prev.map(j => {
            if (j.jobId !== p.jobId) return j
            return { ...j, pushes: [...j.pushes, { stepIndex: p.stepIndex, branch: p.branch, summary: p.summary }] }
          }))
          break
        }

        case 'JOB_ERROR': {
          const p = msg.payload
          setJobs(prev => prev.map(j => {
            if (j.jobId !== p.jobId) return j
            return { ...j, errors: [...j.errors, { error: p.error, stderr: p.stderr, phase: p.phase }] }
          }))
          break
        }

        case 'JOB_DEPLOYMENT': {
          const p = msg.payload
          if (phase == 'ideation') {
            setPhase('building')
          }
          setJobs(prev => prev.map(j => {
            if (j.jobId !== p.jobId) return j
            return { ...j, deploymentUrl: p.url }
          }))
          break
        }

        case 'JOB_DONE': {
          const p = msg.payload
          setJobs(prev => prev.map(j => {
            if (j.jobId !== p.jobId) return j
            return {
              ...j,
              status: p.success ? 'deployed' : 'failed',
              success: p.success,
              pitch: p.pitch,
            }
          }))
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
      }
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
  }, [taskId])

  // ── Create task ─────────────────────────────────────────────
  const createTask = useCallback(async (input: TaskInput) => {
    setPhase('creating')
    setError(null)
    setIdeas([])
    setJobs([])
    setAllDonePayload(null)

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
      // Phase will transition to 'ideation' or 'building' when WS events arrive
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
    setIdeas([])
    setJobs([])
    setAllDonePayload(null)
    setError(null)
  }, [])

  return { phase, taskId, ideas, jobs, allDonePayload, error, createTask, reset }
}
