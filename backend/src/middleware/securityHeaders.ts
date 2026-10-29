import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

function isOriginAllowed(originUrl: string): boolean {
  try {
    const url = new URL(originUrl);
    const host = url.host.toLowerCase();

    // 1. Local development origins
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return true;
    }

    // 2. Official GitHub Pages hosting domains (*.github.io)
    if (host.endsWith(".github.io") || host === "github.io") {
      return true;
    }

    // 3. Official Render hosting domains (*.onrender.com) and Vercel (*.vercel.app)
    if (host.endsWith(".onrender.com") || host === "onrender.com" || host.endsWith(".vercel.app") || host === "vercel.app") {
      return true;
    }

    // 4. Configured trusted origin
    if (env.APP_TRUSTED_ORIGIN) {
      const trustedHost = new URL(env.APP_TRUSTED_ORIGIN).host.toLowerCase();
      if (host === trustedHost) return true;
    }

    // 5. Explicit FRONTEND_URL environment variable
    if (env.FRONTEND_URL) {
      const frontendHost = new URL(env.FRONTEND_URL).host.toLowerCase();
      if (host === frontendHost) return true;
    }

    // 6. Comma-separated CORS_ALLOWED_ORIGINS list
    if (env.CORS_ALLOWED_ORIGINS) {
      const allowedList = env.CORS_ALLOWED_ORIGINS.split(",").map((s) => s.trim().toLowerCase());
      for (const item of allowedList) {
        if (!item) continue;
        try {
          const itemHost = item.startsWith("http") ? new URL(item).host : item;
          if (host === itemHost || host.endsWith(`.${itemHost}`)) return true;
        } catch (_) {}
      }
    }

    return false;
  } catch {
    return false;
  }
}

export function validateOriginAndReferer(req: Request, res: Response, next: NextFunction) {
  // Allow safe HTTP methods without CSRF checks
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // If in development mode, relax strict origin checks for easy developer tools and curl testing
  if (env.NODE_ENV === "development") {
    return next();
  }

  const origin = req.headers["origin"];
  const referer = req.headers["referer"];

  if (origin) {
    if (!isOriginAllowed(origin)) {
      return res.status(403).json({
        error: "Access Denied: Untrusted Origin",
        origin,
        hint: "Add this domain to CORS_ALLOWED_ORIGINS or FRONTEND_URL in environment settings.",
      });
    }
  } else if (referer) {
    if (!isOriginAllowed(referer)) {
      return res.status(403).json({
        error: "Access Denied: Untrusted Referer",
        referer,
        hint: "Add this domain to CORS_ALLOWED_ORIGINS or FRONTEND_URL in environment settings.",
      });
    }
  } else {
    // In serverless cloud environments, API clients or server-to-server health requests might omit origin/referer
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(403).json({ error: "Access Denied: Missing Origin/Referer" });
    }
  }

  next();
}

export { isOriginAllowed };
