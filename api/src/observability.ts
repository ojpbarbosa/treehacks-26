/**
 * Observability: channel-based WebSocket broadcast for the pipeline UI.
 * Clients connect to /ws?taskId=<id> and only receive events for that task.
 * All messages use the unified { type, payload } wrapper (WsEvent).
 */

import type { WsEvent } from "./types.ts";
import { log } from "./logger.ts";
import type { BufferSource } from "bun";

type WsLike = { send(data: string | BufferSource): number | void };

/** Map of taskId → set of subscribed WS clients */
const channels: Map<string, Set<WsLike>> = new Map();

/** Clients not subscribed to any specific channel (global listeners) */
const globalClients: Set<WsLike> = new Set();

/**
 * Broadcast an event to all clients subscribed to the taskId in the payload,
 * plus all global (unfiltered) clients.
 */
function broadcast(msg: WsEvent) {
  const json = JSON.stringify(msg);
  const taskId = (msg.payload as { taskId?: string }).taskId;

  log.obs("broadcast " + msg.type + (taskId ? " [task:" + taskId + "]" : ""));

  // Send to channel subscribers
  if (taskId) {
    const subs = channels.get(taskId);
    if (subs) {
      for (const ws of subs) {
        try { ws.send(json); } catch (e) { log.warn("ws send error", e); }
      }
    }
  }

  // Always send to global listeners
  for (const ws of globalClients) {
    try { ws.send(json); } catch (e) { log.warn("ws send error", e); }
  }
}

/**
 * Subscribe a WS client to a specific taskId channel.
 * If no taskId is provided, the client becomes a global listener.
 */
function subscribe(ws: WsLike, taskId?: string) {
  if (taskId) {
    let subs = channels.get(taskId);
    if (!subs) {
      subs = new Set();
      channels.set(taskId, subs);
    }
    subs.add(ws);
    log.obs("WS subscribed to task:" + taskId + " (channel size " + subs.size + ")");
  } else {
    globalClients.add(ws);
    log.obs("WS global client connected, total " + globalClients.size);
  }
}

/**
 * Remove a WS client from all channels + global set.
 */
function unsubscribe(ws: WsLike) {
  globalClients.delete(ws);
  for (const [taskId, subs] of channels) {
    subs.delete(ws);
    if (subs.size === 0) channels.delete(taskId);
  }
  log.obs("WS client disconnected");
}

export function getObservabilityHandlers(_port: number) {
  return {
    subscribe,
    unsubscribe,
    broadcast,
    /** @deprecated use subscribe/unsubscribe */
    wsOpen(ws: WsLike) { subscribe(ws); },
    /** @deprecated use subscribe/unsubscribe */
    wsClose(ws: WsLike) { unsubscribe(ws); },
    wsMessage(_ws: WsLike, _message: string | Buffer) {},
  };
}

export type ObservabilityHandlers = ReturnType<typeof getObservabilityHandlers>;
