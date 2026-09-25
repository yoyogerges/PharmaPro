export const ENV = {
  get port() {
    return Number(process.env.PORT ?? 3000);
  },
  get nodeEnv() {
    return process.env.NODE_ENV ?? 'development';
  },
  get isProd() {
    return this.nodeEnv === 'production';
  },
  get databaseUrl() {
    return process.env.DATABASE_URL ?? '';
  },
  get redisUrl() {
    return process.env.REDIS_URL ?? 'redis://localhost:6380';
  },
  get jwtSecret() {
    return process.env.JWT_SECRET ?? 'dev-secret-change-me';
  },
  get jwtRefreshSecret() {
    return process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev-refresh-secret-change-me';
  },
  get accessTokenTtl() {
    return process.env.JWT_ACCESS_TTL ?? '15m';
  },
  get refreshTokenTtl() {
    return process.env.JWT_REFRESH_TTL ?? '7d';
  },
  get corsOrigins() {
    return (process.env.CORS_ORIGINS ?? 'http://localhost:4200').split(',').map((s) => s.trim());
  },
  get frontendUrl() {
    return process.env.FRONTEND_URL ?? 'http://localhost:4200';
  },
  /** Maximum number of objects returned for un-paginated list requests. */
  get maxListLimit() {
    return Number(process.env.MAX_LIST_LIMIT ?? 1000);
  },
};

export function isEnvDefined(): boolean {
  return ENV.databaseUrl.startsWith('postgresql') && ENV.jwtSecret.length > 0;
}