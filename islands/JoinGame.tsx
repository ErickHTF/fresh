import { useSignal } from "@preact/signals";
import { IslandMarker } from "../components/IslandMarker.tsx";
import { useIslandRenderCount } from "./useIslandRenderCount.ts";

interface JoinGameProps {
  initialCode?: string;
}

interface JoinResponse {
  error?: string;
  code?: string;
}

export default function JoinGame({ initialCode = "" }: JoinGameProps) {
  const renderCount = useIslandRenderCount();
  const code = useSignal(initialCode.toUpperCase());
  const nickname = useSignal("");
  const error = useSignal("");
  const loading = useSignal(false);

  async function join(event: SubmitEvent) {
    event.preventDefault();
    loading.value = true;
    error.value = "";

    try {
      const response = await fetch(
        `/api/games/${code.value.trim().toUpperCase()}/join`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nickname: nickname.value }),
        },
      );
      const result = await response.json() as JoinResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Não foi possível entrar.");
      }
      globalThis.location.href = `/play/${result.code}`;
    } catch (cause) {
      error.value = cause instanceof Error
        ? cause.message
        : "Não foi possível entrar.";
    } finally {
      loading.value = false;
    }
  }

  return (
    <form
      class="panel island-surface island-surface-join space-y-5"
      onSubmit={join}
    >
      <IslandMarker count={renderCount} name="JoinGame" tone="join" />
      <div>
        <p class="eyebrow">Entrar em uma partida</p>
        <h2 class="mt-2 text-2xl font-black text-slate-950">
          Pronto para jogar?
        </h2>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          Use o código compartilhado pelo host e escolha um apelido.
        </p>
      </div>
      <label class="field-label">
        Código da sala
        <input
          class="field uppercase"
          maxlength={6}
          placeholder="ABC123"
          value={code.value}
          onInput={(event) =>
            code.value = event.currentTarget.value.toUpperCase()}
          required
        />
      </label>
      <label class="field-label">
        Seu apelido
        <input
          class="field"
          maxlength={24}
          placeholder="Como devemos chamar você?"
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
        {loading.value ? "Entrando..." : "Entrar na sala"}
      </button>
    </form>
  );
}
