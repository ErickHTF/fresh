import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { Countdown } from "@/components/Countdown.tsx";
import { LoadingState } from "@/components/LoadingState.tsx";
import { Podium } from "@/components/Podium.tsx";
import { shuffleChoices } from "@/shared/shuffle.ts";
import { totalVotes, voteShare } from "@/shared/votes.ts";
import { useGameState } from "./useGameState.ts";

interface PlayerGameProps {
  code: string;
  playerId: string;
}

export default function PlayerGame({ code, playerId }: PlayerGameProps) {
  const { state, error } = useGameState(code);
  const selected = useSignal("");
  const submitted = useSignal(false);
  const feedback = useSignal("");
  const lastQuestion = useSignal("");
  const timeExpired = useSignal(false);
  const scoreAnimating = useSignal(false);
  const earnedPoints = useSignal(0);
  const floatKey = useSignal(0);
  const prevScoreRef = useRef(0);

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

  useEffect(() => {
    const player = state.value?.players.find((item) => item.id === playerId);
    const currentScore = player?.score ?? 0;
    // O diff precisa ser capturado antes de atualizar o ref, senão qualquer
    // push de estado durante o reveal re-dispara a animação com pontos errados.
    const gained = currentScore - prevScoreRef.current;
    prevScoreRef.current = currentScore;
    if (state.value?.status === "reveal" && gained > 0) {
      earnedPoints.value = gained;
      floatKey.value += 1;
      scoreAnimating.value = true;
      const timer = setTimeout(() => scoreAnimating.value = false, 800);
      return () => clearTimeout(timer);
    }
  }, [state.value?.status, state.value?.players]);

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
    ? shuffleChoices(current.choices, `${playerId || "player"}:${current.id}`)
    : [];
  const player = gameState?.players.find((item) => item.id === playerId);

  const answerCounts = current?.answerCounts;
  const totalAnswers = totalVotes(answerCounts);
  const showVotes = gameState?.status === "question" && submitted.value &&
    totalAnswers > 0;

  return (
    <section class="island island-player">
      <div class="game-header">
        <div>
          <p class="eyebrow">Você está jogando em</p>
          <h1 class="island-title island-title-lg island-title-tight">
            {code}
          </h1>
        </div>
        <div class="header-actions">
          <span
            class={`score-pill ${scoreAnimating.value ? "score-bounce" : ""}`}
          >
            {player?.score ?? 0} pts
            {scoreAnimating.value && (
              <span class="points-float" key={floatKey.value}>
                +{earnedPoints.value}
              </span>
            )}
          </span>
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
          <span class="empty-icon glow-element">02</span>
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
                      <span class="vote-row">
                        <span class="vote-track">
                          <span
                            class="vote-fill"
                            style={{
                              width: `${voteShare(answerCounts, choice.id)}%`,
                            }}
                          />
                        </span>
                        <span class="vote-pct">
                          {voteShare(answerCounts, choice.id)}%
                        </span>
                      </span>
                    )}
                  </span>
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
          <p>Parabéns! Veja o Top 3 do quiz:</p>
          <Podium players={gameState.players} highlightPlayerId={playerId} />
        </div>
      )}
    </section>
  );
}
