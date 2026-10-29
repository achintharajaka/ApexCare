import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().default("postgresql://hms_app_user:ClinicalAdmin2026!@localhost:5432/hms_production?schema=public"),
  DIRECT_URL: z.string().default("postgresql://hms_app_user:ClinicalAdmin2026!@localhost:5432/hms_production?schema=public"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32).default("apexcare-clinical-jwt-secret-key-32-chars-minimum-2026"),
  ENCRYPTION_SECRET: z.string().min(16).default("apexcare-aes-256-gcm-master-encryption-key-32-chars-2026"),
  APP_TRUSTED_ORIGIN: z.string().default("http://localhost:5173"),
  FRONTEND_URL: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  PAYMENT_GATEWAY_WEBHOOK_SECRET: z.string().min(32).default("payment-gateway-webhook-secret-key-32-chars-min"),
  PAYMENT_GATEWAY_ALLOWED_IPS: z.string().default("127.0.0.1,::1,localhost").transform((val) => val.split(",").map(s => s.trim())),
  STORAGE_BUCKET_NAME: z.string().default("hms-medical-vault"),
  MAX_FILE_SIZE_BYTES: z.coerce.number().default(5242880), // 5MB
});

export const env = envSchema.parse(process.env);
