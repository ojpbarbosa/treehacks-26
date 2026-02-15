import { useState, useCallback, useRef, useEffect } from 'react'
import { TEAMS, getTeamStatus } from '../data/teams'
import type { TeamMetrics, TeamEvent, Milestone, ScriptEvent, IdeaUpdate } from '../data/teams'

const TICK_MS = 80
const HOURS_PER_TICK = 0.04

export interface SimulationTeam {
  id: string
  name: string
  chips: string[]
  initialMetrics: TeamMetrics
  initialMilestones: Milestone[]
  initialEvents: TeamEvent[]
  script: ScriptEvent[]
  events: TeamEvent[]
  metrics: TeamMetrics
  currentIdea: IdeaUpdate | null
  milestones: Milestone[]
  status: string
  lastScriptIndex: number
}

export interface UseSimulationReturn {
  simHour: number
  isPlaying: boolean
  speed: number
  teams: SimulationTeam[]
  finished: boolean
  play: () => void
  pause: () => void
  setSimSpeed: (s: number) => void
  jumpToHour: (hour: number) => void
}

export function useSimulation(): UseSimulationReturn {
  const [simHour, setSimHour] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [finished, setFinished] = useState(false)
  const [teams, setTeams] = useState<SimulationTeam[]>(() => TEAMS.map(t => ({
    ...t,
    events: [] as TeamEvent[],
    metrics: { ...t.initialMetrics },
    currentIdea: null,
    milestones: t.initialMilestones.map(m => ({ ...m })),
    status: 'Ideating',
    lastScriptIndex: -1,
  })))

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const tick = useCallback(() => {
    setSimHour(prev => {
      const next = Math.min(prev + HOURS_PER_TICK * speed, 36)
      if (next >= 36) {
        setIsPlaying(false)
        setFinished(true)
      }
      return next
    })
  }, [speed])

  // Process scripted events based on current simHour
  useEffect(() => {
    const hour = simHour
    setTeams(prev => prev.map(team => {
      let nextIndex = team.lastScriptIndex + 1
      let updated = false
      let newEvents = [...team.events]
      let newMilestones = team.milestones.map(m => ({ ...m }))
      let newMetrics = { ...team.metrics }
      let newIdea = team.currentIdea ? { ...team.currentIdea } : null

      while (nextIndex < team.script.length && team.script[nextIndex].hour <= hour) {
        const scriptEvent = team.script[nextIndex]
        updated = true

        const event: TeamEvent = {
          id: `${team.id}-${nextIndex}`,
          text: scriptEvent.text,
          type: scriptEvent.type,
          hour: scriptEvent.hour,
        }
        newEvents = [event, ...newEvents]

        if (scriptEvent.milestone) {
          newMilestones = newMilestones.map(m =>
            m.id === scriptEvent.milestone ? { ...m, completed: true, hour: scriptEvent.hour } : m
          )
        }

        // Apply idea updates — this is how the idea card gets populated and changed
        if (scriptEvent.ideaUpdate) {
          if (newIdea) {
            newIdea = { ...newIdea, ...scriptEvent.ideaUpdate }
          } else {
            newIdea = { ...scriptEvent.ideaUpdate }
          }
        }

        if (scriptEvent.type === 'Breakthrough') {
          newMetrics.feasibility = Math.min(100, newMetrics.feasibility + 8)
          newMetrics.demoReadiness = Math.min(100, newMetrics.demoReadiness + 6)
        } else if (scriptEvent.type === 'Pivot') {
          newMetrics.novelty = Math.min(100, newMetrics.novelty + 10)
          newMetrics.feasibility = Math.max(20, newMetrics.feasibility - 5)
        } else if (scriptEvent.type === 'Shipping') {
          newMetrics.demoReadiness = Math.min(100, newMetrics.demoReadiness + 4)
          newMetrics.feasibility = Math.min(100, newMetrics.feasibility + 2)
        } else if (scriptEvent.type === 'Risk') {
          newMetrics.feasibility = Math.max(15, newMetrics.feasibility - 6)
        } else if (scriptEvent.type === 'Milestone') {
          newMetrics.marketClarity = Math.min(100, newMetrics.marketClarity + 5)
        }

        nextIndex++
      }

      if (!updated) {
        const newStatus = getTeamStatus(hour)
        if (newStatus !== team.status) {
          return { ...team, status: newStatus }
        }
        return team
      }

      return {
        ...team,
        events: newEvents.slice(0, 50),
        milestones: newMilestones,
        metrics: newMetrics,
        currentIdea: newIdea,
        status: getTeamStatus(hour),
        lastScriptIndex: nextIndex - 1,
      }
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(simHour * 4)])

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(tick, TICK_MS)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, tick])

  const play = useCallback(() => {
    if (finished) return
    setIsPlaying(true)
  }, [finished])
  const pause = useCallback(() => setIsPlaying(false), [])
  const setSimSpeed = useCallback((s: number) => setSpeed(s), [])

  const jumpToHour = useCallback((hour: number) => {
    setSimHour(hour)
    if (hour >= 36) {
      setFinished(true)
      setIsPlaying(false)
    } else {
      setFinished(false)
    }
    // Replay events up to this hour, but preserve milestones that were already completed
    setTeams(prev => prev.map((currentTeam, idx) => {
      const t = TEAMS[idx]
      const newEvents: TeamEvent[] = []
      // Start from current milestones — never uncomplete a milestone
      let newMilestones = currentTeam.milestones.map(m => ({ ...m }))
      let newMetrics: TeamMetrics = { ...t.initialMetrics }
      let newIdea: IdeaUpdate | null = null
      let lastIdx = -1

      for (let i = 0; i < t.script.length; i++) {
        const se = t.script[i]
        if (se.hour > hour) break
        lastIdx = i
        newEvents.push({
          id: `${t.id}-${i}`,
          text: se.text,
          type: se.type,
          hour: se.hour,
        })
        if (se.milestone) {
          newMilestones = newMilestones.map(m =>
            m.id === se.milestone ? { ...m, completed: true, hour: se.hour } : m
          )
        }
        if (se.ideaUpdate) {
          newIdea = Object.assign({}, newIdea ?? {}, se.ideaUpdate) as IdeaUpdate
        }
        if (se.type === 'Breakthrough') {
          newMetrics.feasibility = Math.min(100, newMetrics.feasibility + 8)
          newMetrics.demoReadiness = Math.min(100, newMetrics.demoReadiness + 6)
        } else if (se.type === 'Pivot') {
          newMetrics.novelty = Math.min(100, newMetrics.novelty + 10)
          newMetrics.feasibility = Math.max(20, newMetrics.feasibility - 5)
        } else if (se.type === 'Shipping') {
          newMetrics.demoReadiness = Math.min(100, newMetrics.demoReadiness + 4)
          newMetrics.feasibility = Math.min(100, newMetrics.feasibility + 2)
        } else if (se.type === 'Risk') {
          newMetrics.feasibility = Math.max(15, newMetrics.feasibility - 6)
        } else if (se.type === 'Milestone') {
          newMetrics.marketClarity = Math.min(100, newMetrics.marketClarity + 5)
        }
      }

      newEvents.reverse()

      return {
        ...currentTeam,
        events: newEvents,
        milestones: newMilestones,
        metrics: newMetrics,
        currentIdea: newIdea,
        status: getTeamStatus(hour),
        lastScriptIndex: lastIdx,
      }
    }))
  }, [])

  return {
    simHour,
    isPlaying,
    speed,
    teams,
    finished,
    play,
    pause,
    setSimSpeed,
    jumpToHour,
  }
}
