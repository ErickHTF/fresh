import { sql } from "@/server/db.ts";
import { json } from "@/server/http.ts";
import { define } from "@/utils.ts";

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
