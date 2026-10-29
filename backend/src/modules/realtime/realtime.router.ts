import { Router, Request, Response } from "express";
import { realtimeHub } from "./realtime.service.js";

export const realtimeRouter = Router();

// 1. Primary Server-Sent Events (SSE) Stream
realtimeRouter.get("/events", (req: Request, res: Response) => {
  realtimeHub.registerClient(req, res);
});

// Alias for root of /api/events
realtimeRouter.get("/", (req: Request, res: Response) => {
  realtimeHub.registerClient(req, res);
});

// 2. Immediate Telemetry Snapshot REST endpoint
realtimeRouter.get("/snapshot", (_req: Request, res: Response) => {
  res.json(realtimeHub.getTelemetrySnapshot());
});

// 3. Status and Telemetry Health Check
realtimeRouter.get("/status", (_req: Request, res: Response) => {
  res.json({
    status: "HEALTHY",
    streaming: true,
    connectedClients: realtimeHub.getClientCount(),
    timestamp: new Date().toISOString(),
  });
});

