import { define } from "../../../../utils.ts";
import { clearSessionCookies } from "../../../../server/cookies.ts";
import { notify } from "../../../../server/events.ts";
import { json } from "../../../../server/http.ts";
import { logRequest, logResponse } from "../../../../server/log.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const code = ctx.params.code.toUpperCase();
    const path = `/api/games/${code}/leave`;
    const startedAt = performance.now();
    logRequest("POST", path);
    const response = json({ ok: true });
    clearSessionCookies(response.headers, code);
    await notify(code);
    logResponse("POST", path, performance.now() - startedAt);
    return response;
  },
});
