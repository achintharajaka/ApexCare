import { Router, Request, Response } from "express";
import { auditLogs } from "../../db/store.js";

export const auditRouter = Router();

auditRouter.get("/", (_req: Request, res: Response) => {
  return res.json(auditLogs);
});
