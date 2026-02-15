'use client'

import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { Megaphone } from 'lucide-react'

interface PitchNodeProps {
  data: { pitch: string; workerProfile?: string; index: number }
}

export default function PitchNode({ data }: PitchNodeProps) {
  const { pitch, workerProfile, index } = data

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
        transition={{ delay: index * 0.08 + 0.3 }}
        className="rounded-xl border border-amber-500/30 bg-amber-900/5 backdrop-blur-md w-[240px] overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-amber-500/15 flex items-center gap-2">
          <Megaphone size={12} className="text-amber-400" />
          <span className="text-[9px] font-mono text-amber-400 uppercase tracking-wider">Pitch</span>
        </div>

        {/* Worker profile */}
        {workerProfile && (
          <div className="px-4 py-2 border-b border-amber-500/10">
            <div className="text-[8px] font-mono text-text-muted uppercase tracking-wider mb-0.5">Worker</div>
            <p className="text-[9px] text-text-secondary leading-relaxed line-clamp-2">{workerProfile}</p>
          </div>
        )}

        {/* Pitch text */}
        <div className="px-4 py-3">
          <p className="text-[10px] text-cream leading-relaxed line-clamp-6">{pitch}</p>
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
