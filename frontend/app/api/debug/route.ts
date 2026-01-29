import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const checks: Record<string, unknown> = {
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      BETTER_AUTH_SECRET: !!process.env.BETTER_AUTH_SECRET,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "(not set)",
      VERCEL_URL: process.env.VERCEL_URL ?? "(not set)",
      VERCEL_PROJECT_PRODUCTION_URL:
        process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "(not set)",
    },
  };

  // Test DB connection & check tables
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`
    );
    checks.db_connected = true;
    checks.tables = result.rows.map((r) => r.table_name);

    // Check if Better Auth tables exist
    const requiredTables = ["user", "session", "account", "verification"];
    const existingTables = new Set(checks.tables as string[]);
    checks.missing_tables = requiredTables.filter((t) => !existingTables.has(t));

    await pool.end();
  } catch (err) {
    checks.db_connected = false;
    checks.db_error = String(err);
  }

  return NextResponse.json(checks);
}
