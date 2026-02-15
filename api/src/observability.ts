/**
 * Observability: WebSocket broadcast for the pipeline UI.
 * All messages use the unified { type, payload } wrapper (WsEvent).
 */

import type { WsEvent } from "./types.ts";
import { log } from "./logger.ts";
import type { BufferSource } from "bun";

type WsLike = { send(data: string | BufferSource): number | void };

const wsClients: Set<WsLike> = new Set();

function broadcast(msg: WsEvent) {
  const payload = JSON.stringify(msg);
  log.obs("broadcast " + msg.type);
  for (const ws of wsClients) {
    try {
      ws.send(payload);
    } catch (e) {
      log.warn("ws send error", e);
    }
  }
}

export function getObservabilityHandlers(_port: number) {
  return {
    wsOpen(ws: WsLike) {
      wsClients.add(ws);
      log.obs("WS client connected, total " + wsClients.size);
    },
    wsClose(ws: WsLike) {
      wsClients.delete(ws);
      log.obs("WS client disconnected, total " + wsClients.size);
    },
    wsMessage(_ws: WsLike, _message: string | Buffer) {},
    broadcast,
  };
}

export type ObservabilityHandlers = ReturnType<typeof getObservabilityHandlers>;
