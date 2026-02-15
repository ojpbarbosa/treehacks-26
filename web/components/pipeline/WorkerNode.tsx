'use client'

import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { Thermometer, AlertTriangle, CheckCircle2, Loader2, GitBranch, XCircle } from 'lucide-react'
import type { Job } from '../../hooks/useTaskStream'

interface WorkerNodeProps {
  data: { job: Job; index: number }
}

export default function WorkerNode({ data }: WorkerNodeProps) {
  const { job, index } = data
  const progress = job.totalSteps > 0 ? (job.currentStep / job.totalSteps) * 100 : 0
  const currentStepName = job.planSteps[job.currentStep] ?? 'Waiting…'
  const isBuilding = job.status === 'building'
  const isDeployed = job.status === 'deployed'
  const isFailed = job.status === 'failed'

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-primary !border-primary"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.08 }}
        className={`rounded-xl border backdrop-blur-md w-[280px] overflow-hidden ${
          isDeployed
            ? 'border-emerald-500/50 bg-emerald-900/10'
            : isFailed
            ? 'border-red-500/40 bg-red-900/10'
            : 'border-border-green bg-bg-dark/90'
        }`}
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-border-green/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-text-muted">
              Worker {index + 1}
            </span>
            {isBuilding && (
              <span className="flex items-center gap-1 text-[9px] font-mono text-primary">
                <Loader2 size={9} className="animate-spin" /> Building
              </span>
            )}
            {isDeployed && (
              <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400">
                <CheckCircle2 size={9} /> Deployed
              </span>
            )}
            {isFailed && (
              <span className="flex items-center gap-1 text-[9px] font-mono text-red-400">
                <XCircle size={9} /> Failed
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <GitBranch size={9} className="text-text-muted shrink-0" />
            <span className="text-[8px] font-mono text-text-muted truncate">{job.branch}</span>
          </div>
        </div>

        {/* Gauges */}
        <div className="px-4 py-2 flex gap-4 border-b border-border-green/10">
          <div className="flex items-center gap-1.5">
            <Thermometer size={10} className="text-amber-400" />
            <span className="text-[10px] font-mono text-text-secondary">{job.temperature}</span>
            <div className="w-10 h-1 bg-primary-dark/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400/60 rounded-full"
                style={{ width: `${job.temperature}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={10} className="text-red-400" />
            <span className="text-[10px] font-mono text-text-secondary">{job.risk}</span>
            <div className="w-10 h-1 bg-primary-dark/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-400/60 rounded-full"
                style={{ width: `${job.risk}%` }}
              />
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="px-4 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-text-muted">
              Step {job.currentStep}/{job.totalSteps || '?'}
            </span>
            <span className="text-[10px] font-mono text-primary">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1 bg-primary-dark/30 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${isFailed ? 'bg-red-400' : 'bg-primary'}`}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Step list */}
        <div className="px-4 pb-2.5 max-h-[120px] overflow-y-auto">
          {job.planSteps.length > 0 ? (
            <div className="space-y-0.5">
              {job.planSteps.map((step, i) => {
                const isDone = job.steps.some(s => s.stepIndex === i)
                const isCurrent = job.currentStep === i && isBuilding
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className={`w-1 h-1 rounded-full shrink-0 ${
                      isDone ? 'bg-primary' : isCurrent ? 'bg-amber-400' : 'bg-border-green/50'
                    }`} />
                    <span className={`text-[8px] font-mono truncate ${
                      isDone ? 'text-primary/60' : isCurrent ? 'text-cream' : 'text-text-muted/60'
                    }`}>
                      {step}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : isBuilding ? (
            <div className="flex items-center gap-1.5 py-1">
              <Loader2 size={9} className="animate-spin text-text-muted" />
              <span className="text-[9px] text-text-muted">{currentStepName}</span>
            </div>
          ) : null}
        </div>

        {/* Errors (compact) */}
        {job.errors.length > 0 && (
          <div className="px-4 pb-2">
            {job.errors.slice(-1).map((err, i) => (
              <div key={i} className="text-[8px] font-mono text-red-400/70 bg-red-500/5 rounded px-2 py-0.5 truncate">
                {err.phase && <span className="text-red-400">[{err.phase}]</span>} {err.error}
              </div>
            ))}
          </div>
        )}
      </motion.div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-primary !border-primary"
      />
    </div>
  )
}
