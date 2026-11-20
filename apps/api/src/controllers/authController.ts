import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { emailService } from '../services/emailService.js';
import { logSecurityEvent } from '../services/auditService.js';
import { Role } from '@prisma/client';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tenantName: z.string().min(2, 'Company/Tenant name is required'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  totpCode: z.string().optional(),
});

function signAccessToken(user: { id: string; tenantId: string; email: string; role: Role }): string {
  return jwt.sign(
    { sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function setRefreshTokenCookie(res: Response, rawToken: string): void {
  res.cookie('refreshToken', rawToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth',
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, tenantName, firstName, lastName } = req.body;

  const slug = tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

  // Check if tenant or email exists
  if (!slug) {
    res.status(400).json({ error: 'Organization name must include letters or numbers.' });
    return;
  }

  // Public signup always creates a new tenant. Reusing a matching tenant slug here
  // would let anyone who knows an organization name register as its HR administrator.
  const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
  if (existingTenant) {
    res.status(409).json({ error: 'An organization with this name already exists. Contact its administrator for an invitation.' });
    return;
  }
  const tenant = await prisma.tenant.create({ data: { name: tenantName, slug } });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      passwordHash,
      role: Role.HR_ADMIN, // Default first registered user to HR_ADMIN
      emailVerified: true,
    },
  });

  // Create corresponding employee profile
  await prisma.employee.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      firstName,
      lastName,
      email,
      jobTitle: 'People Operations Lead',
      status: 'ACTIVE',
    },
  });

  const accessToken = signAccessToken(user);
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  await prisma.refreshToken.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  setRefreshTokenCookie(res, rawRefreshToken);
  logSecurityEvent(req, 'USER_REGISTERED', { userId: user.id, email, tenantId: tenant.id });

  res.status(201).json({
    message: 'Registration successful',
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: tenant.name,
      firstName,
      lastName,
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password, totpCode } = req.body;

  // Find user by email across tenants or matching email
  const user = await prisma.user.findFirst({
    where: { email },
    include: { tenant: true, employee: true },
  });

  if (!user) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  // Account lockout check (5 failed attempts locks for 15 mins)
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
    res.status(423).json({
      error: `Account is temporarily locked due to repeated failed login attempts. Please try again in ${minutesLeft} minute(s).`,
    });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const failedAttempts = user.failedLoginAttempts + 1;
    let lockedUntil = user.lockedUntil;

    if (failedAttempts >= 5) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lockout
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: failedAttempts,
        lockedUntil,
      },
    });

    logSecurityEvent(req, 'LOGIN_FAILED', { email, attempts: failedAttempts, tenantId: user.tenantId });
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  // 2FA Verification if enabled
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!totpCode) {
      res.status(200).json({ requires2FA: true, message: 'TOTP 2FA code required.' });
      return;
    }
    const isValidToken = authenticator.check(totpCode, user.twoFactorSecret);
    if (!isValidToken) {
      res.status(401).json({ error: 'Invalid two-factor authentication code.' });
      return;
    }
  }

  // Reset failed login attempts
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  const accessToken = signAccessToken(user);
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  await prisma.refreshToken.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  setRefreshTokenCookie(res, rawRefreshToken);
  logSecurityEvent(req, 'LOGIN_SUCCESS', { userId: user.id, email, tenantId: user.tenantId });

  res.json({
    message: 'Login successful',
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      firstName: user.employee?.firstName || 'User',
      lastName: user.employee?.lastName || '',
      employeeId: user.employee?.employeeId,
      jobTitle: user.employee?.jobTitle,
      twoFactorEnabled: user.twoFactorEnabled,
    },
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const rawToken = req.cookies?.refreshToken;
  if (!rawToken) {
    res.status(401).json({ error: 'Refresh token required.' });
    return;
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const existingToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { tenant: true, employee: true } } },
  });

  if (!existingToken) {
    res.status(401).json({ error: 'Invalid refresh token.' });
    return;
  }

  // REFRESH TOKEN REUSE DETECTION:
  // If token is revoked or already replaced, this is a reuse attack! Revoke all tokens for user.
  if (existingToken.revoked || existingToken.replacedByToken) {
    await prisma.refreshToken.updateMany({
      where: { userId: existingToken.userId },
      data: { revoked: true },
    });
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    res.status(403).json({ error: 'Security alert: Refresh token reuse detected. All sessions revoked.' });
    return;
  }

  if (existingToken.expiresAt < new Date()) {
    res.status(401).json({ error: 'Refresh token expired.' });
    return;
  }

  // Rotate token: invalidate old and create new
  const newRawToken = crypto.randomBytes(40).toString('hex');
  const newTokenHash = crypto.createHash('sha256').update(newRawToken).digest('hex');

  await prisma.refreshToken.update({
    where: { id: existingToken.id },
    data: {
      revoked: true,
      replacedByToken: newTokenHash,
    },
  });

  await prisma.refreshToken.create({
    data: {
      tenantId: existingToken.tenantId,
      userId: existingToken.userId,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const accessToken = signAccessToken(existingToken.user);
  setRefreshTokenCookie(res, newRawToken);

  res.json({
    accessToken,
    user: {
      id: existingToken.user.id,
      email: existingToken.user.email,
      role: existingToken.user.role,
      tenantId: existingToken.user.tenantId,
      tenantName: existingToken.user.tenant.name,
      firstName: existingToken.user.employee?.firstName || 'User',
      lastName: existingToken.user.employee?.lastName || '',
    },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const rawToken = req.cookies?.refreshToken;
  if (rawToken) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    }).catch(() => {});
  }

  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  res.json({ message: 'Logged out successfully.' });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      tenant: true,
      employee: {
        include: { department: true },
      },
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenant.name,
    twoFactorEnabled: user.twoFactorEnabled,
    employee: user.employee,
  });
}

export async function setup2FA(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(req.user.email, 'NextDay HR', secret);
  const qrCodeUrl = await QRCode.toDataURL(otpauth);

  await prisma.user.update({
    where: { id: req.user.id },
    data: { twoFactorSecret: secret },
  });

  res.json({ secret, qrCodeUrl });
}

export async function verify2FA(req: Request, res: Response): Promise<void> {
  const { code } = req.body;
  if (!req.user || !code) {
    res.status(400).json({ error: 'Verification code required.' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user?.twoFactorSecret) {
    res.status(400).json({ error: '2FA setup not initiated.' });
    return;
  }

  const isValid = authenticator.check(code, user.twoFactorSecret);
  if (!isValid) {
    res.status(400).json({ error: 'Invalid verification code.' });
    return;
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { twoFactorEnabled: true },
  });

  res.json({ message: 'Two-factor authentication successfully enabled!' });
}

export async function requestPasswordReset(req: Request, res: Response): Promise<void> {
  const { email } = req.body;
  const user = await prisma.user.findFirst({ where: { email } });

  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hr

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    await emailService.sendEmail({
      tenantId: user.tenantId,
      to: user.email,
      subject: 'NextDay - Password Reset Request',
      bodyHtml: `<p>Hello,</p><p>We received a request to reset your NextDay password. Use the token below to reset your password:</p><p><code>${resetToken}</code></p>`,
    });
  }

  // Consistent reply to prevent email enumeration
  res.json({ message: 'If that email exists in our system, a password reset token has been sent.' });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, newPassword } = req.body;
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    res.status(400).json({ error: 'Invalid or expired password reset token.' });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  res.json({ message: 'Password has been successfully reset. Please log in with your new credentials.' });
}
