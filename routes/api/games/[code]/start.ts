import { define } from "../../../../utils.ts";
import { authorize } from "../../../../server/auth.ts";
import { notify } from "../../../../server/events.ts";
import { startGame } from "../../../../server/game.ts";
import { errorResponse, json } from "../../../../server/http.ts";
import { logRequest, logResponse, timeAction } from "../../../../server/log.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const code = ctx.params.code.toUpperCase();
    const path = `/api/games/${code}/start`;
    const startedAt = performance.now();
    logRequest("POST", path);
    try {
      if (await authorize(ctx.req, code) !== "host") {
        return json({ error: "Apenas o host pode iniciar a partida." }, 403);
      }
      await timeAction("startGame", () => startGame(code));
      await notify(code);
      logResponse("POST", path, performance.now() - startedAt);
      return json({ ok: true });
    } catch (error) {
      return errorResponse(error);
    }
  },
});
