import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Remove trailing slash from URL
function normalizeURL(url: string): string {
  return url.replace(/\/+$/, "");
}

// Resolve the app's base URL for Vercel, preview deployments, and local dev
function getBaseURL(): string {
  if (process.env.BETTER_AUTH_URL) {
    return normalizeURL(process.env.BETTER_AUTH_URL);
  }
  // Use VERCEL_URL first for preview deployments to work
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return normalizeURL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
}

// Get all trusted origins (production + preview + custom)
function getTrustedOrigins(): string[] {
  const origins: string[] = [];

  // Add current deployment URL
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  // Add production URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    origins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }

  // Add custom URLs
  if (process.env.BETTER_AUTH_URL) {
    origins.push(normalizeURL(process.env.BETTER_AUTH_URL));
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(normalizeURL(process.env.NEXT_PUBLIC_APP_URL));
  }

  // Add localhost for development
  origins.push("http://localhost:3000");

  // Remove duplicates
  return [...new Set(origins)];
}

const baseURL = getBaseURL();

export const auth = betterAuth({
  baseURL,
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  trustedOrigins: getTrustedOrigins(),
  plugins: [
    jwt({
      jwt: {
        issuer: baseURL,
        audience: baseURL,
        expirationTime: "7d",
        definePayload: ({ user }) => ({
          id: user.id,
          email: user.email,
        }),
      },
    }),
  ],
});
