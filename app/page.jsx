'use client'

import { useRouter } from 'next/navigation'
import { useSimulationContext } from '../contexts/SimulationContext'
import LandingPage from '../components/LandingPage'

export default function Home() {
  const router = useRouter()
  const sim = useSimulationContext()

  const handleStart = () => {
    sim.play()
    router.push('/live')
  }

  return <LandingPage onStart={handleStart} />
}
