import { define } from "../../../../utils.ts";
import { authorize } from "../../../../server/auth.ts";
import { getCookie, playerCookieName } from "../../../../server/cookies.ts";
import { getState } from "../../../../server/game.ts";
import { errorResponse, json } from "../../../../server/http.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const code = ctx.params.code.toUpperCase();
    try {
      const role = await authorize(ctx.req, code);
      if (!role) {
        return json({ error: "Não autorizado." }, 401);
      }
      const state = await getState(code, {
        role,
        playerToken: getCookie(ctx.req, playerCookieName(code)),
      });
      return state ? json(state) : json({ error: "Sala não encontrada." }, 404);
    } catch (error) {
      return errorResponse(error);
    }
  },
});
