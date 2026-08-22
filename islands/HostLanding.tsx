import { useSignal } from "@preact/signals";
import { IslandMarker } from "../components/IslandMarker.tsx";
import { useIslandRenderCount } from "./useIslandRenderCount.ts";

export default function HostLanding() {
  const renderCount = useIslandRenderCount();
  const loading = useSignal(false);
  const error = useSignal("");

  async function createGame() {
    loading.value = true;
    error.value = "";
    try {
      const response = await fetch("/api/games", { method: "POST" });
      const result = await response.json() as { code?: string; error?: string };
      if (!response.ok || !result.code) {
        throw new Error(result.error ?? "Não foi possível criar a sala.");
      }
      globalThis.location.href = `/host/${result.code}`;
    } catch (cause) {
      error.value = cause instanceof Error
        ? cause.message
        : "Não foi possível criar a sala.";
      loading.value = false;
    }
  }

  return (
    <div class="panel island-surface island-surface-host space-y-6">
      <IslandMarker count={renderCount} name="HostLanding" tone="host" />
      <div>
        <p class="eyebrow">Modo host</p>
        <h1 class="mt-2 text-3xl font-black text-slate-950">
          Crie uma sala e compartilhe o código.
        </h1>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          O quiz de fundamentos da web já está carregado com perguntas de HTML,
          CSS e programação web.
        </p>
      </div>
      {error.value && <p class="error-message">{error.value}</p>}
      <button
        class="button button-primary w-full"
        disabled={loading.value}
        onClick={() => void createGame()}
        type="button"
      >
        {loading.value ? "Criando sala..." : "Criar nova sala"}
      </button>
    </div>
  );
}
