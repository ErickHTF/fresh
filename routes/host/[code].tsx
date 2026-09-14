import { Head } from "fresh/runtime";
import { DevToolsGuide } from "../../components/DevToolsGuide.tsx";
import { StaticNotice } from "../../components/StaticNotice.tsx";
import HostGame from "../../islands/HostGame.tsx";
import Ranking from "../../islands/Ranking.tsx";
import { define } from "../../utils.ts";

export default define.page(function HostGamePage(ctx) {
  const code = ctx.params.code.toUpperCase();
  return (
    <>
      <Head>
        <title>Sala {code} | Fresh Quiz</title>
      </Head>
      <main class="shell">
        <div class="game-layout">
          <DevToolsGuide />
          <HostGame code={code} />
          <Ranking code={code} />
        </div>
      </main>
      <StaticNotice />
    </>
  );
});
