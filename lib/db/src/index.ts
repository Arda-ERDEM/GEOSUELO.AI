import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : {} as any;
export const db = (pool && process.env.DATABASE_URL) ? drizzle(pool, { schema }) : {} as any;

export * from "./schema";
