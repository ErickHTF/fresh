type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(code: string, listener: Listener): () => void {
  const gameListeners = listeners.get(code) ?? new Set<Listener>();
  gameListeners.add(listener);
  listeners.set(code, gameListeners);

  return () => {
    gameListeners.delete(listener);
    if (gameListeners.size === 0) listeners.delete(code);
  };
}

export function notify(code: string): void {
  listeners.get(code)?.forEach((listener) => listener());
}
