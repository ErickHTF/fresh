import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import type { PlayerSummary } from "@/shared/types.ts";
import { useGameState } from "./useGameState.ts";

interface RankingProps {
  code: string;
  highlightPlayerId?: string;
}

// Referência estável: `?? []` criaria um array novo a cada render,
// re-executando o efeito abaixo sem necessidade enquanto o estado carrega.
const NO_PLAYERS: PlayerSummary[] = [];

export default function Ranking({ code, highlightPlayerId }: RankingProps) {
  const { state, error, connection } = useGameState(code);
  const players = state.value?.players ?? NO_PLAYERS;
  const hostNickname = state.value?.hostNickname;
  const slideUpPlayers = useSignal<Set<string>>(new Set());
  const glowPlayers = useSignal<Set<string>>(new Set());
  const scorePopPlayers = useSignal<Set<string>>(new Set());
  const prevPositionsRef = useRef<Map<string, number>>(new Map());
  const prevScoresRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const status = state.value?.status;

    if (status === "question") {
      // Só escreve quando há o que limpar: atribuir um Set novo sempre
      // notifica os signals e força re-render a cada push de estado.
      if (slideUpPlayers.value.size > 0) slideUpPlayers.value = new Set();
      if (glowPlayers.value.size > 0) glowPlayers.value = new Set();
      if (scorePopPlayers.value.size > 0) scorePopPlayers.value = new Set();
    }

    if (status === "reveal") {
      const slidUp = new Set<string>();
      const glowing = new Set<string>();
      const popping = new Set<string>();

      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const prevPos = prevPositionsRef.current.get(p.id) ?? i;
        const prevScore = prevScoresRef.current.get(p.id) ?? 0;

        if (i < prevPos) slidUp.add(p.id);
        if (p.score > prevScore) {
          glowing.add(p.id);
          popping.add(p.id);
        }
      }

      if (slidUp.size > 0) slideUpPlayers.value = slidUp;
      if (glowing.size > 0) glowPlayers.value = glowing;
      if (popping.size > 0) scorePopPlayers.value = popping;
    }

    const posSnapshot = new Map<string, number>();
    const scoreSnapshot = new Map<string, number>();
    for (let i = 0; i < players.length; i++) {
      posSnapshot.set(players[i].id, i);
      scoreSnapshot.set(players[i].id, players[i].score);
    }
    prevPositionsRef.current = posSnapshot;
    prevScoresRef.current = scoreSnapshot;
  }, [state.value?.status, players]);

  return (
    <aside class="island island-ranking ranking-island">
      <div class="ranking-heading">
        <div>
          <p class="eyebrow">Placar ao vivo</p>
          <h2>Ranking</h2>
        </div>
        <span class={`ranking-connection ranking-${connection.value}`}>
          {connection.value === "online"
            ? "LIVE"
            : connection.value === "connecting"
            ? "..."
            : "OFF"}
        </span>
      </div>

      {error.value && <p class="error-message">{error.value}</p>}

      {hostNickname && (
        <section class="ranking-group">
          <p class="ranking-group-label">Host</p>
          <div class="host-card">
            <span class="host-avatar">{hostNickname.slice(0, 1)}</span>
            <span class="host-name">{hostNickname}</span>
            <span class="host-tag">Host</span>
          </div>
        </section>
      )}

      <section class="ranking-group">
        <p class="ranking-group-label">Jogadores</p>
        {players.length === 0 && (
          <p class="ranking-empty">Aguardando jogadores...</p>
        )}
        <ol class="ranking-list">
          {players.map((player, index) => (
            <li
              class={`rank-row ${
                player.id === highlightPlayerId ? "rank-row-current" : ""
              } ${slideUpPlayers.value.has(player.id) ? "row-slide-up" : ""} ${
                glowPlayers.value.has(player.id) ? "row-glow" : ""
              }`}
              key={player.id}
            >
              <span class="rank-number">{index + 1}</span>
              <span class="rank-name">{player.nickname}</span>
              <span
                class={`rank-score ${
                  scorePopPlayers.value.has(player.id) ? "rank-pop" : ""
                }`}
              >
                {player.score}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}
