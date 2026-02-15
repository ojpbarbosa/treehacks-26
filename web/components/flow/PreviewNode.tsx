'use client'

import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { ExternalLink, Globe, AlertTriangle } from 'lucide-react'

interface PreviewNodeProps {
  data: { url: string }
}

export default function PreviewNode({ data }: PreviewNodeProps) {
  const { url } = data
  const [iframeError, setIframeError] = useState(false)

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
        className="rounded-xl border border-primary/50 bg-bg-dark/90 backdrop-blur-md overflow-hidden min-w-[320px]"
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-border-green/30 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Globe size={10} className="text-primary" />
            <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
              Live Preview
            </span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="nopan nodrag flex items-center gap-1 text-[9px] font-mono text-text-muted hover:text-cream transition-colors cursor-pointer"
          >
            Open <ExternalLink size={8} />
          </a>
        </div>

        {/* Preview area */}
        <div className="w-[320px] h-[200px] bg-bg-dark relative">
          {iframeError ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="nopan nodrag absolute inset-0 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <AlertTriangle size={18} className="text-amber-400/60" />
              <span className="text-[10px] font-mono text-text-muted text-center px-4">
                Preview blocked by site policy
              </span>
              <span className="text-[10px] font-mono text-primary flex items-center gap-1">
                Open in new tab <ExternalLink size={9} />
              </span>
            </a>
          ) : (
            <>
              <iframe
                src={url}
                title="Live preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
                onError={() => setIframeError(true)}
              />
              <div className="absolute inset-0 pointer-events-none border border-primary/10 rounded-b-xl" />
            </>
          )}
        </div>

        {/* URL */}
        <div className="px-3 py-1.5 border-t border-border-green/20">
          <p className="text-[8px] font-mono text-text-muted truncate">{url}</p>
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
