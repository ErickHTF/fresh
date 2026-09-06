import { define } from "../../../../utils.ts";
import { authorize } from "../../../../server/auth.ts";
import { notify } from "../../../../server/events.ts";
import { restartGame } from "../../../../server/game.ts";
import { errorResponse, json } from "../../../../server/http.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const code = ctx.params.code.toUpperCase();
    try {
      if (await authorize(ctx.req, code) !== "host") {
        return json({ error: "Apenas o host pode reiniciar a partida." }, 403);
      }
      await restartGame(code);
      await notify(code);
      return json({ ok: true });
    } catch (error) {
      return errorResponse(error);
    }
  },
});
