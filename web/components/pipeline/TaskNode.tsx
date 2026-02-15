'use client'

import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'

interface TaskNodeProps {
  data: { description: string }
}

export default function TaskNode({ data }: TaskNodeProps) {
  return (
    <div className="relative">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="px-5 py-4 rounded-xl border border-primary bg-bg-dark/90 backdrop-blur-md w-[220px]"
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Zap size={14} className="text-bg-dark" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-cream leading-tight">Task</h2>
            <p className="text-[9px] font-mono text-primary">Input</p>
          </div>
        </div>
        <p className="text-[10px] text-text-secondary leading-relaxed line-clamp-4">
          {data.description}
        </p>
        <div className="flex items-center gap-1.5 mt-3">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[9px] font-mono text-primary/80 uppercase tracking-wider">
            Active
          </span>
        </div>
      </motion.div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-primary !border-primary"
      />
    </div>
  )
}
