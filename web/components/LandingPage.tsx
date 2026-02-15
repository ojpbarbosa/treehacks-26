'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, ArrowRight } from 'lucide-react'

// ─── Fake event data for the preview panes ──────────────────────

const PREVIEW_TEAMS = [
  {
    name: 'NeuralBridge',
    status: 'Building MVP',
    statusColor: 'text-primary',
    events: [
      { type: 'Breakthrough', text: 'WebSocket latency under 50ms' },
      { type: 'Shipping', text: 'Auth flow deployed to staging' },
      { type: 'Milestone', text: 'Core API endpoints complete' },
    ],
  },
  {
    name: 'QuantumLeap',
    status: 'Prototyping',
    statusColor: 'text-cyan-400',
    events: [
      { type: 'Pivot', text: 'Switching from B2C to API-first' },
      { type: 'Risk', text: 'Rate limiting on external API' },
    ],
  },
  {
    name: 'EchoFrame',
    status: 'Integrating',
    statusColor: 'text-amber-400',
    events: [
      { type: 'Shipping', text: 'Real-time dashboard live' },
      { type: 'Breakthrough', text: 'Edge caching reduces load 4x' },
      { type: 'Milestone', text: 'User testing round 1 done' },
    ],
  },
  {
    name: 'SynthWave',
    status: 'Ideating',
    statusColor: 'text-blue-400',
    events: [
      { type: 'Milestone', text: 'Problem space validated' },
      { type: 'Risk', text: 'Unclear differentiation from competitors' },
    ],
  },
  {
    name: 'DataForge',
    status: 'Polishing Demo',
    statusColor: 'text-purple-400',
    events: [
      { type: 'Shipping', text: 'Demo video recorded' },
      { type: 'Breakthrough', text: 'ML pipeline accuracy at 94%' },
    ],
  },
  {
    name: 'CloudPulse',
    status: 'Building MVP',
    statusColor: 'text-primary',
    events: [
      { type: 'Shipping', text: 'Landing page deployed' },
      { type: 'Risk', text: 'Third-party SDK breaking changes' },
      { type: 'Milestone', text: 'Database schema finalized' },
    ],
  },
]

const TYPE_COLORS: Record<string, string> = {
  Pivot: 'bg-amber-500/20 text-amber-400/80 border-amber-500/20',
  Breakthrough: 'bg-emerald-500/20 text-emerald-400/80 border-emerald-500/20',
  Risk: 'bg-red-500/20 text-red-400/80 border-red-500/20',
  Milestone: 'bg-blue-500/20 text-blue-400/80 border-blue-500/20',
  Shipping: 'bg-purple-500/20 text-purple-400/80 border-purple-500/20',
}

interface PreviewTeam {
  name: string
  status: string
  statusColor: string
  events: { type: string; text: string }[]
}

interface PreviewPaneProps {
  team: PreviewTeam
  col: number
  row: number
}

function PreviewPane({ team, col, row }: PreviewPaneProps) {
  const borders = [
    row === 0 ? 'border-b border-border-green/25' : '',
    col < 2 ? 'border-r border-border-green/25' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`overflow-hidden p-3 ${borders}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-cream/50">{team.name}</span>
        <span className={`text-[8px] font-mono uppercase tracking-wider ${team.statusColor} opacity-60`}>
          {team.status}
        </span>
      </div>

      {/* Fake events */}
      <div className="space-y-1.5">
        {team.events.map((event, j) => (
          <div key={j} className="flex items-start gap-1.5">
            <span className={`text-[7px] font-mono px-1 py-0.5 rounded border shrink-0 ${TYPE_COLORS[event.type]}`}>
              {event.type}
            </span>
            <span className="text-[9px] text-text-muted/60 leading-tight">{event.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.3 }}
      className="w-full h-full rounded-xl border border-border-green/30 bg-bg-card/40 backdrop-blur-sm overflow-hidden"
    >
      {/* Simulated control bar */}
      <div className="h-8 border-b border-border-green/20 flex items-center px-4 gap-3">
        <div className="w-3 h-3 rounded-full border border-primary/30" />
        <div className="flex-1 h-1 bg-primary/10 rounded-full">
          <div className="w-1/3 h-full bg-primary/25 rounded-full" />
        </div>
        <span className="text-[8px] font-mono text-text-muted/40">12.4h / 36h</span>
      </div>

      {/* 3x2 grid */}
      <div className="grid grid-cols-3 grid-rows-2" style={{ height: 'calc(100% - 2rem)' }}>
        {PREVIEW_TEAMS.map((team, i) => (
          <PreviewPane key={team.name} team={team} col={i % 3} row={Math.floor(i / 3)} />
        ))}
      </div>
    </motion.div>
  )
}

// ─── Landing Page ────────────────────────────────────────────────

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
        className="lg:w-[35%] relative z-20 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-16 lg:py-0 min-h-[50vh] lg:min-h-screen"
      >
        <div className="max-w-md">
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
            Simulate AI teams from idea to deployment. Gnerate products, pitches,
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

      {/* Right side — Dashboard preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="lg:w-[65%] relative z-10 flex items-center justify-center p-8 lg:p-12 min-h-[50vh] lg:min-h-screen"
      >
        <div className="w-full max-w-3xl h-[380px] lg:h-[440px]">
          <DashboardPreview />
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
