import { useSignal } from "@preact/signals";

export default function HostLanding() {
  const nickname = useSignal("");
  const loading = useSignal(false);
  const error = useSignal("");

  async function createGame(event: SubmitEvent) {
    event.preventDefault();
    loading.value = true;
    error.value = "";
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: nickname.value }),
      });
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
    <form
      class="island island-host"
      onSubmit={createGame}
    >
      <div>
        <p class="eyebrow">Modo host</p>
        <h1 class="mt-2 text-3xl font-black text-slate-950">
          Crie uma sala e compartilhe o código.
        </h1>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          Seu nome aparecerá em destaque para os jogadores.
        </p>
      </div>
      <label class="field-label">
        Seu nome
        <input
          class="field"
          maxlength={24}
          placeholder="Como os jogadores devem te chamar?"
          value={nickname.value}
          onInput={(event) => nickname.value = event.currentTarget.value}
          required
        />
      </label>
      {error.value && <p class="error-message">{error.value}</p>}
      <button
        class="button button-primary w-full"
        disabled={loading.value}
        type="submit"
      >
        {loading.value ? "Criando sala..." : "Criar nova sala"}
      </button>
    </form>
  );
}
