import { define } from "../../utils.ts";
import { hostCookieName, setSessionCookie } from "../../server/cookies.ts";
import { createGame } from "../../server/game.ts";
import { errorResponse, json } from "../../server/http.ts";
import {
  logDemo,
  logRequest,
  logResponse,
  timeAction,
} from "../../server/log.ts";

export const handler = define.handlers({
  async POST() {
    const path = "/api/games";
    const startedAt = performance.now();
    logRequest("POST", path);
    try {
      const session = await timeAction("createGame", createGame);
      const response = json({ code: session.code });
      setSessionCookie(
        response.headers,
        hostCookieName(session.code),
        session.hostToken,
      );
      logDemo("✔", `sala ${session.code} criada`);
      logResponse("POST", path, performance.now() - startedAt);
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  },
});
