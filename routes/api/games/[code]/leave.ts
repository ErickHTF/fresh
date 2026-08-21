import { define } from "../../../../utils.ts";
import { clearSessionCookies } from "../../../../server/cookies.ts";
import { notify } from "../../../../server/events.ts";
import { json } from "../../../../server/http.ts";

export const handler = define.handlers({
  POST(ctx) {
    const response = json({ ok: true });
    clearSessionCookies(response.headers, ctx.params.code);
    notify(ctx.params.code);
    return response;
  },
});
