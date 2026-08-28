import { useEffect } from "preact/hooks";
import { type Signal, signal } from "@preact/signals";
import type { GameState } from "../shared/types.ts";
import { pushTrace } from "./useRenderTrace.ts";

type ConnectionStatus = "connecting" | "online" | "offline";

interface GameStateStore {
  refs: number;
  source: EventSource | null;
  state: Signal<GameState | null>;
  error: Signal<string>;
  connection: Signal<ConnectionStatus>;
  lastEventAt: Signal<number | null>;
}

const stores = new Map<string, GameStateStore>();

function connect(store: GameStateStore, code: string) {
  const source = new EventSource(`/api/games/${code}/events`);

  function applyState(nextState: GameState) {
    store.state.value = nextState;
    store.lastEventAt.value = Date.now();
  }

  async function loadState() {
    try {
      const response = await fetch(`/api/games/${code}/state`);
      if (!response.ok) {
        throw new Error("Não foi possível carregar a partida.");
      }
      applyState(await response.json() as GameState);
      pushTrace(
        "http",
        `GET /state → estado atualizado (status="${store.state.value?.status}")`,
        store.refs,
      );
    } catch (cause) {
      store.error.value = cause instanceof Error
        ? cause.message
        : "Não foi possível carregar a partida.";
    }
  }

  source.onopen = () => {
    store.connection.value = "online";
    store.error.value = "";
    void loadState();
  };
  source.addEventListener("state", (event) => {
    const nextState = JSON.parse(
      (event as MessageEvent<string>).data,
    ) as GameState;
    applyState(nextState);
    pushTrace(
      "sse",
      `state recebido (status="${nextState.status}") → +1 render por island`,
      store.refs,
    );
  });
  source.onerror = () => {
    store.connection.value = "offline";
    store.error.value = "A conexão foi interrompida. Tentando reconectar...";
  };

  store.source = source;
}

export function useGameState(code: string) {
  let store = stores.get(code);
  if (!store) {
    store = {
      refs: 0,
      source: null,
      state: signal<GameState | null>(null),
      error: signal(""),
      connection: signal<ConnectionStatus>("connecting"),
      lastEventAt: signal<number | null>(null),
    };
    stores.set(code, store);
  }

  const { state, error, connection, lastEventAt } = store;

  useEffect(() => {
    store.refs += 1;
    if (!store.source) connect(store, code);

    return () => {
      store.refs -= 1;
      if (store.refs === 0) {
        store.source?.close();
        store.source = null;
        store.state.value = null;
        store.error.value = "";
        store.connection.value = "connecting";
        store.lastEventAt.value = null;
        stores.delete(code);
      }
    };
  }, [code]);

  return { state, error, connection, lastEventAt };
}
