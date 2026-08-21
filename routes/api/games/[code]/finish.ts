import { define } from "../../../../utils.ts";
import { authorize } from "../../../../server/auth.ts";
import { notify } from "../../../../server/events.ts";
import { finishGame } from "../../../../server/game.ts";
import { errorResponse, json } from "../../../../server/http.ts";

export const handler = define.handlers({
  async POST(ctx) {
    try {
      if (await authorize(ctx.req, ctx.params.code) !== "host") {
        return json({ error: "Apenas o host pode encerrar o quiz." }, 403);
      }
      await finishGame(ctx.params.code);
      notify(ctx.params.code);
      return json({ ok: true });
    } catch (error) {
      return errorResponse(error);
    }
  },
});
