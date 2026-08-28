import { define } from "../../../../utils.ts";
import { getCookie, playerCookieName } from "../../../../server/cookies.ts";
import { notify } from "../../../../server/events.ts";
import { submitAnswer, verifyPlayer } from "../../../../server/game.ts";
import { body, errorResponse, json } from "../../../../server/http.ts";
import { logRequest, logResponse, timeAction } from "../../../../server/log.ts";

interface AnswerBody {
  choiceId?: string;
}

export const handler = define.handlers({
  async POST(ctx) {
    const code = ctx.params.code.toUpperCase();
    const path = `/api/games/${code}/answer`;
    const startedAt = performance.now();
    logRequest("POST", path);
    try {
      const token = getCookie(ctx.req, playerCookieName(code));
      if (!token || !await verifyPlayer(code, token)) {
        return json({ error: "Apenas jogadores podem responder." }, 403);
      }
      const { choiceId } = await body<AnswerBody>(ctx.req);
      if (!token || !choiceId) {
        return json({ error: "Alternativa obrigatória." }, 422);
      }
      await timeAction(
        "submitAnswer",
        () => submitAnswer(code, token, choiceId),
      );
      const response = json({ ok: true });
      response.headers.set(
        "server-timing",
        `answer;dur=${(performance.now() - startedAt).toFixed(1)}`,
      );
      await notify(code);
      logResponse("POST", path, performance.now() - startedAt);
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  },
});
