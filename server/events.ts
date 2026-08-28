import { logDemo } from "./log.ts";

type Listener = () => Promise<void>;

interface Connection {
  id: number;
  notify: Listener;
}

const connections = new Map<string, Set<Connection>>();

let nextConnectionId = 1;

export function subscribe(code: string, listener: Listener): () => void {
  const id = nextConnectionId++;
  const connection: Connection = { id, notify: listener };
  const gameConnections = connections.get(code) ?? new Set<Connection>();
  gameConnections.add(connection);
  connections.set(code, gameConnections);

  logDemo(
    "SSE",
    `conn#${id} conectada na sala ${code} (total: ${gameConnections.size})`,
  );

  return () => {
    gameConnections.delete(connection);
    if (gameConnections.size === 0) connections.delete(code);
    logDemo("SSE", `conn#${id} desconectada da sala ${code}`);
  };
}

export async function notify(code: string): Promise<void> {
  const gameConnections = connections.get(code);
  if (!gameConnections || gameConnections.size === 0) {
    logDemo("BROADCAST", `notify ${code} → 0 conexões SSE`);
    return;
  }

  const startedAt = performance.now();
  const sent = await Promise.all(
    [...gameConnections].map(async (connection) => {
      const sendStartedAt = performance.now();
      try {
        await connection.notify();
      } catch {
        // O stream pode ter sido fechado antes do enqueue.
      }
      return {
        id: connection.id,
        ms: performance.now() - sendStartedAt,
      };
    }),
  );

  for (const { id, ms } of sent) {
    logDemo("BROADCAST", `conn#${id} recebeu state (${ms.toFixed(1)}ms)`);
  }
  logDemo(
    "BROADCAST",
    `notify ${code} → ${sent.length} conexões em ${
      (performance.now() - startedAt).toFixed(1)
    }ms`,
  );
}
