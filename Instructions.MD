# INSTRUCTIONS.md: Hospital Management System (HMS) Implementation Guide

## 1. Project Overview & Architectural Foundation

This repository contains the end-to-end implementation instructions for the **Hospital Management System (HMS)**[cite: 1]. The architecture is designed to orchestrate patient records, appointments, laboratory diagnostics, pharmacy workflows, and billing operations under strict healthcare data governance and performance standards[cite: 1, 2, 5].

### 1.1 Technical Stack

- **Frontend**: React 18+ (Vite) / TypeScript, Tailwind CSS, Lucide React, React Joyride (onboarding tour).
- **Backend**: Node.js (LTS) / Express with TypeScript or NestJS, running request-scoped execution contexts.
- **Database & ORM**: PostgreSQL 16+ managed via Supabase or native instance, connected through PgBouncer connection pooling, orchestrated via Prisma ORM / Drizzle ORM[cite: 8].
- **Caching & Ephemeral Layer**: Redis (Upstash or self-hosted) for session rate-limiting, idempotency caches, and sub-50ms data retrievals.
- **Storage**: S3-compatible private object storage (e.g., Supabase Storage / AWS S3) with pre-signed URL delivery.

### 1.2 Asset Integration (Stitch UI & `design.md`)

- The exported Google Stitch ZIP archive contains the visual wireframes, components, and HTML/CSS representations.
- Extract the Stitch ZIP into `frontend/src/assets/stitch-export/`.
- Map the UI components according to the layout geometry, color variables (`--primary-navy`, `--primary-teal`, etc.), and structural guidelines defined in `design.md`.

---

## 2. Directory Layout

## hms-core/├── design.md # UI/UX design tokens and screen specs├── instructions.md # System implementation guide (this file)├── docker-compose.yml # Local Postgres, Redis, and PgBouncer├── .env.example # Master environment variable template├── backend/│ ├── src/│ │ ├── config/ # Validated environment configurations│ │ ├── middleware/ # CSRF, CSP, Origin, RateLimit, RBAC, Tenant│ │ ├── modules/│ │ │ ├── auth/ # JWT, Session, Password policy│ │ │ ├── patients/ # Registration, EMR, Document vault│ │ │ ├── appointments/ # Slot booking, Calendar engine│ │ │ ├── laboratory/ # Diagnostic tests, Sample tracking│ │ │ ├── pharmacy/ # Stock inventory, Expiry monitoring│ │ │ ├── billing/ # Invoicing, Webhooks, Idempotency│ │ │ └── staff/ # Attendance, Rostering, Audit logs│ │ ├── db/│ │ │ ├── schema.prisma # Database schema with UUIDs & indexes│ │ │ ├── migrations/ # SQL migration files│ │ │ └── seed.ts # Clinical demo and sandbox seed data│ │ └── utils/ # DOMPurify, Cryptographic verify, S3 helpers│ ├── tests/│ │ ├── security/ # OWASP, IDOR, and injection tests│ │ └── load/ # k6 performance and concurrency scripts│ └── package.json└── frontend/├── src/│ ├── assets/ # Google Stitch exported layout assets│ ├── components/ # Atomic UI components based on design.md│ ├── features/ # Modular screen features (Dashboard, EMR, Billing)│ ├── hooks/ # Custom React hooks (Infinite loop safe)│ ├── context/ # Request/Tenant/Auth providers│ └── onboarding/ # Joyride interactive tour configurations└── package.json

## 3. Environment & Secret Management

Hardcoded secrets in frontend or backend repositories are strictly prohibited. Configuration values must pass strict schema validation at application boot using Zod.

### 3.1 Backend Configuration (`backend/src/config/env.ts`)

```typescript
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(), // Direct connection for migrations bypass pooling
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  APP_TRUSTED_ORIGIN: z.string().url(),
  PAYMENT_GATEWAY_WEBHOOK_SECRET: z.string().min(32),
  PAYMENT_GATEWAY_ALLOWED_IPS: z.string().transform((val) => val.split(",")),
  STORAGE_BUCKET_NAME: z.string().min(1),
  MAX_FILE_SIZE_BYTES: z.coerce.number().default(5242880), // 5MB
});

export const env = envSchema.parse(process.env);
3.2 Frontend Secret IsolationOnly variables prefixed with VITE_ can be exposed to the client.Never expose database credentials, payment webhook secrets, private bucket keys, or master encryption keys in frontend code.4. Database Architecture & Row-Level Security (RLS)All primary keys must use cryptographically generated UUIDv4 or UUIDv7 strings to eliminate guessable database ID exposure (e.g., preventing sequential enumeration attacks like /api/patients/1).4.1 Prisma Schema & Database Indexing (backend/src/db/schema.prisma)Code snippetdatasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum RoleType {
  ADMIN
  DOCTOR
  NURSE
  RECEPTIONIST
  LAB_TECH
  PHARMACIST
  ACCOUNTANT
}

model Tenant {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())

  users     User[]
  patients  Patient[]
  bills     Bill[]
  auditLogs AuditLog[]

  @@index([slug])
}

model User {
  id           String    @id @default(uuid())
  tenantId     String
  tenant       Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  username     String    @unique
  passwordHash String
  fullName     String
  email        String    @unique
  role         RoleType
  isActive     Boolean   @default(true)
  lastLogin    DateTime?
  createdAt    DateTime  @default(now())

  billsIssued  Bill[]    @relation("AccountantBills")
  auditLogs    AuditLog[]

  @@index([tenantId, role])
  @@index([email])
}

model Patient {
  id             String         @id @default(uuid())
  tenantId       String
  tenant         Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  mrn            String         @unique // Medical Record Number
  firstName      String
  lastName       String
  dateOfBirth    DateTime
  gender         String
  bloodGroup     String?
  contactNumber  String
  address        String?
  allergies      String[]
  createdAt      DateTime       @default(now())

  appointments   Appointment[]
  medicalRecords MedicalRecord[]
  bills          Bill[]

  @@index([tenantId, mrn])
  @@index([lastName, firstName])
  @@index([tenantId, contactNumber])
}

model Appointment {
  id              String   @id @default(uuid())
  tenantId        String
  patientId       String
  patient         Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  doctorId        String
  appointmentDate DateTime
  status          String   @default("Scheduled") // Scheduled, Completed, Cancelled
  reason          String?
  createdAt       DateTime @default(now())

  @@index([tenantId, doctorId, appointmentDate])
  @@index([patientId])
}

model MedicalRecord {
  id               String   @id @default(uuid())
  tenantId         String
  patientId        String
  patient          Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  doctorId         String
  visitDate        DateTime @default(now())
  diagnosis        String
  treatmentHistory String?
  clinicalNotes    String

  @@index([tenantId, patientId, visitDate])
}

model Bill {
  id            String         @id @default(uuid())
  tenantId      String
  tenant        Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  patientId     String
  patient       Patient        @relation(fields: [patientId], references: [id], onDelete: Cascade)
  accountantId  String
  accountant    User           @relation("AccountantBills", fields: [accountantId], references: [id])
  totalAmount   Decimal        @db.Decimal(12, 2)
  discount      Decimal        @default(0.00) @db.Decimal(12, 2)
  netPayable    Decimal        @db.Decimal(12, 2)
  paymentStatus String         @default("Unpaid") // Unpaid, Paid, Partially_Paid
  invoiceDate   DateTime       @default(now())

  items         BillItem[]
  payments      Payment[]

  @@index([tenantId, paymentStatus])
  @@index([patientId])
}

model BillItem {
  id          String   @id @default(uuid())
  billId      String
  bill        Bill     @relation(fields: [billId], references: [id], onDelete: Cascade)
  serviceType String   // Consultation, Lab, Pharmacy, Room
  description String
  unitPrice   Decimal  @db.Decimal(12, 2)
  quantity    Int      @default(1)
  lineTotal   Decimal  @db.Decimal(12, 2)

  @@index([billId])
}

model Payment {
  id             String   @id @default(uuid())
  billId         String
  bill           Bill     @relation(fields: [billId], references: [id], onDelete: Cascade)
  idempotencyKey String   @unique
  amountPaid     Decimal  @db.Decimal(12, 2)
  paymentMethod  String   // Cash, Card, Insurance, Transfer
  transactionRef String?
  paidAt         DateTime @default(now())

  @@index([idempotencyKey])
  @@index([billId])
}

model AuditLog {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  action    String
  resource  String
  recordId  String
  ipAddress String
  timestamp DateTime @default(now())

  @@index([tenantId, resource, recordId])
  @@index([timestamp])
}
4.2 Row-Level Security (RLS) SQL MigrationRun this script to enforce isolation at the database engine level, preventing any application bug from leaking cross-tenant records:SQL-- Enable Row Level Security on Core Tables
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MedicalRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Create Tenant Application Context Policy
CREATE POLICY patient_tenant_isolation_policy ON "Patient"
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY medical_record_tenant_isolation_policy ON "MedicalRecord"
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY bill_tenant_isolation_policy ON "Bill"
    AS RESTRICTIVE
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Principle of Least Privilege: Restrict App DB User
REVOKE ALL ON SCHEMA public FROM hms_app_user;
GRANT CONNECT ON DATABASE hms_production TO hms_app_user;
GRANT USAGE ON SCHEMA public TO hms_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hms_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hms_app_user;
-- Explicitly forbid DDL permissions
REVOKE CREATE, DROP, ALTER ON SCHEMA public FROM hms_app_user;
5. Security & Middleware Implementation5.1 Request Origin, Referer & Anti-CSRF MiddlewareEnsure all incoming state-mutating requests match the verified application domain and validate anti-CSRF tokens.   TypeScript// backend/src/middleware/securityHeaders.ts
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export function validateOriginAndReferer(req: Request, res: Response, next: NextFunction) {
  // Allow safe methods without CSRF checks
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.headers["origin"];
  const referer = req.headers["referer"];
  const trustedHost = new URL(env.APP_TRUSTED_ORIGIN).host;

  if (origin) {
    const originHost = new URL(origin).host;
    if (originHost !== trustedHost) {
      return res.status(403).json({ error: "Access Denied: Untrusted Origin" });
    }
  } else if (referer) {
    const refererHost = new URL(referer).host;
    if (refererHost !== trustedHost) {
      return res.status(403).json({ error: "Access Denied: Untrusted Referer" });
    }
  } else {
    // Block mutating requests missing both Origin and Referer headers
    return res.status(403).json({ error: "Access Denied: Missing Origin/Referer" });
  }

  next();
}
5.2 Content Security Policy (CSP) & Secure CookiesConfigure Express with Helmet to enforce zero inline script execution and strict session cookies:TypeScript// backend/src/middleware/helmetCsp.ts
import helmet from "helmet";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"], // Zero inline scripts. Strict framework bundle only.
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind CSS injected styles
      imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co"],
      connectSrc: ["'self'", "https://*.supabase.co"],
      fontSrc: ["'self'", "[https://fonts.gstatic.com](https://fonts.gstatic.com)"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
});
Cookie Policy Configuration:TypeScriptres.cookie("hms_session", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict", // Strictly isolates cookies from cross-site contexts
  maxAge: 15 * 60 * 1000, // 15-minute clinical workstation timeout
  path: "/",
});
5.3 Anti-IDOR (Insecure Direct Object Reference) & Tenant ScopingEliminate global state variable pollution. Every request attaches a dedicated context containing tenant and user metadata:TypeScript// backend/src/middleware/tenantContext.ts
import { Request, Response, NextFunction } from "express";
import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  tenantId: string;
  userId: string;
  role: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function tenantScopingMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || !user.tenantId) {
    return res.status(401).json({ error: "Unauthenticated: Missing tenant boundary" });
  }

  const context: RequestContext = {
    tenantId: user.tenantId,
    userId: user.id,
    role: user.role,
  };

  requestContext.run(context, () => {
    next();
  });
}
Enforcing Ownership Check in Controllers:TypeScriptexport async function getPatientMedicalRecord(req: Request, res: Response) {
  const ctx = requestContext.getStore();
  const { id: recordId } = req.params;

  // Direct object reference check scoped strictly by tenantId
  const record = await prisma.medicalRecord.findFirst({
    where: {
      id: recordId,
      tenantId: ctx?.tenantId, // Prevents accessing another hospital's or unauthorized patient's file
    },
    include: {
      patient: true,
    },
  });

  if (!record) {
    return res.status(404).json({ error: "Record not found or access unauthorized" });
  }

  return res.json(record);
}
5.4 Payment Webhook Hardening: HMAC Signatures, Idempotency & IP RestrictionStrict gatekeeping for all payment notifications to ensure transaction integrity:   TypeScript// backend/src/modules/billing/webhook.controller.ts
import { Request, Response } from "express";
import crypto from "crypto";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import redis from "../../config/redis";

export async function handlePaymentWebhook(req: Request, res: Response) {
  // 1. IP Range Restriction: Whitelist verification
  const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "";
  const normalizedIp = clientIp.split(",")[0].trim();

  if (!env.PAYMENT_GATEWAY_ALLOWED_IPS.includes(normalizedIp)) {
    return res.status(403).json({ error: "Forbidden: Untrusted Payment Gateway Origin" });
  }

  // 2. Cryptographic Signature Verification
  const signature = req.headers["x-payment-signature"] as string;
  const rawBody = (req as any).rawBody; // Captured prior to JSON parsing

  const expectedSignature = crypto
    .createHmac("sha256", env.PAYMENT_GATEWAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (!signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).json({ error: "Unauthorized: Invalid Webhook HMAC Signature" });
  }

  // 3. Idempotency Tracking: Prevent duplicate payment recordings
  const { eventId, billId, amount, transactionRef } = req.body;
  const idempotencyKey = `idempotency:payment:${eventId}`;

  const isDuplicate = await redis.set(idempotencyKey, "PROCESSING", "EX", 86400, "NX");
  if (!isDuplicate) {
    return res.status(200).json({ status: "Already Processed or In Flight" });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findUnique({ where: { id: billId } });
      if (!bill) throw new Error("Bill not found");

      await tx.payment.create({
        data: {
          billId,
          idempotencyKey: eventId,
          amountPaid: amount,
          paymentMethod: "Card",
          transactionRef,
        },
      });

      await tx.bill.update({
        where: { id: billId },
        data: { paymentStatus: "Paid" },
      });
    });

    await redis.set(idempotencyKey, "COMPLETED", "EX", 86400);
    return res.status(200).json({ status: "Payment Confirmed" });
  } catch (err: any) {
    await redis.del(idempotencyKey); // Clear lock on hard failure to allow gateway retry
    return res.status(500).json({ error: "Transaction processing failed" });
  }
}
5.5 File Upload Lockdown: Magic-Bytes, Size Limits & Execution PreventionMedical document upload endpoints must enforce strict content inspection and storage lockdowns:   TypeScript// backend/src/middleware/fileUpload.ts
import multer from "multer";
import { fromBuffer } from "file-type";
import { Request, Response, NextFunction } from "express";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  limits: { fileSize: MAX_SIZE },
  storage: multer.memoryStorage(), // In-memory inspection before disk or cloud dispatch
});

export const processMedicalFileUpload = [
  upload.single("medicalDocument"),
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Inspect real magic bytes (not trusting browser-supplied headers or extensions)
    const detectedType = await fromBuffer(req.file.buffer);
    if (!detectedType || !ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
      return res.status(400).json({
        error: "Invalid file payload. Only authenticated JPEG, PNG, and PDF files are allowed.",
      });
    }

    // Disallow executable content or script injections inside metadata
    req.file.mimetype = detectedType.mime;
    next();
  },
];
Storage Configuration: Store uploads directly into private cloud buckets configured with strict no-execution policies (Content-Disposition: attachment; filename="..."). Direct web execution of uploaded assets is prohibited.5.6 Input Sanitization & Anti-XSS (Zod + DOMPurify)All rich text (e.g., consultation summaries, diagnostic notes) must be sanitized before persistence, and validated against Zod schemas:   TypeScript// backend/src/utils/sanitizer.ts
import DOMPurify from "isomorphic-dompurify";

export function sanitizeRichText(dirtyHtml: string): string {
  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "ul", "ol", "li", "br"],
    ALLOWED_ATTR: [], // Strip all event handlers, hrefs, and styles
  });
}
TypeScript// backend/src/modules/emr/emr.schema.ts
import { z } from "zod";

export const CreateConsultationSchema = z.object({
  patientId: z.string().uuid(),
  diagnosis: z.string().min(3).max(500),
  clinicalNotes: z.string().min(5).max(10000),
  prescriptions: z.array(
    z.object({
      medicineId: z.string().uuid(),
      dosage: z.string().min(1),
      frequency: z.string().min(1),
      duration: z.string().min(1),
      quantity: z.number().int().positive(),
    })
  ),
});
5.7 Rate Limiting & DoS ShieldDeploy Redis-backed rate limiters on all public, authentication, and search routes to safeguard availability:   TypeScript// backend/src/middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redis from "../config/redis";

export const authRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => (redis as any).call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 failed attempts per IP
  message: { error: "Too many login attempts. Account locked for 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiGatewayRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => (redis as any).call(...args),
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // Max 120 requests/minute per authenticated client
  message: { error: "API rate limit exceeded. Backoff applied." },
});
6. High-Performance Query Architecture & Caching6.1 Strict Prohibition of N+1 QueriesDo not iterate through an array of records to execute child queries inside loops.Always query using relational include or explicit database JOIN commands.TypeScript// CORRECT: Single query execution via eager-loading
export async function getDoctorAppointmentsWithPatients(doctorId: string, date: Date) {
  return await prisma.appointment.findMany({
    where: {
      doctorId,
      appointmentDate: {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lte: new Date(date.setHours(23, 59, 59, 999)),
      },
    },
    include: {
      patient: {
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
          gender: true,
          dateOfBirth: true,
        },
      },
    },
    orderBy: { appointmentDate: "asc" },
  });
}
6.2 High-Speed Redis Caching LayerCache frequently read and rarely changed operational lookups (such as the medicine catalog, test master lists, and active doctor rosters) to minimize database load:   TypeScript// backend/src/modules/pharmacy/inventory.service.ts
import redis from "../../config/redis";
import { prisma } from "../../db/prisma";

export async function getCachedMedicineCatalog(tenantId: string) {
  const cacheKey = `tenant:${tenantId}:pharmacy:catalog`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached); // Sub-50ms cache response
  }

  const catalog = await prisma.pharmacyInventory.findMany({
    where: { stockQuantity: { gt: 0 } },
    orderBy: { medicineName: "asc" },
  });

  // Expire cache every 15 minutes; invalidate on every new stock intake
  await redis.set(cacheKey, JSON.stringify(catalog), "EX", 900);
  return catalog;
}
7. Frontend Integration & Guardrails7.1 Prevention of Infinite useEffect API LoopsNever supply unmemoized objects or functions as useEffect dependencies.Use React Query (@tanstack/react-query) with explicit query keys to handle caching and background updates automatically.TypeScript// frontend/src/features/dashboard/useDashboardData.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ["dashboard", "metrics"],
    queryFn: async () => {
      const { data } = await axios.get("/api/dashboard/summary");
      return data;
    },
    staleTime: 60 * 1000, // Data remains fresh for 60 seconds without background refetching
    refetchOnWindowFocus: false, // Prevents unintended API spikes on window focus
  });
}
7.2 Interactive Guided Walkthrough (React Joyride)Implement a guided onboarding workflow for clinical and cashier staff so new users understand daily procedures without confusion:   TypeScript// frontend/src/components/onboarding/StaffTour.tsx
import React, { useState } from "react";
import Joyride, { Step } from "react-joyride";

export const StaffOnboardingTour: React.FC = () => {
  const [runTour] = useState(() => !localStorage.getItem("hms_tour_completed"));

  const steps: Step[] = [
    {
      target: ".global-search-bar",
      content: "Locate any patient by entering their Medical Record Number (MRN), National ID, or Name.",
      disableBeacon: true,
    },
    {
      target: ".kpi-appointments-card",
      content: "Monitor active appointments, ongoing clinical examinations, and patient wait times.",
    },
    {
      target: ".quick-admission-btn",
      content: "Quickly admit emergency outpatients and allocate hospital ward beds.",
    },
    {
      target: ".pharmacy-alerts-panel",
      content: "Review inventory shortages and batches nearing expiry in real time.",
    },
  ];

  const handleTourEnd = () => {
    localStorage.setItem("hms_tour_completed", "true");
  };

  return (
    <Joyride callback="{(data)" continuous run="{runTour}" showProgress showSkipButton steps="{steps}"> {
        if (data.status === "finished" || data.status === "skipped") {
          handleTourEnd();
        }
      }}
      styles={{
        options: {
          primaryColor: "#0284C7", // Matches --primary-teal
          textColor: "#0F172A",    // Matches --primary-navy
          zIndex: 10000,
        },
      }}
    />
  );
};
8. Database Seeding & Sandbox DataPopulate the database with realistic medical, inventory, and user data to ensure the application starts with meaningful context instead of empty states:   TypeScript// backend/src/db/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Hospital Management System demo dataset...");

  // 1. Create Default Master Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "apexcare-main" },
    update: {},
    create: {
      name: "ApexCare Health Network",
      slug: "apexcare-main",
    },
  });

  // 2. Hash Default Password
  const passwordHash = await bcrypt.hash("ClinicalAdmin2026!", 12);

  // 3. Seed Primary User Roles
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      tenantId: tenant.id,
      username: "admin",
      fullName: "Dr. Arthur Vance",
      email: "arthur.vance@apexcare.org",
      passwordHash,
      role: "ADMIN",
    },
  });

  // 4. Seed Patients
  const patient = await prisma.patient.upsert({
    where: { mrn: "MRN-84920" },
    update: {},
    create: {
      tenantId: tenant.id,
      mrn: "MRN-84920",
      firstName: "Eleanor",
      lastName: "Vance",
      dateOfBirth: new Date("1984-04-12"),
      gender: "Female",
      bloodGroup: "O+",
      contactNumber: "+1-555-019-2831",
      allergies: ["Penicillin", "Latex"],
    },
  });

  // 5. Seed Pharmacy Inventory
  await prisma.pharmacyInventory.createMany({
    data: [
      {
        medicineName: "Amoxicillin Trihydrate",
        genericName: "Amoxicillin",
        category: "Antibiotic",
        stockQuantity: 120,
        reorderLevel: 200, // Trigger low stock alert
        unitPrice: 14.5,
        expiryDate: new Date("2026-11-30"),
        batchNumber: "BAT-AMX-091",
      },
      {
        medicineName: "Humalog Insulin 100U/mL",
        genericName: "Insulin Lispro",
        category: "Antidiabetic",
        stockQuantity: 15,
        reorderLevel: 20, // Trigger critical alert
        unitPrice: 48.0,
        expiryDate: new Date("2026-10-15"),
        batchNumber: "BAT-INS-402",
      },
    ],
  });

  console.log("Seeding complete: Master Tenant, Roles, Patients, and Inventory ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
9. Testing, Pre-Launch Verification & Disaster Recovery9.1 Pre-Launch Concurrency Load Testing (backend/tests/load/k6-test.js)Use k6 to verify system performance under load, confirming sub-second response times across 100+ concurrent simulated workstations:   JavaScriptimport http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 25 },  // Ramp-up to 25 clinical users
    { duration: "1m", target: 100 },  // Peak hospital shift load (100 concurrent users)
    { duration: "30s", target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<800"], // 95% of queries must resolve under 800ms
    http_req_failed: ["rate<0.01"],   // Error rates must stay below 1%
  },
};

export default function () {
  const params = {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer DEMO_JWT_SESSION_TOKEN",
    },
  };

  const res = http.get("http://localhost:5000/api/dashboard/summary", params);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "latency within safe limit": (r) => r.timings.duration < 800,
  });

  sleep(1);
}
9.2 Disaster Recovery & Automated Backup ProceduresIn compliance with Section 10 of the specification document:   Daily Automated Backup: Run incremental dumps of the PostgreSQL database every 24 hours at 01:00 UTC and dispatch encrypted snapshots to off-site cloud storage.   Bash#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/backups/hms_db_${TIMESTAMP}.dump"
pg_dump -U postgres -F c -b -v -f "${BACKUP_FILE}" hms_production
# Encrypt with AES-256 and sync to cloud storage vault
gpg --symmetric --cipher-algo AES256 "${BACKUP_FILE}"
aws s3 cp "${BACKUP_FILE}.gpg" s3://hms-medical-backups/daily/
rm "${BACKUP_FILE}" "${BACKUP_FILE}.gpg"
Weekly Full Cold Backup: Create a full structural snapshot and test database restoration on an isolated staging server every Sunday.   10. Step-by-Step Execution PlanFollow these phases sequentially to build and launch the platform:Step 1: Workspace & Secret Initialization
├── Initialize backend and frontend workspaces
├── Configure .env variables using the provided Zod schema
└── Spin up local PostgreSQL, PgBouncer, and Redis instances via docker-compose

Step 2: Database Schema & Migration Execution
├── Run `npx prisma migrate dev --name init_hms_core` to apply the database schema
├── Execute the Row-Level Security (RLS) SQL policies to enforce tenant isolation
└── Run `npx ts-node src/db/seed.ts` to populate the initial demo datasets

Step 3: Middleware & Security Hardening
├── Mount Helmet with strict Content Security Policy (CSP) headers
├── Implement Origin and Referer validation checks for mutating requests
├── Configure Redis-backed rate limiters on authentication and search endpoints
└── Register file upload middleware with magic-byte and file size verification

Step 4: Business Logic & API Development
├── Implement EMR consultation desk endpoints with input sanitization
├── Build the appointment scheduling matrix and doctor roster engine
├── Set up pharmacy inventory routes with automated stock/expiry triggers
└── Implement billing endpoints with webhook signature checks and idempotency locks

Step 5: Frontend Assembly (Google Stitch Assets)
├── Extract the Stitch ZIP assets and integrate design tokens from design.md
├── Connect React Query hooks with cache management to prevent infinite loops
└── Configure the React Joyride onboarding tour for first-time staff logins

Step 6: Pre-Launch Audits & Deployment
├── Execute OWASP security tests, verifying IDOR protection and input validation
├── Run k6 concurrency tests to confirm sub-second response times under load
└── Schedule automated daily database backups and verify restoration drills
```
