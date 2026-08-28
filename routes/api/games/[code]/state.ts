import { define } from "../../../../utils.ts";
import { authorize } from "../../../../server/auth.ts";
import { getState } from "../../../../server/game.ts";
import { errorResponse, json } from "../../../../server/http.ts";
import { logRequest, logResponse, timeAction } from "../../../../server/log.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const code = ctx.params.code.toUpperCase();
    const path = `/api/games/${code}/state`;
    const startedAt = performance.now();
    logRequest("GET", path);
    try {
      if (!await authorize(ctx.req, code)) {
        return json({ error: "Não autorizado." }, 401);
      }
      const state = await timeAction("getState", () => getState(code));
      logResponse("GET", path, performance.now() - startedAt);
      return state ? json(state) : json({ error: "Sala não encontrada." }, 404);
    } catch (error) {
      return errorResponse(error);
    }
  },
});
