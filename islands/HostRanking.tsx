import { IslandMarker } from "../components/IslandMarker.tsx";
import { useGameState } from "./useGameState.ts";
import { useIslandRenderCount } from "./useIslandRenderCount.ts";

interface HostRankingProps {
  code: string;
}

export default function HostRanking({ code }: HostRankingProps) {
  const renderCount = useIslandRenderCount();
  const { state, error, connection } = useGameState(code);
  const players = state.value?.players ?? [];

  return (
    <aside class="island-surface island-surface-host ranking-island">
      <IslandMarker count={renderCount} name="HostRanking" tone="host" />
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
      <div class="ranking-list">
        {players.map((player, index) => (
          <div class="rank-row" key={player.id}>
            <span class="rank-number">{index + 1}</span>
            <span class="min-w-0 flex-1 truncate font-bold text-slate-800">
              {player.nickname}
            </span>
            <span class="font-black text-slate-950">{player.score}</span>
          </div>
        ))}
        {players.length === 0 && (
          <p class="ranking-empty">Aguardando jogadores...</p>
        )}
      </div>
    </aside>
  );
}
