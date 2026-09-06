import { useGameState } from "./useGameState.ts";

interface HostRankingProps {
  code: string;
}

export default function HostRanking({ code }: HostRankingProps) {
  const { state, error, connection } = useGameState(code);
  const players = state.value?.players ?? [];
  const hostNickname = state.value?.hostNickname;

  return (
    <aside class="island island-ranking ranking-island">
      <div class="ranking-heading">
        <div>
          <p class="eyebrow">Placar ao vivo</p>
          <h2>Ranking</h2>
        </div>
        <span
          class={`ranking-connection ranking-connection-${connection.value}`}
        >
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
            <li class="rank-row" key={player.id}>
              <span class="rank-number">{index + 1}</span>
              <span class="rank-name">{player.nickname}</span>
              <span class="rank-score">{player.score}</span>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}
