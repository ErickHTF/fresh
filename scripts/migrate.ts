import postgres from "postgres";

const sql = postgres(
  Deno.env.get("DATABASE_URL") ??
    "postgres://fresh:fresh@localhost:5432/fresh_quiz",
);
const migration = await Deno.readTextFile("db/migrations/001_initial.sql");

try {
  await sql.unsafe(migration);
  console.log("Database schema is ready.");
} finally {
  await sql.end();
}
