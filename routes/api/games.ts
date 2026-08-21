import { define } from "../../utils.ts";
import { hostCookieName, setSessionCookie } from "../../server/cookies.ts";
import { createGame } from "../../server/game.ts";
import { errorResponse, json } from "../../server/http.ts";

export const handler = define.handlers({
  async POST() {
    try {
      const session = await createGame();
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
