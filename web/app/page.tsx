'use client'

import { useRouter } from 'next/navigation'
import LandingPage from '../components/LandingPage'

export default function Home() {
  const router = useRouter()

  return (
    <LandingPage
      onStart={() => router.push('/live')}
      onCreateTask={() => router.push('/create')}
    />
  )
}
