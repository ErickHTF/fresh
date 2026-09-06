import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { Countdown } from "../components/Countdown.tsx";
import { shuffleChoices } from "../shared/shuffle.ts";
import { useGameState } from "./useGameState.ts";

interface PlayerGameProps {
  code: string;
  nickname: string;
  orderSeed: string;
}

export default function PlayerGame(
  { code, nickname, orderSeed }: PlayerGameProps,
) {
  const { state, error } = useGameState(code);
  const selected = useSignal("");
  const submitted = useSignal(false);
  const feedback = useSignal("");
  const lastQuestion = useSignal("");
  const timeExpired = useSignal(false);

  useEffect(() => {
    const questionId = state.value?.currentQuestion?.id ?? "";
    if (questionId && questionId !== lastQuestion.value) {
      lastQuestion.value = questionId;
      selected.value = "";
      submitted.value = false;
      feedback.value = "";
      timeExpired.value = false;
    }
  }, [state.value?.currentQuestion?.id]);

  async function answer(choiceId: string) {
    if (
      submitted.value || timeExpired.value || state.value?.status !== "question"
    ) return;
    selected.value = choiceId;
    try {
      const response = await fetch(`/api/games/${code}/answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ choiceId }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Não foi possível enviar a resposta.");
      }
      submitted.value = true;
      feedback.value = "Resposta enviada";
    } catch (cause) {
      feedback.value = cause instanceof Error
        ? cause.message
        : "Não foi possível enviar a resposta.";
      selected.value = "";
    }
  }

  async function leaveRoom() {
    if (confirm("Sair da sala? Você não receberá mais atualizações do quiz.")) {
      await fetch(`/api/games/${code}/leave`, { method: "POST" });
      globalThis.location.href = "/";
    }
  }

  const gameState = state.value;
  const current = gameState?.currentQuestion;
  const choices = current
    ? shuffleChoices(current.choices, `${orderSeed}:${current.id}`)
    : [];
  const player = gameState?.players.find((item) => item.nickname === nickname);

  const answerCounts = current?.answerCounts ?? {};
  const totalAnswers = Object.values(answerCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const showVotes = gameState?.status === "question" && submitted.value &&
    totalAnswers > 0;
  const shareOf = (choiceId: string) => {
    if (totalAnswers === 0) return 0;
    return Math.round(((answerCounts[choiceId] ?? 0) / totalAnswers) * 100);
  };

  return (
    <section class="island island-player">
      <div class="game-header">
        <div>
          <p class="eyebrow">Você está jogando em</p>
          <h1 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {code}
          </h1>
        </div>
        <div class="header-actions">
          <span class="score-pill">{player?.score ?? 0} pts</span>
          <button
            class="button button-ghost"
            onClick={() => void leaveRoom()}
            type="button"
          >
            Sair
          </button>
        </div>
      </div>

      {(error.value || feedback.value) && (
        <p class={error.value ? "error-message" : "success-message"}>
          {error.value || feedback.value}
        </p>
      )}

      {!gameState && <LoadingState />}

      {gameState?.status === "lobby" && (
        <div class="empty-state">
          <span class="empty-icon">02</span>
          <h2>Você entrou!</h2>
          <p>Aguarde o host começar o quiz.</p>
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
            {gameState.status === "question" && (
              <Countdown
                deadlineAt={gameState.deadlineAt}
                onExpired={() => timeExpired.value = true}
              />
            )}
          </div>
          <h2 class="question-title">{current.prompt}</h2>
          <div class="choice-grid">
            {choices.map((choice) => {
              const correct = gameState.status === "reveal" &&
                current.correctChoiceId === choice.id;
              const wrong = gameState.status === "reveal" &&
                selected.value === choice.id && !correct;
              return (
                <button
                  class={`choice-card choice-button ${
                    selected.value === choice.id ? "choice-selected" : ""
                  } ${correct ? "choice-correct" : ""} ${
                    wrong ? "choice-wrong" : ""
                  }`}
                  disabled={submitted.value ||
                    gameState.status !== "question" || timeExpired.value}
                  key={choice.id}
                  onClick={() => void answer(choice.id)}
                  type="button"
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
                </button>
              );
            })}
          </div>
          {gameState.status === "question" && submitted.value && (
            <p class="waiting-note">
              Aguardando os outros jogadores...
            </p>
          )}
        </div>
      )}

      {gameState?.status === "finished" && (
        <div class="empty-state empty-state-compact">
          <span class="empty-icon">🏆</span>
          <h2>Fim de jogo</h2>
          <p>Veja sua posição no ranking ao lado.</p>
        </div>
      )}
    </section>
  );
}

function LoadingState() {
  return (
    <div class="empty-state">
      <span class="loader" />
      <p>Carregando sala...</p>
    </div>
  );
}
