import postgres from "postgres";

const connectionString = Deno.env.get("DATABASE_URL") ??
  "postgres://fresh:fresh@localhost:5432/fresh_quiz";

export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
});
