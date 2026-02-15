import { NextRequest } from 'next/server'
import { handleDeployment } from '../../../../lib/store'

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json()
  handleDeployment(body)
  return Response.json({ ok: true })
}
