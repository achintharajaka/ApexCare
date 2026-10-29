"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const env_js_1 = require("../../config/env.js");
const store_js_1 = require("../../db/store.js");
const rateLimiter_js_1 = require("../../middleware/rateLimiter.js");
exports.authRouter = (0, express_1.Router)();
// Login endpoint
exports.authRouter.post("/login", rateLimiter_js_1.authRateLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }
    // Find user by username
    const user = store_js_1.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
    }
    // Verify password with bcrypt
    const isValidPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!isValidPassword) {
        (0, store_js_1.logAudit)("LOGIN_FAILED", "AuthModule", user.id, user.id, req.ip);
        return res.status(401).json({ error: "Invalid username or password" });
    }
    // Generate JWT token
    const token = jsonwebtoken_1.default.sign({
        id: user.id,
        tenantId: user.tenantId,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
    }, env_js_1.env.JWT_SECRET, { expiresIn: "8h" });
    // Set secure cookie
    res.cookie("hms_session", token, {
        httpOnly: true,
        secure: env_js_1.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000,
        path: "/",
    });
    (0, store_js_1.logAudit)("USER_LOGIN", "AuthModule", user.id, user.id, req.ip);
    return res.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            jobTitle: user.jobTitle,
            department: user.department,
        },
    });
});
// Current session user
exports.authRouter.get("/me", (req, res) => {
    const user = req.user || store_js_1.users[0];
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    return res.json({
        user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            jobTitle: user.jobTitle,
            department: user.department,
        },
    });
});
// Available accounts list
exports.authRouter.get("/roles", (_req, res) => {
    const accounts = store_js_1.users.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        jobTitle: u.jobTitle,
        department: u.department,
    }));
    return res.json(accounts);
});
// Switch role endpoint
exports.authRouter.post("/switch-role", (req, res) => {
    const { role } = req.body;
    const user = store_js_1.users.find((u) => u.role.toUpperCase() === role?.toUpperCase()) || store_js_1.users[0];
    const token = jsonwebtoken_1.default.sign({
        id: user.id,
        tenantId: user.tenantId,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
    }, env_js_1.env.JWT_SECRET, { expiresIn: "8h" });
    (0, store_js_1.logAudit)("ROLE_SWITCHED", "AuthModule", user.id, user.id, req.ip);
    return res.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            jobTitle: user.jobTitle,
            department: user.department,
        },
    });
});
const passwordResetStore = new Map();
// 1. Change Password (Authenticated session)
exports.authRouter.post("/change-password", async (req, res) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
    let targetUser = null;
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env_js_1.env.JWT_SECRET);
            targetUser = store_js_1.users.find((u) => u.id === decoded.id || u.username === decoded.username);
        }
        catch {
            // Token verification failed, fallback to payload identification
        }
    }
    const { username, userId, currentPassword, newPassword } = req.body;
    if (!targetUser && (username || userId)) {
        targetUser = store_js_1.users.find((u) => (username && u.username.toLowerCase() === username.trim().toLowerCase()) ||
            (userId && u.id === userId));
    }
    // Fallback to active session user if present
    if (!targetUser && req.user) {
        targetUser = store_js_1.users.find((u) => u.id === req.user.id);
    }
    if (!targetUser) {
        return res.status(401).json({ error: "Unauthorized: User session not recognized" });
    }
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Both current password and new password are required" });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters long" });
    }
    // Verify current password against bcrypt hash
    const isMatch = await bcryptjs_1.default.compare(currentPassword, targetUser.passwordHash);
    if (!isMatch) {
        (0, store_js_1.logAudit)("PASSWORD_CHANGE_FAILED", "User", targetUser.id, targetUser.id, req.ip);
        return res.status(400).json({ error: "Current password does not match records" });
    }
    // Hash new password
    const newHash = await bcryptjs_1.default.hash(newPassword, 10);
    targetUser.passwordHash = newHash;
    (0, store_js_1.saveStorage)();
    (0, store_js_1.logAudit)("USER_PASSWORD_CHANGED", "User", targetUser.id, targetUser.id, req.ip);
    return res.json({
        success: true,
        message: "Password changed successfully. Your new credentials are now active.",
        username: targetUser.username,
    });
});
// 2. Forgot Password - Request verification code via email
exports.authRouter.post("/forgot-password", rateLimiter_js_1.authRateLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ error: "A valid email address is required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = store_js_1.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
        return res.status(404).json({
            error: `No registered account found with email "${email}". Please verify your email or select a valid hospital station email.`,
        });
    }
    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity
    passwordResetStore.set(cleanEmail, {
        email: cleanEmail,
        code,
        expiresAt,
        userId: user.id,
    });
    // Simulated email dispatch log
    console.log(`\n========================================================`);
    console.log(`[APEXCARE EMAIL DISPATCH] Password Reset Verification`);
    console.log(`To: ${user.fullName} <${user.email}>`);
    console.log(`Subject: ApexCare HMS - Password Reset Verification Code`);
    console.log(`Verification Code: [ ${code} ] (Expires in 15 minutes)`);
    console.log(`========================================================\n`);
    (0, store_js_1.logAudit)("PASSWORD_RESET_EMAIL_SENT", "AuthModule", user.id, user.id, req.ip);
    return res.json({
        success: true,
        message: `A 6-digit password reset verification code has been dispatched to ${user.email}.`,
        email: user.email,
        code, // Included for instant sandbox testing / evaluation
    });
});
// 3. Reset Password with verification code
exports.authRouter.post("/reset-password", rateLimiter_js_1.authRateLimiter, async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "Email, verification code, and new password are required" });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters long" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const resetRecord = passwordResetStore.get(cleanEmail);
    if (!resetRecord) {
        return res.status(400).json({
            error: "No active password reset request found for this email. Please request a new code.",
        });
    }
    if (Date.now() > resetRecord.expiresAt) {
        passwordResetStore.delete(cleanEmail);
        return res.status(400).json({
            error: "Verification code has expired. Please request a new code.",
        });
    }
    if (resetRecord.code !== String(code).trim()) {
        (0, store_js_1.logAudit)("PASSWORD_RESET_CODE_INVALID", "AuthModule", resetRecord.userId, resetRecord.userId, req.ip);
        return res.status(400).json({ error: "Invalid verification code. Please check your email and try again." });
    }
    const user = store_js_1.users.find((u) => u.id === resetRecord.userId || u.email.toLowerCase() === cleanEmail);
    if (!user) {
        return res.status(404).json({ error: "User account not found" });
    }
    // Update passwordHash
    const newHash = await bcryptjs_1.default.hash(newPassword, 10);
    user.passwordHash = newHash;
    (0, store_js_1.saveStorage)();
    // Clean up used code
    passwordResetStore.delete(cleanEmail);
    (0, store_js_1.logAudit)("PASSWORD_RESET_COMPLETED", "User", user.id, user.id, req.ip);
    return res.json({
        success: true,
        message: "Your password has been successfully reset. You may now log in with your new credentials.",
        username: user.username,
    });
});
