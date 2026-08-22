import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { IslandMarker } from "../components/IslandMarker.tsx";
import type { GameState } from "../shared/types.ts";
import { useGameState } from "./useGameState.ts";
import { useIslandRenderCount } from "./useIslandRenderCount.ts";

interface HostGameProps {
  code: string;
}

export default function HostGame({ code }: HostGameProps) {
  const renderCount = useIslandRenderCount();
  const { state, error } = useGameState(code);
  const actionError = useSignal("");
  const loading = useSignal(false);

  useEffect(() => {
    document.title = `Fresh Quiz | ${code}`;
  }, [code]);

  async function action(
    path: "start" | "next" | "finish" | "restart" | "leave",
  ) {
    loading.value = true;
    actionError.value = "";
    try {
      const response = await fetch(`/api/games/${code}/${path}`, {
        method: "POST",
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(
          result.error ?? "Não foi possível atualizar a partida.",
        );
      }
      if (path === "leave") globalThis.location.href = "/";
    } catch (cause) {
      actionError.value = cause instanceof Error
        ? cause.message
        : "Não foi possível atualizar a partida.";
    } finally {
      loading.value = false;
    }
  }

  function leaveRoom() {
    if (
      confirm("Sair da sala? Você perderá o acesso de host a esta partida.")
    ) {
      void action("leave");
    }
  }

  function finishQuiz() {
    if (confirm("Encerrar o quiz agora e mostrar o resultado final?")) {
      void action("finish");
    }
  }

  function restartQuiz() {
    if (
      confirm(
        "Jogar novamente? O placar e as respostas desta partida serão zerados.",
      )
    ) {
      void action("restart");
    }
  }

  const gameState = state.value;
  const current = gameState?.currentQuestion;
  const actionLabel = gameState?.status === "lobby"
    ? "Começar quiz"
    : gameState?.status === "question"
    ? "Revelar resposta"
    : gameState?.status === "reveal"
    ? gameState.currentQuestionPosition === gameState.totalQuestions
      ? "Ver resultado final"
      : "Próxima pergunta"
    : "Quiz encerrado";

  return (
    <section class="island-surface island-surface-host host-game-island">
      <IslandMarker count={renderCount} name="HostGame" tone="host" />
      <section class="game-header">
        <div>
          <p class="eyebrow">Você conduz em</p>
          <h1 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {code}
          </h1>
        </div>
        <div class="header-actions">
          <span class="score-pill">
            {gameState?.players.length ?? 0} jogadores
          </span>
          <button class="button button-ghost" onClick={leaveRoom} type="button">
            Sair da sala
          </button>
        </div>
      </section>

      {(error.value || actionError.value) && (
        <p class="error-message mb-5">{error.value || actionError.value}</p>
      )}

      <section class="panel space-y-6">
        {!gameState && <LoadingState />}
        {gameState?.status === "lobby" && (
          <div class="empty-state min-h-[22rem]">
            <span class="empty-icon">01</span>
            <h2>Aguardando jogadores</h2>
            <p>
              Compartilhe o código da sala e comece quando todos estiverem
              prontos.
            </p>
          </div>
        )}
        {gameState && current && gameState.status !== "lobby" && (
          <div class="space-y-6">
            <div class="flex items-center justify-between gap-4">
              <p class="eyebrow">
                Pergunta {gameState.currentQuestionPosition} de{" "}
                {gameState.totalQuestions}
              </p>
              <span class={`status status-${gameState.status}`}>
                {statusLabel(gameState.status)}
              </span>
            </div>
            <h2 class="text-3xl font-black leading-tight text-slate-950">
              {current.prompt}
            </h2>
            <div class="choice-grid">
              {current.choices.map((choice) => (
                <div
                  class={`choice-card ${
                    current.correctChoiceId === choice.id
                      ? "choice-correct"
                      : ""
                  }`}
                  key={choice.id}
                >
                  <span class="choice-index">{choice.position}</span>
                  <span>{choice.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {gameState?.status === "finished" && (
          <>
            <div class="empty-state min-h-[22rem]">
              <span class="empty-icon">OK</span>
              <h2>Quiz encerrado</h2>
              <p>Confira o ranking final na island ao lado.</p>
            </div>
            <button
              class="button button-primary w-full"
              disabled={loading.value}
              onClick={restartQuiz}
              type="button"
            >
              {loading.value ? "Reiniciando..." : "Jogar novamente"}
            </button>
          </>
        )}
        {gameState && gameState.status !== "finished" && (
          <div class="actions-row">
            <button
              class="button button-primary flex-1"
              disabled={loading.value ||
                (gameState.status === "lobby" &&
                  gameState.players.length === 0)}
              onClick={() =>
                void action(gameState.status === "lobby" ? "start" : "next")}
              type="button"
            >
              {loading.value ? "Atualizando..." : actionLabel}
            </button>
            {gameState.status !== "lobby" && (
              <button
                class="button button-danger"
                disabled={loading.value}
                onClick={finishQuiz}
                type="button"
              >
                Encerrar quiz
              </button>
            )}
          </div>
        )}
      </section>
    </section>
  );
}

function statusLabel(status: GameState["status"]): string {
  return {
    lobby: "Lobby",
    question: "Valendo",
    reveal: "Resultado",
    finished: "Final",
  }[status];
}

function LoadingState() {
  return (
    <div class="empty-state min-h-[22rem]">
      <span class="loader" />
      <p>Carregando sala...</p>
    </div>
  );
}
