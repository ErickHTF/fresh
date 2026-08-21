import postgres from "postgres";

const sql = postgres(
  Deno.env.get("DATABASE_URL") ??
    "postgres://fresh:fresh@localhost:5432/fresh_quiz",
);
const seed = await Deno.readTextFile("db/seed/001_web_basics.sql");

try {
  await sql.unsafe(seed);
  console.log("Web basics quiz seeded.");
} finally {
  await sql.end();
}
