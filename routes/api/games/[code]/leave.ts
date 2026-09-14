import { clearSessionCookies } from "../../../../server/cookies.ts";
import { notify } from "../../../../server/events.ts";
import { json } from "../../../../server/http.ts";
import { define } from "../../../../utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const code = ctx.params.code.toUpperCase();
    const response = json({ ok: true });
    clearSessionCookies(response.headers, code);
    await notify(code);
    return response;
  },
});
