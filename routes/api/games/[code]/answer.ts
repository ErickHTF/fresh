import { define } from "../../../../utils.ts";
import { getCookie, playerCookieName } from "../../../../server/cookies.ts";
import { notify } from "../../../../server/events.ts";
import { submitAnswer, verifyPlayer } from "../../../../server/game.ts";
import { body, errorResponse, json } from "../../../../server/http.ts";

interface AnswerBody {
  choiceId?: string;
}

export const handler = define.handlers({
  async POST(ctx) {
    const code = ctx.params.code.toUpperCase();
    try {
      const token = getCookie(ctx.req, playerCookieName(code));
      if (!token || !await verifyPlayer(code, token)) {
        return json({ error: "Apenas jogadores podem responder." }, 403);
      }
      const { choiceId } = await body<AnswerBody>(ctx.req);
      if (!token || !choiceId) {
        return json({ error: "Alternativa obrigatória." }, 422);
      }
      await submitAnswer(code, token, choiceId);
      await notify(code);
      return json({ ok: true });
    } catch (error) {
      return errorResponse(error);
    }
  },
});
