type Listener = () => Promise<void>;

const connections = new Map<string, Set<Listener>>();

export function subscribe(code: string, listener: Listener): () => void {
  const gameConnections = connections.get(code) ?? new Set<Listener>();
  gameConnections.add(listener);
  connections.set(code, gameConnections);

  return () => {
    gameConnections.delete(listener);
    if (gameConnections.size === 0) connections.delete(code);
  };
}

export async function notify(code: string): Promise<void> {
  const gameConnections = connections.get(code);
  if (!gameConnections || gameConnections.size === 0) return;

  await Promise.all(
    [...gameConnections].map(async (listener) => {
      try {
        await listener();
      } catch {
        // O stream pode ter sido fechado antes do enqueue.
      }
    }),
  );
}
