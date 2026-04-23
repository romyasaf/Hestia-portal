/**
 * Fail-fast configuration for the Express API.
 * Do not fall back to placeholder secrets — see ENVIRONMENT.md.
 */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v.trim();
}

export const apiEnv = {
  port: Number(process.env.PORT ?? 4000) || 4000,
  databaseUrl: requireEnv("DATABASE_URL"),
  jwtAccessSecret: requireEnv("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: requireEnv("JWT_REFRESH_SECRET")
};
