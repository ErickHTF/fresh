export type IslandTone = "join" | "host" | "player" | "ranking";

interface IslandMarkerProps {
  count: number;
  name: string;
  tone: IslandTone;
}

export function IslandMarker({ count, name, tone }: IslandMarkerProps) {
  return (
    <div
      class={`island-marker island-marker-${tone}`}
      title={`${name}: ${count} renderizações`}
    >
      <span class="island-count">{count}</span>
      <span class="island-marker-copy">
        <strong>{name}</strong>
        <small>renderizações</small>
      </span>
    </div>
  );
}
