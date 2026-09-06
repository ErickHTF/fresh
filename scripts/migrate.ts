import postgres from "postgres";

const sql = postgres(
  Deno.env.get("DATABASE_URL") ??
    "postgres://fresh:fresh@localhost:5433/fresh_quiz",
);

const migrationsDir = new URL("../db/migrations/", import.meta.url);

try {
  const files = [...Deno.readDirSync(migrationsDir)]
    .filter((entry) => entry.isFile && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
  for (const file of files) {
    const migration = await Deno.readTextFile(new URL(file, migrationsDir));
    await sql.unsafe(migration);
    console.log(`Applied ${file}`);
  }
  console.log("Database schema is ready.");
} finally {
  await sql.end();
}
