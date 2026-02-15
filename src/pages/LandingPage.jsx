import { motion } from 'framer-motion'
import { Play, Monitor, Clock, Users } from 'lucide-react'

export default function LandingPage({ onStart }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative z-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center max-w-2xl"
      >
        {/* Logo mark */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-20 h-20 rounded-2xl bg-primary mx-auto mb-8 flex items-center justify-center shadow-[0_0_40px_rgba(3,141,57,0.3)]"
        >
          <span className="text-2xl font-bold text-bg-dark">TH</span>
        </motion.div>

        <h1 className="text-4xl sm:text-5xl font-bold text-cream mb-3 tracking-tight">
          TreeHacks Simulator
        </h1>
        <p className="text-lg text-primary font-mono mb-2">2026 Edition</p>
        <p className="text-text-secondary mb-10 max-w-md mx-auto leading-relaxed">
          Watch 10 teams race through 36 hours of hacking. Real-time milestones, pivots, breakthroughs, and shipping — all from your dashboard.
        </p>

        {/* CTA */}
        <motion.button
          onClick={onStart}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-bg-dark font-semibold text-lg rounded-xl hover:bg-primary/90 transition-colors shadow-[0_0_30px_rgba(3,141,57,0.25)] cursor-pointer"
        >
          <Play size={20} fill="currentColor" />
          Start Hackathon
        </motion.button>
      </motion.div>

      {/* Feature cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-2xl w-full"
      >
        {[
          { icon: Monitor, title: '6-Way Split View', desc: 'Monitor teams simultaneously' },
          { icon: Clock, title: '36 Hour Sim', desc: 'Control speed and jump to key moments' },
          { icon: Users, title: '10 Teams', desc: 'Each with unique ideas and personalities' },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex flex-col items-center text-center p-4 rounded-xl border border-border-green bg-bg-card/50"
          >
            <Icon size={24} className="text-primary mb-2" />
            <h3 className="text-sm font-semibold text-cream mb-1">{title}</h3>
            <p className="text-xs text-text-muted">{desc}</p>
          </div>
        ))}
      </motion.div>

      {/* Footer */}
      <p className="text-xs text-text-muted mt-16 font-mono">
        Built for TreeHacks 2026 — Stanford University
      </p>
    </div>
  )
}
