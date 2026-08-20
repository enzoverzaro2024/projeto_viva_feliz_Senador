import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL ||
  "postgresql://neondb_owner:npg_BsqlnL6vKAM2@ep-winter-thunder-acmv5sf7-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";

export const client = postgres(connectionString, {
  prepare: false,
  ssl: "require",
});

export const sql = client;
export const db = drizzle(client, { schema });
