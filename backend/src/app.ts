import express, { Request, Response } from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { securityHeaders } from "./middleware/helmetCsp.js";
import { validateOriginAndReferer, isOriginAllowed } from "./middleware/securityHeaders.js";
import { authMiddleware, tenantScopingMiddleware } from "./middleware/tenantContext.js";
import { apiGatewayRateLimiter } from "./middleware/rateLimiter.js";
import { createModuleBoundary, createDiagnosticsRouter } from "./modules/moduleRegistry.js";

// Domain Routers
import { authRouter } from "./modules/auth/auth.router.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.router.js";
import { patientsRouter } from "./modules/patients/patients.router.js";
import { emrRouter } from "./modules/emr/emr.router.js";
import { appointmentsRouter } from "./modules/appointments/appointments.router.js";
import { laboratoryRouter } from "./modules/laboratory/laboratory.router.js";
import { pharmacyRouter } from "./modules/pharmacy/pharmacy.router.js";
import { billingRouter } from "./modules/billing/billing.router.js";
import { staffRouter } from "./modules/staff/staff.router.js";
import { reportsRouter } from "./modules/reports/reports.router.js";
import { auditRouter } from "./modules/audit/audit.router.js";
import { realtimeRouter } from "./modules/realtime/realtime.router.js";

const app = express();

// 1. Security Headers (Helmet CSP, HSTS, X-Content-Type-Options)
app.use(securityHeaders);

// 2. Dynamic CORS Configuration for GitHub Pages, Vercel & Localhost
app.use(
  cors({
    origin: (requestOrigin, callback) => {
      // Allow server-to-server or tools with no origin
      if (!requestOrigin) return callback(null, true);

      if (isOriginAllowed(requestOrigin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Payment-Signature", "X-Requested-With"],
  })
);

// 3. Body Parsers with Raw Body Capture for HMAC Verification
app.use(
  express.json({
    limit: "10mb",
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as any).rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. Origin & Anti-CSRF Verification
app.use(validateOriginAndReferer);

// 5. Rate Limiter on API Gateway
app.use("/api", apiGatewayRateLimiter);

// 6. Central Health & Modular Diagnostics Telemetry Router
app.use("/api/health", createDiagnosticsRouter());

// 7. Realtime Streaming Events & Telemetry Pipeline (SSE & Instant Sync)
app.use("/api/events", realtimeRouter);
app.use("/api/realtime", realtimeRouter);

// =========================================================================
// ISOLATED DOMAIN MODULES WITH FAULT BOUNDARIES & CIRCUIT BREAKERS
// If any module fails or throws an unhandled error, its boundary intercepts it,
// marks that specific module as degraded, and returns an isolated response.
// ALL OTHER MODULES REMAIN FULLY OPERATIONAL.
// =========================================================================

// Module: Authentication & Identity Management (Public)
const authBoundary = createModuleBoundary("auth");
app.use("/api/auth", authBoundary.boundaryMiddleware, authRouter, authBoundary.errorHandler);

// Protected Clinical & Operational Routes (Attached with Auth & Tenant Scoping)
app.use(authMiddleware);
app.use(tenantScopingMiddleware);

// Module: Operations Dashboard
const dashboardBoundary = createModuleBoundary("dashboard");
app.use("/api/dashboard", dashboardBoundary.boundaryMiddleware, dashboardRouter, dashboardBoundary.errorHandler);

// Module: Patients Registry & Master Demographics
const patientsBoundary = createModuleBoundary("patients");
app.use("/api/patients", patientsBoundary.boundaryMiddleware, patientsRouter, patientsBoundary.errorHandler);

// Module: Clinical Consultation EMR Desk
const emrBoundary = createModuleBoundary("emr");
app.use("/api/emr", emrBoundary.boundaryMiddleware, emrRouter, emrBoundary.errorHandler);

// Module: Appointments Scheduling & Outpatient Matrix
const appointmentsBoundary = createModuleBoundary("appointments");
app.use("/api/appointments", appointmentsBoundary.boundaryMiddleware, appointmentsRouter, appointmentsBoundary.errorHandler);

// Module: Diagnostic Laboratory & Pathology
const labBoundary = createModuleBoundary("laboratory");
app.use("/api/laboratory", labBoundary.boundaryMiddleware, laboratoryRouter, labBoundary.errorHandler);

// Module: Pharmacy & Formulary Inventory
const pharmacyBoundary = createModuleBoundary("pharmacy");
app.use("/api/pharmacy", pharmacyBoundary.boundaryMiddleware, pharmacyRouter, pharmacyBoundary.errorHandler);

// Module: Billing, Invoicing & POS Payments (Fault-isolated as requested)
const billingBoundary = createModuleBoundary("billing");
app.use("/api/billing", billingBoundary.boundaryMiddleware, billingRouter, billingBoundary.errorHandler);

// Module: Staff & Clinical Roster Administration
const staffBoundary = createModuleBoundary("staff");
app.use("/api/staff", staffBoundary.boundaryMiddleware, staffRouter, staffBoundary.errorHandler);

// Module: Executive Reports & Analytics
const reportsBoundary = createModuleBoundary("reports");
app.use("/api/reports", reportsBoundary.boundaryMiddleware, reportsRouter, reportsBoundary.errorHandler);

// Module: Security Audit Trail & Governance
const auditBoundary = createModuleBoundary("audit");
app.use("/api/audit-logs", auditBoundary.boundaryMiddleware, auditRouter, auditBoundary.errorHandler);

// Global 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint not found on ApexCare HMS server" });
});

// Global fallback error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error("Unhandled Global API Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: env.NODE_ENV === "development" ? err.message : "An unexpected server condition occurred",
  });
});

export default app;
export { app };

