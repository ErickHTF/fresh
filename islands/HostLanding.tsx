import { useSignal } from "@preact/signals";

export default function HostLanding() {
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
      <div>
        <p class="eyebrow">Modo host</p>
        <h1 class="mt-2 text-3xl font-black text-slate-950">
          Crie uma sala e compartilhe o código.
        </h1>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          Estamos carregando o quiz de fundamentos da web...
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
