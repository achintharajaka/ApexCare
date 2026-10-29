"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realtimeRouter = void 0;
const express_1 = require("express");
const realtime_service_js_1 = require("./realtime.service.js");
exports.realtimeRouter = (0, express_1.Router)();
// 1. Primary Server-Sent Events (SSE) Stream
exports.realtimeRouter.get("/events", (req, res) => {
    realtime_service_js_1.realtimeHub.registerClient(req, res);
});
// Alias for root of /api/events
exports.realtimeRouter.get("/", (req, res) => {
    realtime_service_js_1.realtimeHub.registerClient(req, res);
});
// 2. Immediate Telemetry Snapshot REST endpoint
exports.realtimeRouter.get("/snapshot", (_req, res) => {
    res.json(realtime_service_js_1.realtimeHub.getTelemetrySnapshot());
});
// 3. Status and Telemetry Health Check
exports.realtimeRouter.get("/status", (_req, res) => {
    res.json({
        status: "HEALTHY",
        streaming: true,
        connectedClients: realtime_service_js_1.realtimeHub.getClientCount(),
        timestamp: new Date().toISOString(),
    });
});
