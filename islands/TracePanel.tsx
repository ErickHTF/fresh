import { clearTrace, trace } from "./useRenderTrace.ts";

export default function TracePanel() {
  const entries = trace.value;

  return (
    <details class="trace-panel" open>
      <summary>
        <span class="trace-title">Linha do tempo de renders (cliente)</span>
        <span class="trace-count">{entries.length} eventos</span>
        <button
          class="trace-clear"
          onClick={(event) => {
            event.preventDefault();
            clearTrace();
          }}
          type="button"
        >
          Limpar
        </button>
      </summary>
      <div class="trace-list">
        {entries.length === 0 && (
          <p class="trace-empty">
            Nenhum evento ainda. Clique em algo na island e observe.
          </p>
        )}
        {entries.map((entry, index) => (
          <div class="trace-row" key={index}>
            <span class="trace-time">{entry.time}</span>
            <span class={`trace-source trace-source-${entry.source}`}>
              {entry.source}
            </span>
            <span class="trace-message">{entry.message}</span>
            <span class="trace-renders">
              +{entry.renders} {entry.renders === 1 ? "render" : "renders"}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}
