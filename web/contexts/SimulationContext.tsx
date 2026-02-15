'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useSimulation, type UseSimulationReturn } from '../hooks/useSimulation'

const SimulationContext = createContext<UseSimulationReturn | null>(null)

interface SimulationProviderProps {
  children: ReactNode
}

export function SimulationProvider({ children }: SimulationProviderProps) {
  const sim = useSimulation()
  return (
    <SimulationContext.Provider value={sim}>
      {children}
    </SimulationContext.Provider>
  )
}

export function useSimulationContext(): UseSimulationReturn {
  const ctx = useContext(SimulationContext)
  if (!ctx) throw new Error('useSimulationContext must be used within SimulationProvider')
  return ctx
}
