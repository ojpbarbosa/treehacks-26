'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Sparkles, Plus, Minus, ChevronDown, ChevronUp,
  Loader2, AlertCircle, Zap, RotateCcw, Scale,
} from 'lucide-react'
import { useTaskStream, type TaskInput } from '../../hooks/useTaskStream'
import PipelineFlow from '../../components/pipeline/PipelineFlow'
import EvalSidebar from '../../components/pipeline/EvalSidebar'

// ─── TreeHacks prefill ──────────────────────────────────────────

const TREEHACKS_PREFILL: TaskInput = {
  taskDescription:
    `You are participating in TreeHacks 2026, Stanford's flagship hackathon. Build an innovative, production-ready web app that could win prizes. The app must be creative, technically impressive, and solve a real problem. API keys for Anthropic, OpenAI, and OpenRouter are available in the environment. Deploy to Vercel and make it demo-ready. Focus on: novelty, feasibility, demo readiness, and market clarity.`,
  workers: 2,
  workerDescriptions: [
    'Full-stack engineer who excels at building polished UIs with React/Next.js and integrating AI APIs.',
    'Backend-focused engineer comfortable with data pipelines, real-time features, and infrastructure.',
  ],
  evaluator: {
    count: 1,
    role: 'TreeHacks judge',
    criteria: 'novelty, feasibility, demo readiness, market clarity',
  },
}

// ─── Phase labels ───────────────────────────────────────────────

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  idle: { label: 'Ready', color: 'text-text-muted' },
  creating: { label: 'Connecting…', color: 'text-amber-400' },
  ideation: { label: 'Ideation', color: 'text-cyan-400' },
  building: { label: 'Building', color: 'text-primary' },
  done: { label: 'Complete', color: 'text-emerald-400' },
  evaluating: { label: 'Evaluating', color: 'text-yellow-400' },
  error: { label: 'Error', color: 'text-red-400' },
}

// ─── Page ───────────────────────────────────────────────────────

export default function CreatePage() {
  const stream = useTaskStream()
  const { phase, taskId, error, createTask, reset } = stream

  const [taskDescription, setTaskDescription] = useState('')
  const [workers, setWorkers] = useState(2)
  const [workerDescs, setWorkerDescs] = useState<string[]>(['', ''])
  const [evalRole, setEvalRole] = useState('')
  const [evalCriteria, setEvalCriteria] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [submittedEvaluator, setSubmittedEvaluator] = useState<TaskInput['evaluator']>(undefined)
  const [submittedWorkerCount, setSubmittedWorkerCount] = useState(0)
  const [evalSidebarOpen, setEvalSidebarOpen] = useState(false)

  const isFormPhase = phase === 'idle' || phase === 'error'
  const isPipeline = !isFormPhase

  // Auto-open sidebar when evaluating starts or results arrive
  useEffect(() => {
    if ((phase === 'evaluating' || stream.evalResults) && !evalSidebarOpen) {
      setEvalSidebarOpen(true)
    }
  }, [phase, stream.evalResults])

  function prefillTreeHacks() {
    setTaskDescription(TREEHACKS_PREFILL.taskDescription)
    setWorkers(TREEHACKS_PREFILL.workers)
    setWorkerDescs([...TREEHACKS_PREFILL.workerDescriptions])
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
    const evaluator = (evalRole || evalCriteria)
      ? { count: 1, role: evalRole || 'judge', criteria: evalCriteria || 'quality' }
      : undefined

    const input: TaskInput = {
      taskDescription,
      workers,
      workerDescriptions: workerDescs,
      evaluator,
    }
    setSubmittedEvaluator(evaluator)
    setSubmittedWorkerCount(workers)
    await createTask(input)
  }

  function handleReset() {
    reset()
    setTaskDescription('')
    setWorkers(2)
    setWorkerDescs(['', ''])
    setEvalRole('')
    setEvalCriteria('')
    setSubmittedEvaluator(undefined)
    setSubmittedWorkerCount(0)
    setEvalSidebarOpen(false)
  }

  return (
    <div className="h-screen flex flex-col relative z-10">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border-green bg-bg-dark/90 backdrop-blur-md z-30">
        <div className="flex items-center justify-between px-6 py-2.5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Zap size={12} className="text-bg-dark" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-cream leading-tight">Treemux</h1>
              <p className="text-[9px] text-text-muted font-mono">
                {isFormPhase ? 'Create Task' : 'Pipeline'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Phase badge */}
            <div className="flex items-center gap-1.5">
              {(phase === 'creating' || phase === 'building' || phase === 'evaluating') && (
                <Loader2 size={10} className="animate-spin text-primary" />
              )}
              <span className={`text-[10px] font-mono ${PHASE_LABELS[phase]?.color ?? 'text-text-muted'}`}>
                {PHASE_LABELS[phase]?.label ?? phase}
              </span>
            </div>

            {taskId && (
              <span className="text-[8px] font-mono text-text-muted bg-bg-card px-2 py-0.5 rounded border border-border-green/30">
                {taskId.slice(0, 12)}
              </span>
            )}

            {/* Eval sidebar toggle */}
            {isPipeline && (phase === 'done' || phase === 'evaluating' || stream.evalProgress.length > 0) && (
              <button
                onClick={() => setEvalSidebarOpen(!evalSidebarOpen)}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  evalSidebarOpen ? 'text-yellow-400 bg-yellow-400/10' : 'text-text-muted hover:text-cream hover:bg-border-green/10'
                }`}
                title="Evaluation"
              >
                <Scale size={12} />
              </button>
            )}

            {isPipeline && (
              <button
                onClick={handleReset}
                className="p-1.5 rounded-md text-text-muted hover:text-cream hover:bg-border-green/10 transition-colors cursor-pointer"
                title="Reset"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* ── FORM ─────────────────────────────────────────── */}
          {isFormPhase && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full overflow-y-auto"
            >
              <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
                {/* Error banner */}
                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle size={14} className="text-red-400 shrink-0" />
                    <span className="text-xs font-mono text-red-400">{error}</span>
                  </div>
                )}

                {/* Prefill */}
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

                {/* Evaluator */}
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
              </div>
            </motion.div>
          )}

          {/* ── PIPELINE (React Flow) ────────────────────────── */}
          {isPipeline && (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full pipeline-canvas"
            >
              <PipelineFlow
                phase={phase}
                taskDescription={stream.taskDescription}
                ideas={stream.ideas}
                jobs={stream.jobs}
                workerDescriptions={stream.workerDescriptions}
                allDonePayload={stream.allDonePayload}
                workerCount={submittedWorkerCount}
                evaluator={submittedEvaluator ?? null}
                evalProgress={stream.evalProgress}
                evalResults={stream.evalResults}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Eval Sidebar ────────────────────────────────────── */}
      <EvalSidebar
        open={evalSidebarOpen}
        onClose={() => setEvalSidebarOpen(false)}
        evalProgress={stream.evalProgress}
        evalResults={stream.evalResults}
        evaluating={phase === 'evaluating'}
      />
    </div>
  )
}
