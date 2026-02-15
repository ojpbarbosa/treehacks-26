'use client'

import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface WaitingNodeProps {
  data: { label: string; index: number }
}

/** Placeholder node shown before workers start, positioned in the worker column. */
export default function WaitingNode({ data }: WaitingNodeProps) {
  const { label, index } = data

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-border-green !border-border-green"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.1 }}
        className="w-[280px] rounded-xl border border-border-green/30 bg-bg-dark/80 backdrop-blur-md px-4 py-5 flex flex-col items-center gap-2"
      >
        <Loader2 size={14} className="animate-spin text-border-green" />
        <span className="text-[9px] font-mono text-text-muted/60">{label}</span>
      </motion.div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-border-green !border-border-green"
      />
    </div>
  )
}
