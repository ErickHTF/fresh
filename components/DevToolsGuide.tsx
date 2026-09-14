export function DevToolsGuide() {
  return (
    <aside class="island island-guide guide-island">
      <div>
        <p class="eyebrow">Como o Fresh funciona</p>
        <h2 class="guide-title">Prove no inspetor</h2>
      </div>
      <ol class="guide-steps">
        <li>
          Abra o inspetor com <code class="guide-code">F12</code> ou{" "}
          <code class="guide-code">Cmd + Option + I</code>.
        </li>
        <li>
          Na aba <strong>Network</strong>, filtre por{" "}
          <code class="guide-code">events</code>{" "}
          na caixa de busca (não há botão específico), selecione a requisição
          tipo <code class="guide-code">eventsource</code> e abra a aba{" "}
          <strong>EventStream</strong>.
        </li>
        <li>
          Cada <code class="guide-code">state</code>{" "}
          em JSON chega nessa conexão já aberta, sem recarregar a página.
        </li>
        <li>
          Quando o tempo acaba, a revelação chega como um novo{" "}
          <code class="guide-code">state</code> no mesmo stream:{" "}
          <strong>nenhuma requisição nova</strong>. Só ações (ex.: voto) fazem
          um <code class="guide-code">POST</code> curto.
        </li>
      </ol>
    </aside>
  );
}
