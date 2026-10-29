"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyChange = exports.realtimeHub = void 0;
const events_1 = require("events");
const store_js_1 = require("../../db/store.js");
class RealtimeHub extends events_1.EventEmitter {
    clients = new Set();
    telemetryTimer = null;
    heartbeatTimer = null;
    constructor() {
        super();
        this.startBackgroundStreaming();
    }
    registerClient(req, res) {
        // Standard Server-Sent Events headers
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        });
        res.write(": apexcare-live-stream-handshake\n\n");
        this.clients.add(res);
        // Initial connection acknowledgment
        const welcomePayload = {
            status: "LIVE_CONNECTED",
            timestamp: new Date().toISOString(),
            activeClients: this.clients.size,
            station: "ApexCare Central Clinical Telemetry Hub",
        };
        this.sendEventToResponse(res, "connected", welcomePayload);
        // Send immediate snapshot so frontend instantly has latest hospital metrics
        const snapshot = this.getTelemetrySnapshot();
        this.sendEventToResponse(res, "snapshot", snapshot);
        // Handle connection closure
        req.on("close", () => {
            this.clients.delete(res);
        });
        req.on("error", () => {
            this.clients.delete(res);
        });
    }
    getTelemetrySnapshot() {
        const activeApts = store_js_1.appointments.filter((a) => a.status === "Scheduled" || a.status === "In-Progress").length;
        const completedApts = store_js_1.appointments.filter((a) => a.status === "Completed").length;
        const urgentLabs = store_js_1.laboratoryTests.filter((l) => l.isStatUrgent && l.sampleStatus !== "Completed").length;
        const pendingLabs = store_js_1.laboratoryTests.filter((l) => l.sampleStatus !== "Completed").length;
        const pharmacyAlerts = store_js_1.pharmacyInventory.filter((m) => m.stockQuantity <= m.reorderLevel).length;
        const inpatientCount = store_js_1.patients.filter((p) => p.status?.toLowerCase().includes("admit") ||
            p.status?.toLowerCase().includes("icu") ||
            p.status?.toLowerCase().includes("inpatient")).length;
        const occupiedBeds = store_js_1.patients.filter((p) => p.wardBed && !p.wardBed.toLowerCase().includes("outpatient") && !p.wardBed.toLowerCase().includes("clinic")).length;
        const totalBeds = store_js_1.wardBedCensus?.totalBeds || 160;
        const occupancyPercentage = totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(1)) : 0;
        const paidBills = store_js_1.bills.filter((b) => b.paymentStatus === "Paid");
        const totalRevenue = paidBills.reduce((acc, b) => acc + (b.netPayable || 0), 0);
        return {
            timestamp: new Date().toISOString(),
            liveSync: true,
            activeClients: this.clients.size,
            kpis: {
                totalPatients: store_js_1.patients.length,
                inpatientCount,
                outpatientCount: Math.max(0, store_js_1.patients.length - inpatientCount),
                appointments: {
                    total: store_js_1.appointments.length,
                    active: activeApts,
                    completed: completedApts,
                },
                laboratory: {
                    total: store_js_1.laboratoryTests.length,
                    urgent: urgentLabs,
                    pending: pendingLabs,
                },
                pharmacy: {
                    totalItems: store_js_1.pharmacyInventory.length,
                    alerts: pharmacyAlerts,
                },
                bedOccupancy: {
                    occupied: occupiedBeds,
                    total: totalBeds,
                    percentage: occupancyPercentage,
                },
                revenueToday: totalRevenue,
                latestAudit: store_js_1.auditLogs.length > 0 ? store_js_1.auditLogs[0] : null,
            },
        };
    }
    notifyChange(entity, action, data) {
        const payload = {
            entity,
            action,
            data,
            timestamp: new Date().toISOString(),
            snapshot: this.getTelemetrySnapshot(),
        };
        this.emit("change", payload);
        this.broadcast("data_change", payload);
    }
    broadcast(event, data) {
        if (this.clients.size === 0)
            return;
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        for (const client of this.clients) {
            try {
                client.write(message);
            }
            catch (_err) {
                this.clients.delete(client);
            }
        }
    }
    startBackgroundStreaming() {
        // 1. Broadcast continuous hospital operational telemetry every 3 seconds
        if (!this.telemetryTimer) {
            this.telemetryTimer = setInterval(() => {
                if (this.clients.size > 0) {
                    const snapshot = this.getTelemetrySnapshot();
                    this.broadcast("telemetry", snapshot);
                }
            }, 3000);
        }
        // 2. Keep-alive heartbeat comment every 15 seconds
        if (!this.heartbeatTimer) {
            this.heartbeatTimer = setInterval(() => {
                for (const client of this.clients) {
                    try {
                        client.write(": keepalive\n\n");
                    }
                    catch (_err) {
                        this.clients.delete(client);
                    }
                }
            }, 15000);
        }
    }
    sendEventToResponse(res, event, data) {
        try {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        }
        catch (_err) {
            this.clients.delete(res);
        }
    }
    getClientCount() {
        return this.clients.size;
    }
}
exports.realtimeHub = new RealtimeHub();
exports.notifyChange = exports.realtimeHub.notifyChange.bind(exports.realtimeHub);
