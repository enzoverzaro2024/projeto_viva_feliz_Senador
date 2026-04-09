import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.viva_feliz_db_POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://localhost:5432/eventcard";

const client = postgres(connectionString, {
  prepare: false,
  ssl: "require",
});
export const db = drizzle(client, { schema });
