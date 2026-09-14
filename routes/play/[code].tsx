import { Head } from "fresh/runtime";
import { DevToolsGuide } from "@/components/DevToolsGuide.tsx";
import { StaticNotice } from "@/components/StaticNotice.tsx";
import PlayerGame from "@/islands/PlayerGame.tsx";
import Ranking from "@/islands/Ranking.tsx";
import { getCookie, playerIdCookieName } from "@/server/cookies.ts";
import { define } from "@/utils.ts";

export default define.page(function PlayerGamePage(ctx) {
  const code = ctx.params.code.toUpperCase();
  const playerId = getCookie(ctx.req, playerIdCookieName(code)) ?? "";
  return (
    <>
      <Head>
        <title>Jogar {code} | Fresh Quiz</title>
      </Head>
      <main class="shell">
        <div class="game-layout">
          <DevToolsGuide />
          <PlayerGame code={code} playerId={playerId} />
          <Ranking code={code} highlightPlayerId={playerId} />
        </div>
      </main>
      <StaticNotice />
    </>
  );
});
