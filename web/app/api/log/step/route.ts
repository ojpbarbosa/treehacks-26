import { NextRequest } from 'next/server'
import { handleStep } from '../../../../lib/store'

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json()
  handleStep(body)
  return Response.json({ ok: true })
}
