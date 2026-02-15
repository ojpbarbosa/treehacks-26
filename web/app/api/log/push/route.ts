import { NextRequest } from 'next/server'
import { handlePush } from '../../../../lib/store'

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json()
  handlePush(body)
  return Response.json({ ok: true })
}
