import postgres from "postgres";
import { databaseUrl } from "@/server/config.ts";

const sql = postgres(databaseUrl);
const seed = await Deno.readTextFile(
  new URL("../seed/001_web_basics.sql", import.meta.url),
);

try {
  await sql.unsafe(seed);
  console.log("Web basics quiz seeded.");
} finally {
  await sql.end();
}
