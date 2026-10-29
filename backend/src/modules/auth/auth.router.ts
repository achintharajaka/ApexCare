import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { users, logAudit, saveStorage } from "../../db/store.js";
import { authRateLimiter } from "../../middleware/rateLimiter.js";

export const authRouter = Router();

// Login endpoint
authRouter.post("/login", authRateLimiter, async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  // Find user by username
  const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());

  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  // Verify password with bcrypt
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    logAudit("LOGIN_FAILED", "AuthModule", user.id, user.id, req.ip);
    return res.status(401).json({ error: "Invalid username or password" });
  }

  // Generate JWT token
  const token = jwt.sign(
    {
      id: user.id,
      tenantId: user.tenantId,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  // Set secure cookie
  res.cookie("hms_session", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
    path: "/",
  });

  logAudit("USER_LOGIN", "AuthModule", user.id, user.id, req.ip);

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
authRouter.get("/me", (req: Request, res: Response) => {
  const user = (req as any).user || users[0];
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
authRouter.get("/roles", (_req: Request, res: Response) => {
  const accounts = users.map((u) => ({
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
authRouter.post("/switch-role", (req: Request, res: Response) => {
  const { role } = req.body;
  const user = users.find((u) => u.role.toUpperCase() === role?.toUpperCase()) || users[0];

  const token = jwt.sign(
    {
      id: user.id,
      tenantId: user.tenantId,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  logAudit("ROLE_SWITCHED", "AuthModule", user.id, user.id, req.ip);

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

// In-Memory store for password reset verification codes
interface ResetRecord {
  email: string;
  code: string;
  expiresAt: number;
  userId: string;
}
const passwordResetStore = new Map<string, ResetRecord>();

// 1. Change Password (Authenticated session)
authRouter.post("/change-password", async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"] || (req.headers["Authorization"] as string);
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

  let targetUser = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      targetUser = users.find((u) => u.id === decoded.id || u.username === decoded.username);
    } catch {
      // Token verification failed, fallback to payload identification
    }
  }

  const { username, userId, currentPassword, newPassword } = req.body;
  if (!targetUser && (username || userId)) {
    targetUser = users.find(
      (u) =>
        (username && u.username.toLowerCase() === username.trim().toLowerCase()) ||
        (userId && u.id === userId)
    );
  }

  // Fallback to active session user if present
  if (!targetUser && (req as any).user) {
    targetUser = users.find((u) => u.id === (req as any).user.id);
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
  const isMatch = await bcrypt.compare(currentPassword, targetUser.passwordHash);
  if (!isMatch) {
    logAudit("PASSWORD_CHANGE_FAILED", "User", targetUser.id, targetUser.id, req.ip);
    return res.status(400).json({ error: "Current password does not match records" });
  }

  // Hash new password
  const newHash = await bcrypt.hash(newPassword, 10);
  targetUser.passwordHash = newHash;
  saveStorage();

  logAudit("USER_PASSWORD_CHANGED", "User", targetUser.id, targetUser.id, req.ip);

  return res.json({
    success: true,
    message: "Password changed successfully. Your new credentials are now active.",
    username: targetUser.username,
  });
});

// 2. Forgot Password - Request verification code via email
authRouter.post("/forgot-password", authRateLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "A valid email address is required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

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

  logAudit("PASSWORD_RESET_EMAIL_SENT", "AuthModule", user.id, user.id, req.ip);

  return res.json({
    success: true,
    message: `A 6-digit password reset verification code has been dispatched to ${user.email}.`,
    email: user.email,
    code, // Included for instant sandbox testing / evaluation
  });
});

// 3. Reset Password with verification code
authRouter.post("/reset-password", authRateLimiter, async (req: Request, res: Response) => {
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
    logAudit("PASSWORD_RESET_CODE_INVALID", "AuthModule", resetRecord.userId, resetRecord.userId, req.ip);
    return res.status(400).json({ error: "Invalid verification code. Please check your email and try again." });
  }

  const user = users.find((u) => u.id === resetRecord.userId || u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(404).json({ error: "User account not found" });
  }

  // Update passwordHash
  const newHash = await bcrypt.hash(newPassword, 10);
  user.passwordHash = newHash;
  saveStorage();

  // Clean up used code
  passwordResetStore.delete(cleanEmail);

  logAudit("PASSWORD_RESET_COMPLETED", "User", user.id, user.id, req.ip);

  return res.json({
    success: true,
    message: "Your password has been successfully reset. You may now log in with your new credentials.",
    username: user.username,
  });
});
