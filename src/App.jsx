import { useState } from 'react'
import DotGrid from './components/DotGrid'
import LandingPage from './pages/LandingPage'
import LiveBuildRoom from './pages/LiveBuildRoom'
import JudgesScreen from './pages/JudgesScreen'
import { useSimulation } from './hooks/useSimulation'

function App() {
  const [screen, setScreen] = useState('landing') // 'landing' | 'live' | 'judges'
  const [hasSeenResults, setHasSeenResults] = useState(false)
  const sim = useSimulation()

  const handleStart = () => {
    setScreen('live')
    sim.play()
  }

  const handleRestart = () => {
    window.location.reload()
  }

  const handleBackToReplay = () => {
    setScreen('live')
    sim.pause()
  }

  // Auto-transition to judges only the first time the sim finishes
  if (sim.finished && screen === 'live' && !hasSeenResults) {
    setHasSeenResults(true)
    setTimeout(() => setScreen('judges'), 3000)
  }

  return (
    <>
      <DotGrid />
      {screen === 'landing' && (
        <LandingPage onStart={handleStart} />
      )}
      {screen === 'live' && (
        <LiveBuildRoom sim={sim} onViewResults={sim.finished ? () => setScreen('judges') : null} />
      )}
      {screen === 'judges' && (
        <JudgesScreen teams={sim.teams} onRestart={handleRestart} onBackToReplay={handleBackToReplay} />
      )}
    </>
  )
}

export default App
