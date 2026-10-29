"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moduleRegistry = void 0;
exports.createModuleBoundary = createModuleBoundary;
exports.createDiagnosticsRouter = createDiagnosticsRouter;
const express_1 = require("express");
const store_js_1 = require("../db/store.js");
const CIRCUIT_FAILURE_THRESHOLD = 5; // Trip circuit after 5 consecutive uncaught errors
const CIRCUIT_COOLDOWN_MS = 30000; // 30 seconds before attempting HALF_OPEN self-healing
// Registry of all segregated modules
exports.moduleRegistry = {
    auth: {
        key: "auth",
        name: "Authentication & Role Security",
        description: "JWT session governance, Singlish role authentication, and password security",
        criticality: "HIGH",
        status: "HEALTHY",
        circuitState: "CLOSED",
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        consecutiveFailures: 0,
    },
    dashboard: {
        key: "dashboard",
        name: "Operations Dashboard",
        description: "Real-time clinical metrics, bed census, and queue telemetry",
        criticality: "MEDIUM",
        status: "HEALTHY",
        circuitState: "CLOSED",
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        consecutiveFailures: 0,
    },
    patients: {
        key: "patients",
        name: "Patient Registry & Master Demographics",
        description: "MRN directory, patient admissions, and biodata management",
        criticality: "HIGH",
        status: "HEALTHY",
        circuitState: "CLOSED",
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        consecutiveFailures: 0,
    },
    emr: {
        key: "emr",
        name: "Clinical Consultation EMR Desk",
        description: "Physician SOAP consultation notes, clinical history, and patient chart vault",
        criticality: "HIGH",
        status: "HEALTHY",
        circuitState: "CLOSED",
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        consecutiveFailures: 0,
    },
    appointments: {
        key: "appointments",
        name: "Outpatient Scheduling & Roster Matrix",
        description: "Consultation slots, departmental rosters, and clinic schedule management",
        criticality: "HIGH",
        status: "HEALTHY",
        circuitState: "CLOSED",
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        consecutiveFailures: 0,
    },
    laboratory: {
        key: "laboratory",
        name: "Diagnostic Laboratory & Assay Analytics",
        description: "4-stage diagnostic pathology workflow, specimen barcoding, and assay sign-off",
        criticality: "HIGH",
        status: "HEALTHY",
        circuitState: "CLOSED",
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        consecutiveFailures: 0,
    },
    pharmacy: {
        key: "pharmacy",
        name: "Formulary Inventory & Dispensary Queue",
        description: "Pharmaceutical stock batches, auto-deduction, and e-prescription fulfillment",
        criticality: "HIGH",
        status: "HEALTHY",
        circuitState: "CLOSED",
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        consecutiveFailures: 0,
    },
    billing: {
        key: "billing",
        name: "Billing, Invoicing & POS Settlement",
        description: "Itemized service charges, insurance subsidies, cash drawer, and official receipts",
        criticality: "HIGH",
        status: "HEALTHY",
        circuitState: "CLOSED",
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        consecutiveFailures: 0,
    },
    staff: {
        key: "staff",
        name: "Staff & Clinical Roster Administration",
        description: "Personnel directory, duty shifts, and leave authorization",
        criticality: "MEDIUM",
        status: "HEALTHY",
        circuitState: "CLOSED",
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        consecutiveFailures: 0,
    },
    reports: {
        key: "reports",
        name: "Executive Reporting & Business Intelligence",
        description: "Financial throughput, quality metrics, and departmental audits",
        criticality: "LOW",
        status: "HEALTHY",
        circuitState: "CLOSED",
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        consecutiveFailures: 0,
    },
    audit: {
        key: "audit",
        name: "Security Audit Trail & Governance",
        description: "Immutable HIPAA & ISO 27001 compliance logs and security traces",
        criticality: "MEDIUM",
        status: "HEALTHY",
        circuitState: "CLOSED",
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        consecutiveFailures: 0,
    },
};
/**
 * Creates an Isolated Module Error Boundary & Circuit Breaker Middleware.
 * Wraps routes within a module so any unexpected error or degradation is quarantined
 * without affecting the rest of the HMS platform.
 */
function createModuleBoundary(moduleKey) {
    const mod = exports.moduleRegistry[moduleKey];
    if (!mod) {
        throw new Error(`ApexCare Modular System: Unknown module key "${moduleKey}"`);
    }
    // Pre-dispatch circuit breaker check
    const boundaryMiddleware = (req, res, next) => {
        mod.totalRequests++;
        // Simulated failure for fault-isolation testing
        if (mod.simulatedFailure) {
            return res.status(503).json({
                status: "error",
                module: mod.key,
                code: "MODULE_SIMULATED_DEGRADATION",
                message: `The ${mod.name} module is currently simulating an isolated failure for diagnostic verification.`,
                diagnostic: {
                    moduleKey: mod.key,
                    status: "DEGRADED",
                    isolated: true,
                    otherModulesOperational: true,
                },
            });
        }
        // Circuit Breaker Evaluation
        if (mod.circuitState === "OPEN") {
            const now = Date.now();
            if (mod.circuitTrippedAt && now - mod.circuitTrippedAt > CIRCUIT_COOLDOWN_MS) {
                // Attempt self-healing half-open trial
                mod.circuitState = "HALF_OPEN";
                console.log(`🩺 ApexCare Self-Healing: Module "${mod.name}" entering HALF_OPEN trial.`);
            }
            else {
                // Circuit is open - fast fail with isolated degradation notice
                return res.status(503).json({
                    status: "error",
                    module: mod.key,
                    code: "MODULE_CIRCUIT_OPEN",
                    message: `The ${mod.name} module is temporarily isolated due to recurring faults. All other hospital modules remain fully operational.`,
                    diagnostic: {
                        moduleKey: mod.key,
                        status: mod.status,
                        circuitState: mod.circuitState,
                        lastIncidentId: mod.lastIncidentId,
                        lastFailureTime: mod.lastFailureTime,
                        cooldownRemainingSeconds: mod.circuitTrippedAt
                            ? Math.max(0, Math.ceil((CIRCUIT_COOLDOWN_MS - (now - mod.circuitTrippedAt)) / 1000))
                            : 0,
                        otherModulesOperational: true,
                    },
                });
            }
        }
        // Intercept response finish to track success
        res.on("finish", () => {
            if (res.statusCode < 500) {
                mod.successfulRequests++;
                if (mod.circuitState === "HALF_OPEN") {
                    mod.circuitState = "CLOSED";
                    mod.status = "HEALTHY";
                    mod.consecutiveFailures = 0;
                    console.log(`✅ ApexCare Self-Healing: Module "${mod.name}" successfully recovered to HEALTHY.`);
                }
            }
        });
        next();
    };
    // Post-dispatch module error handler
    const errorHandler = (err, req, res, _next) => {
        mod.failedRequests++;
        mod.consecutiveFailures++;
        mod.lastFailureTime = new Date().toISOString();
        mod.lastErrorMessage = err?.message || "Unknown internal error";
        mod.status = "DEGRADED";
        const incidentId = `INC-${mod.key.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        mod.lastIncidentId = incidentId;
        if (mod.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
            mod.circuitState = "OPEN";
            mod.circuitTrippedAt = Date.now();
            mod.status = "OFFLINE";
            console.error(`🚨 ApexCare Circuit Breaker Tripped! Quarantining module "${mod.name}" (${incidentId}).`);
        }
        // Log diagnostic audit entry
        try {
            (0, store_js_1.logAudit)("MODULE_FAULT_ISOLATED", mod.name, incidentId, req.user?.id || "system", req.ip || "127.0.0.1");
        }
        catch (_) { }
        console.error(`[ApexCare Isolated Module Error - ${mod.name}] Incident: ${incidentId}`, err);
        return res.status(500).json({
            status: "error",
            module: mod.key,
            code: "MODULE_INTERNAL_ERROR",
            message: `An isolated error occurred inside the ${mod.name} module. Other clinical systems remain unaffected.`,
            incidentId,
            diagnostic: {
                moduleKey: mod.key,
                status: mod.status,
                consecutiveFailures: mod.consecutiveFailures,
                otherModulesOperational: true,
            },
        });
    };
    return { boundaryMiddleware, errorHandler };
}
/**
 * Creates the Diagnostic & Health Router to inspect individual modules.
 */
function createDiagnosticsRouter() {
    const router = (0, express_1.Router)();
    // GET /api/health - Overall System & Cryptographic Health
    router.get("/", (_req, res) => {
        const modulesArray = Object.values(exports.moduleRegistry);
        const degradedModules = modulesArray.filter((m) => m.status !== "HEALTHY");
        const systemStatus = degradedModules.length === 0 ? "HEALTHY" : "DEGRADED";
        return res.json({
            status: systemStatus,
            service: "ApexCare HMS Precision Healthcare Core API",
            version: "1.0.0",
            architecture: "Modular Fault-Isolated Microkernel",
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.floor(process.uptime()),
            encryption: {
                ...store_js_1.storageEncryptionStatus,
                activeKeyLengthBits: 256,
                authenticatedGcm: true,
            },
            summary: {
                totalModules: modulesArray.length,
                healthyModules: modulesArray.length - degradedModules.length,
                degradedModules: degradedModules.map((m) => m.key),
            },
            infrastructure: {
                serverlessDetected: Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
                renderDetected: Boolean(process.env.RENDER),
                runtime: process.env.RENDER
                    ? "Render.com Container Web Service"
                    : process.env.VERCEL
                        ? "Vercel Serverless Function"
                        : "Node.js Standard Host",
            },
        });
    });
    // GET /api/health/modules - Detailed per-module diagnostics
    router.get("/modules", (_req, res) => {
        return res.json({
            timestamp: new Date().toISOString(),
            modules: exports.moduleRegistry,
        });
    });
    // POST /api/health/modules/:key/reset - Manually reset a degraded module
    router.post("/modules/:key/reset", (req, res) => {
        const key = String(req.params.key);
        const mod = exports.moduleRegistry[key];
        if (!mod) {
            return res.status(404).json({ error: "Module not found in registry" });
        }
        mod.status = "HEALTHY";
        mod.circuitState = "CLOSED";
        mod.consecutiveFailures = 0;
        mod.simulatedFailure = false;
        mod.lastErrorMessage = undefined;
        return res.json({
            message: `Module "${mod.name}" was successfully restored to HEALTHY.`,
            module: mod,
        });
    });
    // POST /api/health/modules/:key/simulate-failure - Test fault isolation
    router.post("/modules/:key/simulate-failure", (req, res) => {
        const key = String(req.params.key);
        const mod = exports.moduleRegistry[key];
        if (!mod) {
            return res.status(404).json({ error: "Module not found in registry" });
        }
        const enable = req.body?.enable !== false;
        mod.simulatedFailure = enable;
        mod.status = enable ? "DEGRADED" : "HEALTHY";
        return res.json({
            message: enable
                ? `Simulated failure enabled for module "${mod.name}". Verify that all other modules still respond normally!`
                : `Simulated failure cleared for module "${mod.name}".`,
            module: mod,
        });
    });
    return router;
}
