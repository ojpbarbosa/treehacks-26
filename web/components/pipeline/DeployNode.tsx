'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { ExternalLink, Globe, Image as ImageIcon, RefreshCw } from 'lucide-react'

interface DeployNodeProps {
  data: { url: string; index: number }
}

export default function DeployNode({ data }: DeployNodeProps) {
  const { url, index } = data
  const [imgError, setImgError] = useState(false)
  const [tick, setTick] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)

  // Refresh screenshot every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setImgError(false)
      setTick(t => t + 1)
    }, 5000)
    return () => clearInterval(interval)
  }, [url])

  // Screenshot thumbnail via microlink with cache-busting
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
            <motion.div
              key={tick}
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <RefreshCw size={7} className="text-primary/40" />
            </motion.div>
          </div>
          <button
            onClick={openUrl}
            className="nopan nodrag nowheel flex items-center gap-1 text-[8px] font-mono text-text-muted hover:text-cream transition-colors cursor-pointer bg-transparent border-none outline-none"
          >
            Open <ExternalLink size={8} />
          </button>
        </div>

        {/* Preview — screenshot thumbnail, entire area is clickable */}
        <button
          onClick={openUrl}
          className="nopan nodrag nowheel w-[280px] h-[170px] bg-bg-dark relative overflow-hidden cursor-pointer border-none outline-none block"
        >
          {!imgError ? (
            <img
              ref={imgRef}
              key={`${url}-${tick}`}
              src={screenshotUrl}
              alt="Site preview"
              className="w-full h-full object-cover object-top"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <ImageIcon size={20} className="text-text-muted/30" />
              <span className="text-[9px] font-mono text-text-muted/50">
                Click to open preview
              </span>
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-primary/0 hover:bg-primary/5 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
            <span className="text-[9px] font-mono text-primary flex items-center gap-1 bg-bg-dark/80 px-3 py-1.5 rounded-full border border-primary/30">
              Open <ExternalLink size={8} />
            </span>
          </div>
          <div className="absolute inset-0 pointer-events-none border border-primary/10" />
        </button>

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
