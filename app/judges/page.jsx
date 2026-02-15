'use client'

import { useRouter } from 'next/navigation'
import { useSimulationContext } from '../../contexts/SimulationContext'
import JudgesScreen from '../../components/JudgesScreen'

export default function JudgesPage() {
  const router = useRouter()
  const sim = useSimulationContext()

  const handleRestart = () => {
    window.location.href = '/'
  }

  const handleBackToReplay = () => {
    sim.pause()
    router.push('/live')
  }

  return (
    <JudgesScreen
      teams={sim.teams}
      onRestart={handleRestart}
      onBackToReplay={handleBackToReplay}
    />
  )
}
