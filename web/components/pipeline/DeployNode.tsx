'use client'

import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { ExternalLink, Globe, AlertTriangle } from 'lucide-react'

interface DeployNodeProps {
  data: { url: string; index: number }
}

export default function DeployNode({ data }: DeployNodeProps) {
  const { url, index } = data
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
        transition={{ delay: index * 0.08 + 0.2 }}
        className="rounded-xl border border-primary/40 bg-bg-dark/90 backdrop-blur-md overflow-hidden w-[280px]"
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-border-green/30 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Globe size={10} className="text-primary" />
            <span className="text-[9px] font-mono text-primary uppercase tracking-wider">
              Live Preview
            </span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="nopan nodrag flex items-center gap-1 text-[8px] font-mono text-text-muted hover:text-cream transition-colors cursor-pointer"
          >
            Open <ExternalLink size={8} />
          </a>
        </div>

        {/* Preview area */}
        <div className="w-[280px] h-[170px] bg-bg-dark relative">
          {iframeError ? (
            /* Fallback when iframe is blocked by X-Frame-Options */
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="nopan nodrag absolute inset-0 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <AlertTriangle size={16} className="text-amber-400/60" />
              <span className="text-[9px] font-mono text-text-muted text-center px-4">
                Preview blocked by site policy
              </span>
              <span className="text-[9px] font-mono text-primary flex items-center gap-1">
                Open in new tab <ExternalLink size={8} />
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
                onLoad={(e) => {
                  // Detect X-Frame-Options block: if the iframe loaded but has no content
                  // we can't reliably detect this cross-origin, so we just show the iframe.
                  // The onError handler catches network-level failures.
                  try {
                    const frame = e.currentTarget
                    // If contentDocument is null (cross-origin), that's expected and fine
                    if (frame.contentDocument === null) return
                  } catch {
                    // Cross-origin access error — expected, iframe is working
                  }
                }}
              />
              <div className="absolute inset-0 pointer-events-none border border-primary/10" />
            </>
          )}
        </div>

        {/* URL */}
        <div className="px-3 py-1.5 border-t border-border-green/20">
          <p className="text-[7px] font-mono text-text-muted truncate">{url}</p>
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
