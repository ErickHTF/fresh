import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { IslandMarker } from "../components/IslandMarker.tsx";
import { shuffleChoices } from "../shared/shuffle.ts";
import { useGameState } from "./useGameState.ts";
import { useIslandRenderCount } from "./useIslandRenderCount.ts";

interface PlayerGameProps {
  code: string;
  nickname: string;
  orderSeed: string;
}

export default function PlayerGame(
  { code, nickname, orderSeed }: PlayerGameProps,
) {
  const renderCount = useIslandRenderCount();
  const { state, error, connection, lastEventAt } = useGameState(code);
  const selected = useSignal("");
  const submitted = useSignal(false);
  const feedback = useSignal("");
  const lastQuestion = useSignal("");
  const timeExpired = useSignal(false);
  const roundTrip = useSignal<number | null>(null);
  const serverTime = useSignal<number | null>(null);

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
      const requestStartedAt = performance.now();
      const response = await fetch(`/api/games/${code}/answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ choiceId }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Não foi possível enviar a resposta.");
      }
      roundTrip.value = Math.round(performance.now() - requestStartedAt);
      serverTime.value = parseServerTiming(
        response.headers.get("server-timing"),
      );
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

  return (
    <section class="island-surface island-surface-player player-game-island">
      <IslandMarker count={renderCount} name="PlayerGame" tone="player" />
      <section class="game-header">
        <div>
          <p class="eyebrow">Você está jogando em</p>
          <h1 class="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {code}
          </h1>
        </div>
        <div class="header-actions">
          <div class="score-pill">{player?.score ?? 0} pts</div>
          <button
            class="button button-ghost"
            onClick={() => void leaveRoom()}
            type="button"
          >
            Sair
          </button>
        </div>
      </section>
      {(error.value || feedback.value) && (
        <p class={error.value ? "error-message mb-5" : "success-message mb-5"}>
          {error.value || feedback.value}
        </p>
      )}
      {!gameState && (
        <section class="panel">
          <LoadingState />
        </section>
      )}
      {gameState?.status === "lobby" && (
        <section class="panel empty-state min-h-[22rem]">
          <span class="empty-icon">02</span>
          <h2>Você entrou!</h2>
          <p>Aguarde o host começar o quiz.</p>
        </section>
      )}
      {gameState && current && gameState.status !== "lobby" &&
        gameState.status !== "finished" && (
        <section class="panel space-y-6">
          <div class="flex items-center justify-between gap-4">
            <p class="eyebrow">
              Pergunta {gameState.currentQuestionPosition} de{" "}
              {gameState.totalQuestions}
            </p>
            <Countdown
              deadlineAt={gameState.deadlineAt}
              onExpired={() => timeExpired.value = true}
            />
          </div>
          <h2 class="text-3xl font-black leading-tight text-slate-950">
            {current.prompt}
          </h2>
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
                  <span>{choice.label}</span>
                </button>
              );
            })}
          </div>
          {gameState.status === "question" && submitted.value && (
            <p class="text-center text-sm font-bold text-slate-500">
              Aguardando os outros jogadores...
            </p>
          )}
        </section>
      )}
      {gameState?.status === "finished" && (
        <section class="panel space-y-5">
          <div class="empty-state min-h-0">
            <span class="empty-icon">🏆</span>
            <h2>Fim de jogo</h2>
            <p>Veja sua posição no ranking ao lado.</p>
          </div>
        </section>
      )}
      <RuntimeCard
        connection={connection.value}
        lastEventAt={lastEventAt.value}
        roundTrip={roundTrip.value}
        serverTime={serverTime.value}
      />
    </section>
  );
}

interface RuntimeCardProps {
  connection: "connecting" | "online" | "offline";
  lastEventAt: number | null;
  roundTrip: number | null;
  serverTime: number | null;
}

function RuntimeCard(props: RuntimeCardProps) {
  const fps = useSignal<number | null>(null);
  const eventAge = props.lastEventAt
    ? Math.max(0, Math.round((Date.now() - props.lastEventAt) / 1000))
    : null;

  useEffect(() => {
    let frameCount = 0;
    let startedAt = performance.now();
    let frameId = 0;

    const measureFrames = (timestamp: number) => {
      frameCount += 1;
      if (timestamp - startedAt >= 1000) {
        fps.value = frameCount;
        frameCount = 0;
        startedAt = timestamp;
      }
      frameId = requestAnimationFrame(measureFrames);
    };

    frameId = requestAnimationFrame(measureFrames);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <details class="runtime-card">
      <summary>
        <span class="runtime-status-dot" />
        <span class="min-w-0 flex-1">
          <strong>Telemetria do cliente</strong>
          <small>como esta island está trabalhando</small>
        </span>
        <span class="runtime-chevron">+</span>
      </summary>
      <div class="runtime-grid">
        <RuntimeMetric label="Hydration" value="Ativa no cliente" />
        <RuntimeMetric label="SSE" value={connectionLabel(props.connection)} />
        <RuntimeMetric
          label="FPS"
          value={formatMetric(fps.value, " FPS", "Medindo...")}
        />
        <RuntimeMetric
          label="Rede"
          value={formatMetric(props.roundTrip, " ms", "Após resposta")}
        />
        <RuntimeMetric
          label="Servidor"
          value={formatMetric(props.serverTime, " ms", "Após resposta")}
        />
        <RuntimeMetric
          label="Último evento"
          value={eventAge === null ? "Aguardando evento" : `${eventAge}s atrás`}
        />
      </div>
    </details>
  );
}

function RuntimeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div class="runtime-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function connectionLabel(connection: RuntimeCardProps["connection"]): string {
  return {
    connecting: "Estabelecendo",
    online: "Conectado",
    offline: "Reconectando",
  }[
    connection
  ];
}

function formatMetric(
  value: number | null,
  suffix = "",
  pending = "Aguardando",
): string {
  return value === null ? pending : `${value}${suffix}`;
}

function parseServerTiming(header: string | null): number | null {
  const duration = header?.match(/dur=([\d.]+)/)?.[1];
  return duration ? Number(duration) : null;
}

interface CountdownProps {
  deadlineAt: string | null;
  onExpired: () => void;
}

function Countdown({ deadlineAt, onExpired }: CountdownProps) {
  const remaining = useSignal(0);

  useEffect(() => {
    let expired = false;

    function update() {
      if (!deadlineAt) return;
      const next = Math.max(
        0,
        Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000),
      );
      remaining.value = next;
      if (next === 0 && !expired) {
        expired = true;
        onExpired();
      }
    }

    update();
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [deadlineAt]);

  return (
    <div class={`timer ${remaining.value <= 5 ? "timer-warning" : ""}`}>
      {remaining.value}s
    </div>
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
