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
    try {
      const token = getCookie(ctx.req, playerCookieName(ctx.params.code));
      if (!token || !await verifyPlayer(ctx.params.code, token)) {
        return json({ error: "Apenas jogadores podem responder." }, 403);
      }
      const { choiceId } = await body<AnswerBody>(ctx.req);
      if (!token || !choiceId) {
        return json({ error: "Alternativa obrigatória." }, 422);
      }
      const startedAt = performance.now();
      await submitAnswer(ctx.params.code, token, choiceId);
      const response = json({ ok: true });
      response.headers.set(
        "server-timing",
        `answer;dur=${(performance.now() - startedAt).toFixed(1)}`,
      );
      notify(ctx.params.code);
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  },
});
