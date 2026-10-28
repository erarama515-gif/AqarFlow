import { registerAs } from '@nestjs/config';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Environment schema — fail fast on misconfiguration
// -----------------------------------------------------------------------------
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.string().url().default('http://localhost:3001'),
  API_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().default('http://localhost:3001'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PREFIX: z.string().default('aqarflow:'),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_TTL: z.string().default('7d'),
  PASSWORD_PEPPER: z.string().min(32),

  GOOGLE_OAUTH_ENABLED: z.coerce.boolean().default(false),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_CALLBACK_URL: z.string().optional(),

  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET: z.string().default('aqarflow-media'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('AqarFlow <noreply@aqarflow.local>'),
  SMTP_SECURE: z.coerce.boolean().default(false),

  TENANT_RESOLUTION_MODE: z.enum(['subdomain', 'header', 'jwt-only']).default('subdomain'),
  ROOT_DOMAIN: z.string().default('aqarflow.local'),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(60_000),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OTEL_ENABLED: z.coerce.boolean().default(false),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment variables:');
    // eslint-disable-next-line no-console
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Environment validation failed. See errors above.');
  }
  return parsed.data;
}

// -----------------------------------------------------------------------------
// Nested config — exposed via ConfigService.get('app.*')
// -----------------------------------------------------------------------------
export const appConfig = registerAs('app', () => {
  const env = validateEnv(process.env);
  return {
    env: env.NODE_ENV,
    port: env.API_PORT,
    appUrl: env.APP_URL,
    apiUrl: env.API_URL,
    corsOrigin: env.CORS_ORIGIN,
    rootDomain: env.ROOT_DOMAIN,
    tenantResolutionMode: env.TENANT_RESOLUTION_MODE,
    rateLimit: {
      max: env.RATE_LIMIT_MAX,
      windowMs: env.RATE_LIMIT_WINDOW,
    },
    db: {
      url: env.DATABASE_URL,
    },
    redis: {
      url: env.REDIS_URL,
      prefix: env.REDIS_PREFIX,
    },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshSecret: env.JWT_REFRESH_SECRET,
      refreshTtl: env.JWT_REFRESH_TTL,
    },
    auth: {
      pepper: env.PASSWORD_PEPPER,
      google: {
        enabled: env.GOOGLE_OAUTH_ENABLED,
        clientId: env.GOOGLE_OAUTH_CLIENT_ID ?? '',
        clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
        callbackUrl: env.GOOGLE_OAUTH_CALLBACK_URL ?? '',
      },
    },
    storage: {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      accessKey: env.S3_ACCESS_KEY,
      secretKey: env.S3_SECRET_KEY,
      bucket: env.S3_BUCKET,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    },
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from: env.SMTP_FROM,
      secure: env.SMTP_SECURE,
    },
    log: {
      level: env.LOG_LEVEL,
    },
    otel: {
      enabled: env.OTEL_ENABLED,
      endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    },
  };
});
