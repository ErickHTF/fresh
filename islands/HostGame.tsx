import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { Countdown } from "../components/Countdown.tsx";
import type { GameState } from "../shared/types.ts";
import { useGameState } from "./useGameState.ts";

interface HostGameProps {
  code: string;
}

export default function HostGame({ code }: HostGameProps) {
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

  const answerCounts = current?.answerCounts ?? {};
  const totalAnswers = Object.values(answerCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const shareOf = (choiceId: string) => {
    if (totalAnswers === 0) return 0;
    return Math.round(((answerCounts[choiceId] ?? 0) / totalAnswers) * 100);
  };
  const showVotes = Boolean(current?.answerCounts);

  const actionLabel = gameState?.status === "lobby"
    ? "Começar quiz"
    : gameState?.status === "reveal"
    ? gameState.currentQuestionPosition === gameState.totalQuestions
      ? "Ver resultado final"
      : "Próxima pergunta"
    : "";

  return (
    <section class="island island-host">
      <div class="game-header">
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
      </div>

      {(error.value || actionError.value) && (
        <p class="error-message">{error.value || actionError.value}</p>
      )}

      {!gameState && <LoadingState />}

      {gameState?.status === "lobby" && (
        <div class="empty-state">
          <span class="empty-icon">01</span>
          <h2>Aguardando jogadores</h2>
          <p>
            Compartilhe o código da sala e comece quando todos estiverem
            prontos.
          </p>
        </div>
      )}

      {gameState && current && gameState.status !== "lobby" &&
        gameState.status !== "finished" && (
        <div class="question-view">
          <div class="question-meta">
            <p class="eyebrow">
              Pergunta {gameState.currentQuestionPosition} de{" "}
              {gameState.totalQuestions}
            </p>
            <div class="question-meta-actions">
              <span class={`status status-${gameState.status}`}>
                {statusLabel(gameState.status)}
              </span>
              {gameState.status === "question" && (
                <Countdown deadlineAt={gameState.deadlineAt} />
              )}
            </div>
          </div>
          <h2 class="question-title">{current.prompt}</h2>
          {showVotes && (
            <div class="votes-summary">
              <span class="eyebrow">
                {gameState.status === "question"
                  ? "Votação ao vivo"
                  : "Votos por alternativa"}
              </span>
              <span class="votes-summary-count">
                {totalAnswers} de {gameState.players.length} responderam
              </span>
            </div>
          )}
          <div class="choice-grid">
            {current.choices.map((choice) => (
              <div
                class={`choice-card ${
                  current.correctChoiceId === choice.id ? "choice-correct" : ""
                }`}
                key={choice.id}
              >
                <span class="choice-index">{choice.position}</span>
                <span class="choice-body">
                  <span>{choice.label}</span>
                  {showVotes && (
                    <span class="vote-track">
                      <span
                        class="vote-fill"
                        style={{ width: `${shareOf(choice.id)}%` }}
                      />
                    </span>
                  )}
                </span>
                {showVotes && (
                  <span class="vote-pct">{shareOf(choice.id)}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {gameState?.status === "finished" && (
        <>
          <div class="empty-state">
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
          {gameState.status === "question"
            ? (
              <p class="question-hint">
                As respostas serão reveladas automaticamente quando o tempo
                acabar.
              </p>
            )
            : (
              <button
                class="button button-primary flex-1"
                disabled={loading.value ||
                  (gameState.status === "lobby" &&
                    gameState.players.length === 0)}
                onClick={() =>
                  void action(
                    gameState.status === "lobby" ? "start" : "next",
                  )}
                type="button"
              >
                {loading.value ? "Atualizando..." : actionLabel}
              </button>
            )}
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
    <div class="empty-state">
      <span class="loader" />
      <p>Carregando sala...</p>
    </div>
  );
}
