"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().default(5000),
    DATABASE_URL: zod_1.z.string().default("postgresql://hms_app_user:ClinicalAdmin2026!@localhost:5432/hms_production?schema=public"),
    DIRECT_URL: zod_1.z.string().default("postgresql://hms_app_user:ClinicalAdmin2026!@localhost:5432/hms_production?schema=public"),
    REDIS_URL: zod_1.z.string().default("redis://localhost:6379"),
    JWT_SECRET: zod_1.z.string().min(32).default("apexcare-clinical-jwt-secret-key-32-chars-minimum-2026"),
    ENCRYPTION_SECRET: zod_1.z.string().min(16).default("apexcare-aes-256-gcm-master-encryption-key-32-chars-2026"),
    APP_TRUSTED_ORIGIN: zod_1.z.string().default("http://localhost:5173"),
    FRONTEND_URL: zod_1.z.string().optional(),
    CORS_ALLOWED_ORIGINS: zod_1.z.string().optional(),
    PAYMENT_GATEWAY_WEBHOOK_SECRET: zod_1.z.string().min(32).default("payment-gateway-webhook-secret-key-32-chars-min"),
    PAYMENT_GATEWAY_ALLOWED_IPS: zod_1.z.string().default("127.0.0.1,::1,localhost").transform((val) => val.split(",").map(s => s.trim())),
    STORAGE_BUCKET_NAME: zod_1.z.string().default("hms-medical-vault"),
    MAX_FILE_SIZE_BYTES: zod_1.z.coerce.number().default(5242880), // 5MB
});
exports.env = envSchema.parse(process.env);
