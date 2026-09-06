import { define } from "../../utils.ts";
import { hostCookieName, setSessionCookie } from "../../server/cookies.ts";
import { createGame } from "../../server/game.ts";
import { body, errorResponse, json } from "../../server/http.ts";

interface CreateGameBody {
  nickname?: string;
}

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const { nickname } = await body<CreateGameBody>(ctx.req);
      const session = await createGame(nickname ?? "");
      const response = json({ code: session.code });
      setSessionCookie(
        response.headers,
        hostCookieName(session.code),
        session.hostToken,
      );
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  },
});
