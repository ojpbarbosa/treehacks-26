'use client'

import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { User } from 'lucide-react'

interface ProfileNodeProps {
  data: { workerProfile: string; index: number }
}

export default function ProfileNode({ data }: ProfileNodeProps) {
  const { workerProfile, index } = data

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
        transition={{ delay: index * 0.08 + 0.1 }}
        className="rounded-xl border border-cyan-500/30 bg-bg-dark/90 backdrop-blur-md w-[220px] overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-cyan-500/15 flex items-center gap-2">
          <User size={12} className="text-cyan-400" />
          <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider">
            Worker Profile
          </span>
        </div>

        {/* Profile text */}
        <div className="px-4 py-3">
          <p className="text-[10px] text-cream leading-relaxed line-clamp-5">{workerProfile}</p>
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
