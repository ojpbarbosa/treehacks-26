'use client'

import { useRouter } from 'next/navigation'
import LandingPage from '../components/LandingPage'

export default function Home() {
  const router = useRouter()

  return (
    <LandingPage
      onStart={() => router.push('/create')}
      onCreateTask={() => router.push('/create')}
    />
  )
}
