'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY = 'treehacks-events'

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

export interface Job {
  jobId: string
  idea: string
  temperature: number
  risk: string
  branch: string
  totalSteps: number
  planSteps: string[]
  currentStep: number
  steps: JobStep[]
  pushes: JobPush[]
  deploymentUrl?: string
  status: 'building' | 'deployed'
}

interface StartEvent {
  id: number
  type: 'start'
  jobId: string
  idea: string
  temperature: number
  risk: string
  branch: string
  totalSteps: number
  planSteps: string[]
}

interface StepEvent {
  id: number
  type: 'step'
  jobId: string
  stepIndex: number
  summary: string
  done: boolean
}

interface PushEvent {
  id: number
  type: 'push'
  jobId: string
  stepIndex: number
  branch: string
  summary: string
}

interface DeploymentEvent {
  id: number
  type: 'deployment'
  jobId: string
  url: string
}

type StreamEvent = StartEvent | StepEvent | PushEvent | DeploymentEvent

function buildJobsFromEvents(events: StreamEvent[]): Map<string, Job> {
  const jobs = new Map<string, Job>()

  for (const event of events) {
    switch (event.type) {
      case 'start':
        jobs.set(event.jobId, {
          jobId: event.jobId,
          idea: event.idea,
          temperature: event.temperature,
          risk: event.risk,
          branch: event.branch,
          totalSteps: event.totalSteps,
          planSteps: event.planSteps,
          currentStep: -1,
          steps: [],
          pushes: [],
          deploymentUrl: undefined,
          status: 'building',
        })
        break
      case 'step': {
        const job = jobs.get(event.jobId)
        if (job) {
          job.currentStep = event.stepIndex
          if (!job.steps.some(s => s.stepIndex === event.stepIndex)) {
            job.steps.push({
              stepIndex: event.stepIndex,
              summary: event.summary,
              done: event.done,
            })
          }
        }
        break
      }
      case 'push': {
        const job = jobs.get(event.jobId)
        if (job) {
          if (!job.pushes.some(p => p.stepIndex === event.stepIndex)) {
            job.pushes.push({
              stepIndex: event.stepIndex,
              branch: event.branch,
              summary: event.summary,
            })
          }
        }
        break
      }
      case 'deployment': {
        const job = jobs.get(event.jobId)
        if (job) {
          job.deploymentUrl = event.url
          job.status = 'deployed'
        }
        break
      }
    }
  }

  return jobs
}

function loadStoredEvents(): StreamEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function getMaxEventId(events: StreamEvent[]): number {
  return events.reduce((max, e) => Math.max(max, e.id || 0), 0)
}

export interface UseJobStreamReturn {
  jobs: Job[]
  clearJobs: () => void
}

export function useJobStream(): UseJobStreamReturn {
  const eventsRef = useRef<StreamEvent[]>(loadStoredEvents())
  const [jobs, setJobs] = useState<Map<string, Job>>(() => buildJobsFromEvents(eventsRef.current))

  useEffect(() => {
    const lastId = getMaxEventId(eventsRef.current)
    const eventSource = new EventSource(`/api/events?lastId=${lastId}`)

    eventSource.onmessage = (e: MessageEvent) => {
      const event: StreamEvent = JSON.parse(e.data)

      // Deduplicate by event id
      if (eventsRef.current.some(existing => existing.id === event.id)) return

      eventsRef.current = [...eventsRef.current, event]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(eventsRef.current))
      setJobs(buildJobsFromEvents(eventsRef.current))
    }

    eventSource.onerror = () => {
      // EventSource auto-reconnects
    }

    return () => eventSource.close()
  }, [])

  const clearJobs = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    eventsRef.current = []
    setJobs(new Map())
  }, [])

  return {
    jobs: Array.from(jobs.values()),
    clearJobs,
  }
}
