import { define } from "../../../../utils.ts";
import {
  nicknameCookieName,
  orderCookieName,
  playerCookieName,
  setSessionCookie,
} from "../../../../server/cookies.ts";
import { joinGame } from "../../../../server/game.ts";
import { notify } from "../../../../server/events.ts";
import { body, errorResponse, json } from "../../../../server/http.ts";

interface JoinBody {
  nickname?: string;
}

export const handler = define.handlers({
  async POST(ctx) {
    const code = ctx.params.code.toUpperCase();
    try {
      const { nickname } = await body<JoinBody>(ctx.req);
      const session = await joinGame(code, nickname ?? "");
      const response = json({ nickname: session.nickname, code: session.code });
      setSessionCookie(
        response.headers,
        playerCookieName(session.code),
        session.playerToken,
      );
      setSessionCookie(
        response.headers,
        nicknameCookieName(session.code),
        session.nickname,
      );
      setSessionCookie(
        response.headers,
        orderCookieName(session.code),
        session.playerId,
      );
      await notify(session.code);
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  },
});
