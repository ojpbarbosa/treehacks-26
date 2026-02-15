// Server-side in-memory event store + SSE client management
// Works with single-server deployment (next dev / next start)

export interface BaseEvent {
  id: number
  serverTimestamp: number
  type: string
}

export interface StartEvent extends BaseEvent {
  type: 'start'
  [key: string]: unknown
}

export interface StepEvent extends BaseEvent {
  type: 'step'
  [key: string]: unknown
}

export interface PushEvent extends BaseEvent {
  type: 'push'
  [key: string]: unknown
}

export interface DeploymentEvent extends BaseEvent {
  type: 'deployment'
  [key: string]: unknown
}

export type AppEvent = StartEvent | StepEvent | PushEvent | DeploymentEvent

export type ClientCallback = (event: AppEvent) => void

let eventCounter = 0
const eventLog: AppEvent[] = []
const clients: Set<ClientCallback> = new Set()

export function getEventLog(): AppEvent[] {
  return eventLog
}

export function getEventsSince(lastId: number): AppEvent[] {
  return eventLog.filter(e => e.id > lastId)
}

export function addClient(fn: ClientCallback): void {
  clients.add(fn)
}

export function removeClient(fn: ClientCallback): void {
  clients.delete(fn)
}

function broadcast(event: Omit<AppEvent, 'id' | 'serverTimestamp'> & Partial<Pick<AppEvent, 'id' | 'serverTimestamp'>>): void {
  const fullEvent = event as AppEvent
  fullEvent.id = ++eventCounter
  fullEvent.serverTimestamp = Date.now()
  eventLog.push(fullEvent)

  for (const client of clients) {
    try {
      client(fullEvent)
    } catch {
      clients.delete(client)
    }
  }
}

export function handleStart(payload: Record<string, unknown>): void {
  broadcast({ type: 'start', ...payload })
}

export function handleStep(payload: Record<string, unknown>): void {
  broadcast({ type: 'step', ...payload })
}

export function handlePush(payload: Record<string, unknown>): void {
  broadcast({ type: 'push', ...payload })
}

export function handleDeployment(payload: Record<string, unknown>): void {
  broadcast({ type: 'deployment', ...payload })
}
