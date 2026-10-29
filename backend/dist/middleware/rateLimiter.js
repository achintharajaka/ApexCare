"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiGatewayRateLimiter = exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Auth route rate limiter (max 30 attempts per 15 minutes)
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 30, // Relaxed slightly for development ease while maintaining protection
    message: { error: "Too many login attempts. Account temporarily locked for 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});
// General API rate limiter (600 requests / min, exempting realtime streams and SSE)
exports.apiGatewayRateLimiter = (0, express_rate_limit_1.default)({
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
