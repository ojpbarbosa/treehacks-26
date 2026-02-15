'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Sparkles, Plus, Minus, ChevronDown, ChevronUp,
  Loader2, CheckCircle2, AlertCircle, Globe, GitBranch,
  Zap, RotateCcw,
} from 'lucide-react'
import { useTaskStream, type TaskInput, type Job } from '../../hooks/useTaskStream'

// ─── TreeHacks prefill ──────────────────────────────────────────

const TREEHACKS_PREFILL: TaskInput = {
  taskDescription:
    `You are participating in TreeHacks 2026, Stanford's flagship hackathon. Build an innovative, production-ready web app that could win prizes. The app must be creative, technically impressive, and solve a real problem. API keys for Anthropic, OpenAI, and OpenRouter are available in the environment. Deploy to Vercel and make it demo-ready. Focus on: novelty, feasibility, demo readiness, and market clarity.`,
  workers: 1,
  workerDescriptions: [
    'Full-stack engineer who excels at building polished UIs with React/Next.js and integrating AI APIs.',
    // 'Backend-focused engineer comfortable with data pipelines, real-time features, and infrastructure.',
  ],
  evaluator: {
    count: 1,
    role: 'TreeHacks judge',
    criteria: 'novelty, feasibility, demo readiness, market clarity',
  },
}

// ─── Phase indicator ────────────────────────────────────────────

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  idle: { label: 'Ready', color: 'text-text-muted' },
  creating: { label: 'Creating task…', color: 'text-amber-400' },
  ideation: { label: 'Ideation complete', color: 'text-cyan-400' },
  building: { label: 'Building', color: 'text-primary' },
  done: { label: 'All done', color: 'text-emerald-400' },
  error: { label: 'Error', color: 'text-red-400' },
}

// ─── Job card ───────────────────────────────────────────────────

function JobCard({ job }: { job: Job }) {
  const [expanded, setExpanded] = useState(false)
  const progress = job.totalSteps > 0 ? (job.currentStep / job.totalSteps) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border-green rounded-xl overflow-hidden bg-bg-card"
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-text-muted">{job.jobId.slice(0, 8)}</span>
            {job.status === 'building' && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-primary">
                <Loader2 size={10} className="animate-spin" /> Building
              </span>
            )}
            {job.status === 'deployed' && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                <CheckCircle2 size={10} /> Deployed
              </span>
            )}
            {job.status === 'failed' && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-red-400">
                <AlertCircle size={10} /> Failed
              </span>
            )}
          </div>
          <p className="text-sm text-cream leading-relaxed line-clamp-2">{job.idea}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-[10px] font-mono text-text-muted">Steps</div>
            <div className="text-sm font-mono text-cream">{job.currentStep}/{job.totalSteps}</div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="p-1 text-text-muted hover:text-cream transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border-green/20">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-3 space-y-3 border-t border-border-green/20">
              {/* Meta */}
              <div className="flex gap-4 text-[10px] font-mono text-text-muted">
                <span>Temp: <span className="text-amber-400">{job.temperature}</span></span>
                <span>Risk: <span className="text-red-400">{job.risk}</span></span>
                <span className="flex items-center gap-1">
                  <GitBranch size={9} /> {job.branch}
                </span>
              </div>

              {/* Plan steps */}
              {job.planSteps.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Plan</div>
                  {job.planSteps.map((step, i) => {
                    const isDone = i < job.currentStep
                    const isCurrent = i === job.currentStep && job.status === 'building'
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-mono shrink-0 ${
                          isDone ? 'bg-primary border-primary text-bg-dark' :
                          isCurrent ? 'border-primary text-primary' :
                          'border-border-green text-text-muted'
                        }`}>
                          {isDone ? '✓' : i + 1}
                        </div>
                        <span className={`text-xs ${isDone ? 'text-text-secondary' : isCurrent ? 'text-cream' : 'text-text-muted'}`}>
                          {step}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Deployment URL */}
              {job.deploymentUrl && (
                <a
                  href={job.deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-mono text-primary hover:text-cream transition-colors"
                >
                  <Globe size={11} /> {job.deploymentUrl}
                </a>
              )}

              {/* Errors */}
              {job.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-red-400 uppercase tracking-wider">Errors</div>
                  {job.errors.map((err, i) => (
                    <div key={i} className="text-[10px] font-mono text-red-400/70 bg-red-500/5 rounded px-2 py-1">
                      {err.phase && <span className="text-red-400">[{err.phase}]</span>} {err.error}
                    </div>
                  ))}
                </div>
              )}

              {/* Pitch */}
              {job.pitch && (
                <div>
                  <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">Pitch</div>
                  <p className="text-xs text-text-secondary leading-relaxed">{job.pitch}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Page ───────────────────────────────────────────────────────

export default function CreatePage() {
  const { phase, taskId, ideas, jobs, allDonePayload, error, createTask, reset } = useTaskStream()

  const [taskDescription, setTaskDescription] = useState('')
  const [workers, setWorkers] = useState(2)
  const [workerDescs, setWorkerDescs] = useState<string[]>(['', ''])
  const [evalRole, setEvalRole] = useState('')
  const [evalCriteria, setEvalCriteria] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const isFormPhase = phase === 'idle' || phase === 'error'
  const isStreaming = phase === 'creating' || phase === 'ideation' || phase === 'building'

  function prefillTreeHacks() {
    setTaskDescription(TREEHACKS_PREFILL.taskDescription)
    setWorkers(TREEHACKS_PREFILL.workers)
    setWorkerDescs(TREEHACKS_PREFILL.workerDescriptions)
    setEvalRole(TREEHACKS_PREFILL.evaluator?.role ?? '')
    setEvalCriteria(TREEHACKS_PREFILL.evaluator?.criteria ?? '')
  }

  function handleWorkerCount(n: number) {
    const clamped = Math.max(1, Math.min(8, n))
    setWorkers(clamped)
    setWorkerDescs(prev => {
      if (clamped > prev.length) return [...prev, ...Array(clamped - prev.length).fill('')]
      return prev.slice(0, clamped)
    })
  }

  async function handleSubmit() {
    const input: TaskInput = {
      taskDescription,
      workers,
      workerDescriptions: workerDescs,
    }
    if (evalRole || evalCriteria) {
      input.evaluator = {
        count: 1,
        role: evalRole || 'judge',
        criteria: evalCriteria || 'quality',
      }
    }
    await createTask(input)
  }

  function handleReset() {
    reset()
    setTaskDescription('')
    setWorkers(2)
    setWorkerDescs(['', ''])
    setEvalRole('')
    setEvalCriteria('')
  }

  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border-green bg-bg-dark/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap size={14} className="text-bg-dark" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-cream leading-tight">Treemux</h1>
              <p className="text-[10px] text-text-muted font-mono">Create Task</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Phase badge */}
            <div className="flex items-center gap-1.5">
              {(phase === 'creating' || phase === 'building') && (
                <Loader2 size={10} className="animate-spin text-primary" />
              )}
              <span className={`text-[10px] font-mono ${PHASE_LABELS[phase]?.color ?? 'text-text-muted'}`}>
                {PHASE_LABELS[phase]?.label ?? phase}
              </span>
            </div>

            {/* TaskId */}
            {taskId && (
              <span className="text-[9px] font-mono text-text-muted bg-bg-card px-2 py-0.5 rounded border border-border-green/30">
                {taskId.slice(0, 10)}…
              </span>
            )}

            {/* Reset */}
            {!isFormPhase && (
              <button
                onClick={handleReset}
                className="p-1.5 rounded-md text-text-muted hover:text-cream hover:bg-border-green/10 transition-colors"
                title="Reset"
              >
                <RotateCcw size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {/* ── Form ─────────────────────────────────────────── */}
          {isFormPhase && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Error banner */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <span className="text-xs font-mono text-red-400">{error}</span>
                </div>
              )}

              {/* Prefill button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={prefillTreeHacks}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
                >
                  <Sparkles size={12} />
                  Prefill: TreeHacks 2026
                </button>
              </div>

              {/* Task description */}
              <div>
                <label className="block text-xs font-mono text-text-secondary mb-2 uppercase tracking-wider">
                  Task Description
                </label>
                <textarea
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  rows={5}
                  placeholder="Describe what should be built…"
                  className="w-full bg-bg-card border border-border-green rounded-lg px-4 py-3 text-sm text-cream placeholder:text-text-muted/50 font-mono resize-none focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>

              {/* Workers */}
              <div>
                <label className="block text-xs font-mono text-text-secondary mb-2 uppercase tracking-wider">
                  Workers ({workers})
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => handleWorkerCount(workers - 1)}
                    className="w-8 h-8 rounded-lg border border-border-green flex items-center justify-center text-text-muted hover:text-cream hover:border-primary/40 transition-colors cursor-pointer"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-lg font-mono text-cream w-8 text-center">{workers}</span>
                  <button
                    onClick={() => handleWorkerCount(workers + 1)}
                    className="w-8 h-8 rounded-lg border border-border-green flex items-center justify-center text-text-muted hover:text-cream hover:border-primary/40 transition-colors cursor-pointer"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="space-y-2">
                  {workerDescs.map((desc, i) => (
                    <input
                      key={i}
                      value={desc}
                      onChange={e => {
                        const next = [...workerDescs]
                        next[i] = e.target.value
                        setWorkerDescs(next)
                      }}
                      placeholder={`Worker ${i + 1} profile…`}
                      className="w-full bg-bg-card border border-border-green rounded-lg px-4 py-2.5 text-xs text-cream placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-primary/60 transition-colors"
                    />
                  ))}
                </div>
              </div>

              {/* Advanced: evaluator */}
              <div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                >
                  {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  Evaluator (optional)
                </button>
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 space-y-2">
                        <input
                          value={evalRole}
                          onChange={e => setEvalRole(e.target.value)}
                          placeholder="Evaluator role (e.g. TreeHacks judge)"
                          className="w-full bg-bg-card border border-border-green rounded-lg px-4 py-2.5 text-xs text-cream placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-primary/60 transition-colors"
                        />
                        <input
                          value={evalCriteria}
                          onChange={e => setEvalCriteria(e.target.value)}
                          placeholder="Criteria (e.g. novelty, feasibility, demo readiness)"
                          className="w-full bg-bg-card border border-border-green rounded-lg px-4 py-2.5 text-xs text-cream placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-primary/60 transition-colors"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit */}
              <motion.button
                onClick={handleSubmit}
                disabled={!taskDescription.trim() || workers < 1}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-transparent border border-primary text-primary font-semibold text-sm rounded-lg hover:bg-primary hover:text-bg-dark transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ boxShadow: '0 0 20px rgba(3,141,57,0.15)' }}
              >
                <Play size={14} fill="currentColor" />
                Launch Task
              </motion.button>
            </motion.div>
          )}

          {/* ── Live stream ──────────────────────────────────── */}
          {(isStreaming || phase === 'done') && (
            <motion.div
              key="stream"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Ideas */}
              {ideas.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">
                    Ideas ({ideas.length})
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ideas.map((idea, i) => (
                      <div key={i} className="bg-bg-card border border-border-green/30 rounded-lg px-4 py-3">
                        <p className="text-xs text-cream leading-relaxed line-clamp-3">{idea.idea}</p>
                        <div className="flex gap-3 mt-2 text-[10px] font-mono text-text-muted">
                          <span>Risk: <span className="text-red-400">{idea.risk}</span></span>
                          <span>Temp: <span className="text-amber-400">{idea.temperature}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Jobs */}
              {jobs.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">
                    Builds ({jobs.filter(j => j.status === 'deployed').length}/{jobs.length} deployed)
                  </div>
                  <div className="space-y-3">
                    {jobs.map(job => (
                      <JobCard key={job.jobId} job={job} />
                    ))}
                  </div>
                </div>
              )}

              {/* Waiting indicator */}
              {phase === 'creating' && jobs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-12 h-12 rounded-full border border-border-green flex items-center justify-center mb-4">
                    <Loader2 size={18} className="animate-spin text-primary" />
                  </div>
                  <p className="text-xs text-text-secondary font-mono">Creating task and connecting…</p>
                </div>
              )}

              {/* All done banner */}
              {phase === 'done' && allDonePayload && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="border border-emerald-500/30 rounded-xl bg-emerald-500/5 px-6 py-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">All builds complete</span>
                  </div>
                  {allDonePayload.builds.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 mt-2">
                      <Globe size={11} className="text-primary shrink-0" />
                      <a
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-primary hover:text-cream transition-colors truncate"
                      >
                        {b.url}
                      </a>
                    </div>
                  ))}
                  {allDonePayload.evaluator && (
                    <div className="mt-3 text-[10px] font-mono text-text-muted">
                      Evaluator: {allDonePayload.evaluator.role} — {allDonePayload.evaluator.criteria}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
