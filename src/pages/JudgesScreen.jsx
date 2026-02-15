import { motion } from 'framer-motion'
import { Trophy, Award, Star, BarChart3 } from 'lucide-react'
import { calculateFinalScores } from '../data/teams'

const AWARD_ICONS = [Trophy, Award, Star]
const AWARD_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600']
const AWARD_LABELS = ['1st Place', '2nd Place', '3rd Place']

const CRITERIA = [
  { key: 'novelty', label: 'Novelty', weight: '30%' },
  { key: 'feasibility', label: 'Feasibility', weight: '25%' },
  { key: 'demoReadiness', label: 'Demo Readiness', weight: '25%' },
  { key: 'marketClarity', label: 'Market Clarity', weight: '20%' },
]

export default function JudgesScreen({ teams, onRestart, onBackToReplay }) {
  const ranked = calculateFinalScores(teams)
  const topThree = ranked.slice(0, 3)
  const rest = ranked.slice(3, 6)

  return (
    <div className="min-h-screen relative z-10 flex flex-col">
      {/* Header */}
      <div className="text-center pt-12 pb-8 px-6">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
        >
          <Trophy size={48} className="text-yellow-400 mx-auto mb-4" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl sm:text-4xl font-bold text-cream mb-2"
        >
          Judging Complete
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-text-secondary font-mono text-sm"
        >
          36 hours of hacking. Here are the results.
        </motion.p>
      </div>

      {/* Podium — top 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto px-6 mb-12 w-full">
        {topThree.map((team, i) => {
          const Icon = AWARD_ICONS[i]
          return (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.2 }}
              className={`relative p-6 border-t-2 ${
                i === 0 ? 'border-yellow-400 sm:order-2' :
                i === 1 ? 'border-gray-400 sm:order-1' :
                'border-amber-600 sm:order-3'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon size={20} className={AWARD_COLORS[i]} />
                <span className={`text-xs font-mono uppercase tracking-wider ${AWARD_COLORS[i]}`}>
                  {AWARD_LABELS[i]}
                </span>
              </div>
              <h3 className="text-lg font-bold text-cream mb-1">{team.name}</h3>
              <p className="text-sm text-text-secondary mb-1">{team.currentIdea?.title || team.name}</p>
              <p className="text-xs text-text-muted mb-4">{team.currentIdea?.pitch || ''}</p>

              {/* Score */}
              <div className="flex items-end gap-2 mb-4">
                <span className="text-3xl font-bold font-mono text-cream">{team.finalScore}</span>
                <span className="text-xs text-text-muted mb-1">/100</span>
              </div>

              {/* Score breakdown */}
              <div className="space-y-1.5">
                {CRITERIA.map(c => (
                  <div key={c.key} className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-text-muted w-14 shrink-0">{c.label}</span>
                    <div className="flex-1 h-1 bg-primary-dark/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary/60 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${team.breakdown[c.key]}%` }}
                        transition={{ delay: 1 + i * 0.2, duration: 0.6 }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-text-secondary w-6 text-right">{team.breakdown[c.key]}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Remaining teams */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="max-w-3xl mx-auto px-6 mb-12 w-full"
      >
        <h2 className="text-sm font-mono text-text-muted uppercase tracking-wider mb-4">All Participants</h2>
        <div className="space-y-0">
          {rest.map((team, i) => (
            <div
              key={team.id}
              className="flex items-center gap-4 py-3 border-b border-border-green/30"
            >
              <span className="text-sm font-mono text-text-muted w-6">{i + 4}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-cream">{team.name}</span>
                  <span className="text-xs text-text-muted">—</span>
                  <span className="text-xs text-text-secondary truncate">{team.currentIdea?.title || team.name}</span>
                </div>
              </div>
              <span className="text-lg font-mono font-bold text-text-secondary">{team.finalScore}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Judging criteria legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="max-w-3xl mx-auto px-6 mb-8 w-full"
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-text-muted" />
          <h2 className="text-sm font-mono text-text-muted uppercase tracking-wider">Scoring Criteria</h2>
        </div>
        <div className="flex flex-wrap gap-4">
          {CRITERIA.map(c => (
            <div key={c.key} className="flex items-center gap-1.5">
              <span className="text-xs text-text-secondary">{c.label}</span>
              <span className="text-[10px] font-mono text-text-muted">({c.weight})</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="flex items-center justify-center gap-4 pb-12"
      >
        <button
          onClick={onBackToReplay}
          className="px-6 py-3 text-sm font-semibold text-cream border border-border-green rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
        >
          Back to Replay
        </button>
        <button
          onClick={onRestart}
          className="px-6 py-3 text-sm font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
        >
          Run Another Simulation
        </button>
      </motion.div>
    </div>
  )
}
