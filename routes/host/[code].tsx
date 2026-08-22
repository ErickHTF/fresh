import { Head } from "fresh/runtime";
import HostGame from "../../islands/HostGame.tsx";
import HostRanking from "../../islands/HostRanking.tsx";
import { define } from "../../utils.ts";

export default define.page(function HostGamePage(ctx) {
  const code = ctx.params.code.toUpperCase();
  return (
    <>
      <Head>
        <title>Sala {code} | Fresh Quiz</title>
      </Head>
      <main class="shell">
        <div class="game-page-layout">
          <HostGame code={code} />
          <HostRanking code={code} />
        </div>
      </main>
    </>
  );
});
