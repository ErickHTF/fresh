import { define } from "../utils.ts";
import { json } from "../server/http.ts";
import { sql } from "../server/db.ts";

export const handler = define.handlers({
  async GET() {
    try {
      await sql`SELECT 1`;
      return json({ status: "ok" });
    } catch {
      return json({ status: "unavailable" }, 503);
    }
  },
});
