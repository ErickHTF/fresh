import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import type { GameState } from "../shared/types.ts";

export function useGameState(code: string) {
  const state = useSignal<GameState | null>(null);
  const error = useSignal("");
  const connection = useSignal<"connecting" | "online" | "offline">(
    "connecting",
  );
  const lastEventAt = useSignal<number | null>(null);

  useEffect(() => {
    const source = new EventSource(`/api/games/${code}/events`);

    function applyState(nextState: GameState) {
      state.value = nextState;
      lastEventAt.value = Date.now();
    }

    async function loadState() {
      try {
        const response = await fetch(`/api/games/${code}/state`);
        if (!response.ok) {
          throw new Error("Não foi possível carregar a partida.");
        }
        applyState(await response.json() as GameState);
      } catch (cause) {
        error.value = cause instanceof Error
          ? cause.message
          : "Não foi possível carregar a partida.";
      }
    }

    source.onopen = () => {
      connection.value = "online";
      error.value = "";
      void loadState();
    };
    source.addEventListener("state", (event) => {
      applyState(JSON.parse(
        (event as MessageEvent<string>).data,
      ) as GameState);
    });
    source.onerror = () => {
      connection.value = "offline";
      error.value = "A conexão foi interrompida. Tentando reconectar...";
    };

    return () => source.close();
  }, [code]);

  return { state, error, connection, lastEventAt };
}
