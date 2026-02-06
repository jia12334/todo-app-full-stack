import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

function normalizeURL(url: string): string {
  return url.replace(/\/+$/, "");
}

function getBaseURL(): string {
  if (process.env.BETTER_AUTH_URL) {
    return normalizeURL(process.env.BETTER_AUTH_URL);
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return normalizeURL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
}

function getTrustedOrigins(): string[] {
  const origins: string[] = [];
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    origins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  if (process.env.BETTER_AUTH_URL) {
    origins.push(normalizeURL(process.env.BETTER_AUTH_URL));
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(normalizeURL(process.env.NEXT_PUBLIC_APP_URL));
  }
  origins.push("http://localhost:3000");
  return [...new Set(origins)];
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  const baseURL = getBaseURL();
  const trustedOrigins = getTrustedOrigins();

  const checks: Record<string, unknown> = {
    auth_debug: {
      computed_baseURL: baseURL,
      trusted_origins: trustedOrigins,
      incoming_origin: origin,
      incoming_host: host,
      host_url: `https://${host}`,
      is_origin_trusted: trustedOrigins.includes(origin || "") || trustedOrigins.includes(`https://${host}`),
    },
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      BETTER_AUTH_SECRET: !!process.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "(not set)",
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
