"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_js_1 = require("./config/env.js");
const helmetCsp_js_1 = require("./middleware/helmetCsp.js");
const securityHeaders_js_1 = require("./middleware/securityHeaders.js");
const tenantContext_js_1 = require("./middleware/tenantContext.js");
const rateLimiter_js_1 = require("./middleware/rateLimiter.js");
const moduleRegistry_js_1 = require("./modules/moduleRegistry.js");
// Domain Routers
const auth_router_js_1 = require("./modules/auth/auth.router.js");
const dashboard_router_js_1 = require("./modules/dashboard/dashboard.router.js");
const patients_router_js_1 = require("./modules/patients/patients.router.js");
const emr_router_js_1 = require("./modules/emr/emr.router.js");
const appointments_router_js_1 = require("./modules/appointments/appointments.router.js");
const laboratory_router_js_1 = require("./modules/laboratory/laboratory.router.js");
const pharmacy_router_js_1 = require("./modules/pharmacy/pharmacy.router.js");
const billing_router_js_1 = require("./modules/billing/billing.router.js");
const staff_router_js_1 = require("./modules/staff/staff.router.js");
const reports_router_js_1 = require("./modules/reports/reports.router.js");
const audit_router_js_1 = require("./modules/audit/audit.router.js");
const realtime_router_js_1 = require("./modules/realtime/realtime.router.js");
const app = (0, express_1.default)();
exports.app = app;
// 1. Security Headers (Helmet CSP, HSTS, X-Content-Type-Options)
app.use(helmetCsp_js_1.securityHeaders);
// 2. Dynamic CORS Configuration for GitHub Pages, Vercel & Localhost
app.use((0, cors_1.default)({
    origin: (requestOrigin, callback) => {
        // Allow server-to-server or tools with no origin
        if (!requestOrigin)
            return callback(null, true);
        if ((0, securityHeaders_js_1.isOriginAllowed)(requestOrigin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Payment-Signature", "X-Requested-With"],
}));
// 3. Body Parsers with Raw Body Capture for HMAC Verification
app.use(express_1.default.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
        req.rawBody = buf.toString();
    },
}));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
// 4. Origin & Anti-CSRF Verification
app.use(securityHeaders_js_1.validateOriginAndReferer);
// 5. Rate Limiter on API Gateway
app.use("/api", rateLimiter_js_1.apiGatewayRateLimiter);
// 6. Central Health & Modular Diagnostics Telemetry Router
app.use("/api/health", (0, moduleRegistry_js_1.createDiagnosticsRouter)());
// 7. Realtime Streaming Events & Telemetry Pipeline (SSE & Instant Sync)
app.use("/api/events", realtime_router_js_1.realtimeRouter);
app.use("/api/realtime", realtime_router_js_1.realtimeRouter);
// =========================================================================
// ISOLATED DOMAIN MODULES WITH FAULT BOUNDARIES & CIRCUIT BREAKERS
// If any module fails or throws an unhandled error, its boundary intercepts it,
// marks that specific module as degraded, and returns an isolated response.
// ALL OTHER MODULES REMAIN FULLY OPERATIONAL.
// =========================================================================
// Module: Authentication & Identity Management (Public)
const authBoundary = (0, moduleRegistry_js_1.createModuleBoundary)("auth");
app.use("/api/auth", authBoundary.boundaryMiddleware, auth_router_js_1.authRouter, authBoundary.errorHandler);
// Protected Clinical & Operational Routes (Attached with Auth & Tenant Scoping)
app.use(tenantContext_js_1.authMiddleware);
app.use(tenantContext_js_1.tenantScopingMiddleware);
// Module: Operations Dashboard
const dashboardBoundary = (0, moduleRegistry_js_1.createModuleBoundary)("dashboard");
app.use("/api/dashboard", dashboardBoundary.boundaryMiddleware, dashboard_router_js_1.dashboardRouter, dashboardBoundary.errorHandler);
// Module: Patients Registry & Master Demographics
const patientsBoundary = (0, moduleRegistry_js_1.createModuleBoundary)("patients");
app.use("/api/patients", patientsBoundary.boundaryMiddleware, patients_router_js_1.patientsRouter, patientsBoundary.errorHandler);
// Module: Clinical Consultation EMR Desk
const emrBoundary = (0, moduleRegistry_js_1.createModuleBoundary)("emr");
app.use("/api/emr", emrBoundary.boundaryMiddleware, emr_router_js_1.emrRouter, emrBoundary.errorHandler);
// Module: Appointments Scheduling & Outpatient Matrix
const appointmentsBoundary = (0, moduleRegistry_js_1.createModuleBoundary)("appointments");
app.use("/api/appointments", appointmentsBoundary.boundaryMiddleware, appointments_router_js_1.appointmentsRouter, appointmentsBoundary.errorHandler);
// Module: Diagnostic Laboratory & Pathology
const labBoundary = (0, moduleRegistry_js_1.createModuleBoundary)("laboratory");
app.use("/api/laboratory", labBoundary.boundaryMiddleware, laboratory_router_js_1.laboratoryRouter, labBoundary.errorHandler);
// Module: Pharmacy & Formulary Inventory
const pharmacyBoundary = (0, moduleRegistry_js_1.createModuleBoundary)("pharmacy");
app.use("/api/pharmacy", pharmacyBoundary.boundaryMiddleware, pharmacy_router_js_1.pharmacyRouter, pharmacyBoundary.errorHandler);
// Module: Billing, Invoicing & POS Payments (Fault-isolated as requested)
const billingBoundary = (0, moduleRegistry_js_1.createModuleBoundary)("billing");
app.use("/api/billing", billingBoundary.boundaryMiddleware, billing_router_js_1.billingRouter, billingBoundary.errorHandler);
// Module: Staff & Clinical Roster Administration
const staffBoundary = (0, moduleRegistry_js_1.createModuleBoundary)("staff");
app.use("/api/staff", staffBoundary.boundaryMiddleware, staff_router_js_1.staffRouter, staffBoundary.errorHandler);
// Module: Executive Reports & Analytics
const reportsBoundary = (0, moduleRegistry_js_1.createModuleBoundary)("reports");
app.use("/api/reports", reportsBoundary.boundaryMiddleware, reports_router_js_1.reportsRouter, reportsBoundary.errorHandler);
// Module: Security Audit Trail & Governance
const auditBoundary = (0, moduleRegistry_js_1.createModuleBoundary)("audit");
app.use("/api/audit-logs", auditBoundary.boundaryMiddleware, audit_router_js_1.auditRouter, auditBoundary.errorHandler);
// Global 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: "Endpoint not found on ApexCare HMS server" });
});
// Global fallback error handler
app.use((err, _req, res, _next) => {
    console.error("Unhandled Global API Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: env_js_1.env.NODE_ENV === "development" ? err.message : "An unexpected server condition occurred",
    });
});
exports.default = app;
