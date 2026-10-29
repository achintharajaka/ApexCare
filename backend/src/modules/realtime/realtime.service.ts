import { Request, Response } from "express";
import { EventEmitter } from "events";
import {
  patients,
  appointments,
  laboratoryTests,
  pharmacyInventory,
  bills,
  wardBedCensus,
  auditLogs,
} from "../../db/store.js";

class RealtimeHub extends EventEmitter {
  private clients: Set<Response> = new Set();
  private telemetryTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startBackgroundStreaming();
  }

  public registerClient(req: Request, res: Response): void {
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

  public getTelemetrySnapshot() {
    const activeApts = appointments.filter((a) => a.status === "Scheduled" || a.status === "In-Progress").length;
    const completedApts = appointments.filter((a) => a.status === "Completed").length;
    const urgentLabs = laboratoryTests.filter((l) => l.isStatUrgent && l.sampleStatus !== "Completed").length;
    const pendingLabs = laboratoryTests.filter((l) => l.sampleStatus !== "Completed").length;
    const pharmacyAlerts = pharmacyInventory.filter((m) => m.stockQuantity <= m.reorderLevel).length;

    const inpatientCount = patients.filter(
      (p) =>
        p.status?.toLowerCase().includes("admit") ||
        p.status?.toLowerCase().includes("icu") ||
        p.status?.toLowerCase().includes("inpatient")
    ).length;

    const occupiedBeds = patients.filter(
      (p) => p.wardBed && !p.wardBed.toLowerCase().includes("outpatient") && !p.wardBed.toLowerCase().includes("clinic")
    ).length;

    const totalBeds = wardBedCensus?.totalBeds || 160;
    const occupancyPercentage = totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(1)) : 0;

    const paidBills = bills.filter((b) => b.paymentStatus === "Paid");
    const totalRevenue = paidBills.reduce((acc, b) => acc + (b.netPayable || 0), 0);

    return {
      timestamp: new Date().toISOString(),
      liveSync: true,
      activeClients: this.clients.size,
      kpis: {
        totalPatients: patients.length,
        inpatientCount,
        outpatientCount: Math.max(0, patients.length - inpatientCount),
        appointments: {
          total: appointments.length,
          active: activeApts,
          completed: completedApts,
        },
        laboratory: {
          total: laboratoryTests.length,
          urgent: urgentLabs,
          pending: pendingLabs,
        },
        pharmacy: {
          totalItems: pharmacyInventory.length,
          alerts: pharmacyAlerts,
        },
        bedOccupancy: {
          occupied: occupiedBeds,
          total: totalBeds,
          percentage: occupancyPercentage,
        },
        revenueToday: totalRevenue,
        latestAudit: auditLogs.length > 0 ? auditLogs[0] : null,
      },
    };
  }

  public notifyChange(entity: string, action: string, data?: any): void {
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

  public broadcast(event: string, data: any): void {
    if (this.clients.size === 0) return;

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(message);
      } catch (_err) {
        this.clients.delete(client);
      }
    }
  }

  private startBackgroundStreaming(): void {
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
          } catch (_err) {
            this.clients.delete(client);
          }
        }
      }, 15000);
    }
  }

  private sendEventToResponse(res: Response, event: string, data: any): void {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (_err) {
      this.clients.delete(res);
    }
  }

  public getClientCount(): number {
    return this.clients.size;
  }
}

export const realtimeHub = new RealtimeHub();
export const notifyChange = realtimeHub.notifyChange.bind(realtimeHub);

