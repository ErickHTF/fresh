import type { PlayerSummary } from "@/shared/types.ts";

interface PodiumProps {
  players: PlayerSummary[];
  highlightPlayerId?: string;
}

const PLACE_CLASSES = ["podium-first", "podium-second", "podium-third"];

export function Podium({ players, highlightPlayerId }: PodiumProps) {
  return (
    <div class="podium">
      {players.slice(0, 3).map((player, index) => (
        <div
          class={`podium-item ${PLACE_CLASSES[index] ?? ""} ${
            player.id === highlightPlayerId ? "podium-current" : ""
          }`}
          key={player.id}
        >
          <span class="podium-medal">{index + 1}</span>
          <span class="podium-name">{player.nickname}</span>
          <span class="podium-score">{player.score} pts</span>
        </div>
      ))}
    </div>
  );
}
