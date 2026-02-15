'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, ArrowRight, Bot, Rocket, BarChart3, Layers } from 'lucide-react'

// ─── Capability cards shown in the right panel ───────────────────

const CAPABILITIES = [
  {
    icon: Bot,
    label: 'AI Agent Teams',
    description: 'Simulate smart people, great ideas, and great implementation.',
    color: 'text-primary',
    borderColor: 'border-primary/20',
  },
  {
    icon: Rocket,
    label: 'Idea → Deployment',
    description: 'End-to-end pipeline: ideation, code, deploy, evaluate — fully autonomous.',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-400/20',
  },
  {
    icon: BarChart3,
    label: 'Actionable Insights',
    description: 'AI judges score every build on metrics that matter — not vibes.',
    color: 'text-amber-400',
    borderColor: 'border-amber-400/20',
  },
  {
    icon: Layers,
    label: 'Simulate Anything',
    description: 'Hackathons, YC batches, product sprints — without building anything.',
    color: 'text-purple-400',
    borderColor: 'border-purple-400/20',
  },
]

interface LandingPageProps {
  onStart: () => void
  onCreateTask?: () => void
}

export default function LandingPage({ onStart, onCreateTask }: LandingPageProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="min-h-screen relative z-10 flex flex-col lg:flex-row isolate">
      {/* Left side — Typography block */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="lg:w-[45%] relative z-20 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-16 lg:py-0 min-h-[50vh] lg:min-h-screen"
      >
        <div className="max-w-lg">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/5 mb-8"
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="text-[10px] font-mono text-primary/80 uppercase tracking-wider">
              AI Agent Orchestrator
            </span>
          </motion.div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-cream tracking-tight leading-[1.05] mb-4">
            Treemux
          </h1>

          {/* Tagline */}
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed mb-4 max-w-md">
            Simulates AI teams from idea to deployment — generating products, pitches,
            and metrics in a sandbox.
          </p>

          {/* Sub-bullets */}
          <ul className="space-y-2 mb-10">
            {[
              'Simulate smart people, great ideas, and great implementation.',
              'Providing actionable insights on simulation output.',
              'Simulate anything, without building anything.',
            ].map((text, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-start gap-2 text-sm text-text-muted font-mono"
              >
                <span className="text-primary mt-1">—</span>
                {text}
              </motion.li>
            ))}
          </ul>

          {/* Vision callout */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-[11px] text-text-muted/60 font-mono leading-relaxed mb-10 border-l-2 border-primary/20 pl-4"
          >
            Today we simulated TreeHacks. With compute,
            imagine simulating an entire YC batch and iterating over them.
          </motion.p>

          {/* CTA */}
          <motion.button
            onClick={onCreateTask ?? onStart}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-transparent border border-primary text-primary font-semibold text-sm rounded-lg hover:bg-primary hover:text-bg-dark transition-all duration-300 cursor-pointer"
            style={{
              boxShadow: isHovered
                ? '0 0 30px rgba(3,141,57,0.3), 0 0 60px rgba(3,141,57,0.1)'
                : '0 0 15px rgba(3,141,57,0.1)',
            }}
          >
            <Zap size={16} />
            Create Simulation
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </motion.button>

          {/* Footer */}
          <p className="text-[10px] text-text-muted font-mono mt-12">
            Stanford TreeHacks 2026
          </p>
        </div>
      </motion.div>

      {/* Right side — Capability cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="lg:w-[55%] relative z-10 flex items-center justify-center p-8 lg:p-16 min-h-[50vh] lg:min-h-screen"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full">
          {CAPABILITIES.map((cap, i) => (
            <motion.div
              key={cap.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.12 }}
              className={`rounded-xl border ${cap.borderColor} bg-bg-card/50 backdrop-blur-sm p-5 hover:bg-bg-card/80 transition-colors`}
            >
              <cap.icon size={20} className={`${cap.color} mb-3`} />
              <h3 className="text-sm font-semibold text-cream mb-1.5">{cap.label}</h3>
              <p className="text-[11px] text-text-muted leading-relaxed">{cap.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Vignette edges */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-bg-dark/60 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-bg-dark/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-bg-dark/40 to-transparent" />
        </div>
      </motion.div>
    </div>
  )
}
