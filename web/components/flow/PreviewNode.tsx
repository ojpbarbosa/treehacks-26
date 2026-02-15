'use client'

import { useState, useCallback, useEffect } from 'react'
import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { ExternalLink, Globe, Image as ImageIcon } from 'lucide-react'

interface PreviewNodeProps {
  data: { url: string }
}

export default function PreviewNode({ data }: PreviewNodeProps) {
  const { url } = data
  const [imgError, setImgError] = useState(false)
  const [tick, setTick] = useState(0)

  // Refresh screenshot every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setImgError(false)
      setTick(t => t + 1)
    }, 5000)
    return () => clearInterval(interval)
  }, [url])

  const screenshotUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url&cacheBust=${tick}`

  const openUrl = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [url])

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
          <button
            onClick={openUrl}
            className="nopan nodrag nowheel flex items-center gap-1 text-[9px] font-mono text-text-muted hover:text-cream transition-colors cursor-pointer bg-transparent border-none outline-none"
          >
            Open <ExternalLink size={8} />
          </button>
        </div>

        {/* Preview — screenshot thumbnail */}
        <button
          onClick={openUrl}
          className="nopan nodrag nowheel w-[320px] h-[200px] bg-bg-dark relative overflow-hidden cursor-pointer border-none outline-none block"
        >
          {!imgError ? (
            <img
              key={`${url}-${tick}`}
              src={screenshotUrl}
              alt="Site preview"
              className="w-full h-full object-cover object-top"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <ImageIcon size={22} className="text-text-muted/30" />
              <span className="text-[10px] font-mono text-text-muted/50">
                Click to open preview
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-primary/0 hover:bg-primary/5 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
            <span className="text-[10px] font-mono text-primary flex items-center gap-1 bg-bg-dark/80 px-3 py-1.5 rounded-full border border-primary/30">
              Open <ExternalLink size={8} />
            </span>
          </div>
          <div className="absolute inset-0 pointer-events-none border border-primary/10 rounded-b-xl" />
        </button>

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
