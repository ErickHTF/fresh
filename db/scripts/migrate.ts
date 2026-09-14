import postgres from "postgres";
import { databaseUrl } from "@/server/config.ts";

const sql = postgres(databaseUrl);

const migrationsDir = new URL("../migrations/", import.meta.url);

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
