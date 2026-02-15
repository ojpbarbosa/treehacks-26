'use client'

import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { Trophy, Loader2, Scale } from 'lucide-react'
import type { EvaluatorSpec, DeploymentResult } from '../../hooks/useTaskStream'

interface JudgeNodeProps {
  data: {
    evaluator: EvaluatorSpec | null
    builds: DeploymentResult[]
    done: boolean
    evaluating?: boolean
    deployedCount: number
    totalJobs: number
  }
}

export default function JudgeNode({ data }: JudgeNodeProps) {
  const { evaluator, builds, done, evaluating, deployedCount, totalJobs } = data
  const allReady = totalJobs > 0 && deployedCount === totalJobs

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-primary !border-primary"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className={`px-5 py-4 rounded-xl border backdrop-blur-md w-[220px] ${
          done
            ? 'border-yellow-400/50 bg-yellow-400/5'
            : evaluating || allReady
            ? 'border-yellow-400/30 bg-yellow-400/3'
            : 'border-border-green/40 bg-bg-dark/90'
        }`}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <motion.div
            animate={done ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: done ? Infinity : 0, repeatDelay: 2 }}
          >
            {done ? (
              <Trophy size={20} className="text-yellow-400" />
            ) : (
              <Scale size={20} className={allReady ? 'text-yellow-400/70' : 'text-text-muted/50'} />
            )}
          </motion.div>
          <div>
            <h3 className="text-xs font-bold text-cream">
              {evaluator?.role ?? 'Evaluator'}
            </h3>
            <p className="text-[9px] font-mono text-text-muted">
              {deployedCount}/{totalJobs} ready
            </p>
          </div>
        </div>

        {evaluator?.criteria && (
          <p className="text-[9px] text-text-secondary leading-relaxed mb-3">
            {evaluator.criteria}
          </p>
        )}

        {done && !evaluating ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <span className="text-[9px] font-mono text-yellow-400 uppercase tracking-wider">
                Judged
              </span>
            </div>
            {builds.map((b, i) => (
              <div key={i} className="text-[8px] font-mono text-text-muted truncate">
                {b.idea.slice(0, 50)}…
              </div>
            ))}
          </div>
        ) : evaluating || allReady ? (
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 size={10} className="text-yellow-400/60" />
            </motion.div>
            <span className="text-[9px] font-mono text-yellow-400/60 uppercase tracking-wider">
              Evaluating…
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono text-text-muted/50 uppercase tracking-wider">
              Waiting for builds…
            </span>
          </div>
        )}
      </motion.div>
    </div>
  )
}
