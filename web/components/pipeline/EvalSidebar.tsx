'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Loader2, Scale, X, ChevronRight } from 'lucide-react'
import type { EvalProgress, EvalResults } from '../../hooks/useTaskStream'

interface EvalSidebarProps {
  open: boolean
  onClose: () => void
  evalProgress: EvalProgress[]
  evalResults: EvalResults | null
  evaluating: boolean
}

export default function EvalSidebar({ open, onClose, evalProgress, evalResults, evaluating }: EvalSidebarProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed right-0 top-0 bottom-0 w-[380px] z-50 border-l border-border-green bg-bg-dark/95 backdrop-blur-xl flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border-green">
            <div className="flex items-center gap-2.5">
              <Scale size={14} className="text-yellow-400" />
              <h2 className="text-sm font-semibold text-cream">Evaluation</h2>
              {evaluating && !evalResults && (
                <Loader2 size={12} className="animate-spin text-yellow-400/60" />
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-text-muted hover:text-cream hover:bg-border-green/10 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Results */}
            {evalResults ? (
              <>
                <div className="space-y-2">
                  <h3 className="text-xs font-mono text-yellow-400 uppercase tracking-wider">Rankings</h3>
                  {evalResults.rankings.map((r, i) => (
                    <motion.div
                      key={r.projectName}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border-green/30 bg-bg-card"
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        i === 0 ? 'bg-yellow-400/20 text-yellow-400' :
                        i === 1 ? 'bg-gray-300/10 text-gray-300' :
                        i === 2 ? 'bg-amber-700/20 text-amber-600' :
                        'bg-border-green/20 text-text-muted'
                      }`}>
                        {i === 0 ? <Trophy size={10} /> : `#${i + 1}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono text-cream truncate">{r.projectName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {Object.entries(r.overallScores).slice(0, 3).map(([judge, score]) => (
                            <span key={judge} className="text-[8px] font-mono text-text-muted">
                              {judge.slice(0, 8)}: {score.toFixed(1)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-primary">{r.compositeScore.toFixed(1)}</div>
                        <div className="text-[8px] font-mono text-text-muted">composite</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Summary */}
                {evalResults.summary && (
                  <div>
                    <h3 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">Summary</h3>
                    <div className="text-[10px] text-text-secondary leading-relaxed whitespace-pre-wrap bg-bg-card rounded-lg p-3 border border-border-green/20">
                      {evalResults.summary}
                    </div>
                  </div>
                )}
              </>
            ) : evalProgress.length === 0 ? (
              <div className="text-center py-8">
                <Scale size={20} className="text-text-muted/30 mx-auto mb-2" />
                <p className="text-[10px] font-mono text-text-muted">
                  {evaluating ? 'Starting evaluation…' : 'Evaluation will begin when all builds complete'}
                </p>
              </div>
            ) : null}

            {/* Progress feed */}
            {evalProgress.length > 0 && (
              <div>
                <h3 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">Progress</h3>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {[...evalProgress].reverse().map((ev, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 py-1"
                    >
                      <ChevronRight size={8} className="text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[9px] font-mono text-cream">{ev.message}</div>
                        {ev.projectName && (
                          <span className="text-[8px] font-mono text-text-muted">{ev.projectName}</span>
                        )}
                        {ev.judgeName && (
                          <span className="text-[8px] font-mono text-text-muted ml-2">{ev.judgeName}</span>
                        )}
                        {ev.score != null && (
                          <span className="text-[8px] font-mono text-primary ml-2">→ {ev.score.toFixed(1)}</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
