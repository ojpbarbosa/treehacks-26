import { NextRequest } from 'next/server'
import { handleStart } from '../../../../lib/store'

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json()
  handleStart(body)
  return Response.json({ ok: true })
}
