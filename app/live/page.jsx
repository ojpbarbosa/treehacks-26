'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSimulationContext } from '../../contexts/SimulationContext'
import LiveBuildRoom from '../../components/LiveBuildRoom'

export default function LivePage() {
  const router = useRouter()
  const sim = useSimulationContext()
  const hasSeenResults = useRef(false)

  useEffect(() => {
    if (sim.finished && !hasSeenResults.current) {
      hasSeenResults.current = true
      setTimeout(() => router.push('/judges'), 3000)
    }
  }, [sim.finished, router])

  const onViewResults = sim.finished ? () => router.push('/judges') : null

  return <LiveBuildRoom sim={sim} onViewResults={onViewResults} />
}
