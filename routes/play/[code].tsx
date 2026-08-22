import { Head } from "fresh/runtime";
import LiveRanking from "../../islands/LiveRanking.tsx";
import PlayerGame from "../../islands/PlayerGame.tsx";
import {
  getCookie,
  nicknameCookieName,
  orderCookieName,
} from "../../server/cookies.ts";
import { define } from "../../utils.ts";

export default define.page(function PlayerGamePage(ctx) {
  const code = ctx.params.code.toUpperCase();
  const nickname = getCookie(ctx.req, nicknameCookieName(code)) ?? "Jogador";
  const orderSeed = getCookie(ctx.req, orderCookieName(code)) ?? "player";
  return (
    <>
      <Head>
        <title>Jogar {code} | Fresh Quiz</title>
      </Head>
      <main class="shell player-layout">
        <PlayerGame code={code} nickname={nickname} orderSeed={orderSeed} />
        <LiveRanking code={code} nickname={nickname} />
      </main>
    </>
  );
});
