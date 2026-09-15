import { authorize } from "@/server/auth.ts";
import { notify } from "@/server/events.ts";
import { skipQuestion } from "@/server/game/index.ts";
import { errorResponse, json } from "@/server/http.ts";
import { define } from "@/utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const code = ctx.params.code.toUpperCase();
    try {
      if (await authorize(ctx.req, code) !== "host") {
        return json({ error: "Apenas o host pode pular a pergunta." }, 403);
      }
      await skipQuestion(code);
      await notify(code);
      return json({ ok: true });
    } catch (error) {
      return errorResponse(error);
    }
  },
});
