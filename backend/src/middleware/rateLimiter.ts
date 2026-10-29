import rateLimit from "express-rate-limit";

// Auth route rate limiter (max 30 attempts per 15 minutes)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Relaxed slightly for development ease while maintaining protection
  message: { error: "Too many login attempts. Account temporarily locked for 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter (600 requests / min, exempting realtime streams and SSE)
export const apiGatewayRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 600,
  message: { error: "API rate limit exceeded. Backoff applied." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const p = req.path || "";
    return p.includes("/events") || p.includes("/realtime") || p.includes("/health");
  },
});
