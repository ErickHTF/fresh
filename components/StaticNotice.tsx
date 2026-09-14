export function StaticNotice() {
  return (
    <aside class="island static-notice">
      <span class="static-notice-tag">Aviso</span>
      <p>
        Este é um exemplo de informação que <strong>não</strong>{" "}
        será atualizada via JavaScript ;)
        <span class="static-notice-hint">
          Para confirmar, desabilite o JavaScript no DevTools (
          <code class="guide-code">Cmd/Ctrl + Shift + P</code>{" "}
          → "Disable JavaScript") e recarregue: este aviso continua visível.
        </span>
      </p>
    </aside>
  );
}
