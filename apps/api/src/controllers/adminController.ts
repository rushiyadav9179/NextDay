import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { Role } from '@prisma/client';

export async function getUsers(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;

  const users = await prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      email: true,
      role: true,
      twoFactorEnabled: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      lastLoginAt: true,
      createdAt: true,
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          jobTitle: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ users });
}

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { userId } = req.params;
  const { role } = req.body;

  const changed = await prisma.user.updateMany({
    where: { id: userId, tenantId },
    data: { role: role as Role },
  });
  if (!changed.count) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId }, select: { id: true, email: true, role: true } });

  res.json({ message: 'User role updated successfully', user });
}

export async function getTenantSettings(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  res.json({ tenant });
}

export async function updateTenantSettings(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { name, settings } = req.body;

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name,
      settings: settings || {},
    },
  });

  res.json({ tenant });
}

// API Keys Management
export async function getApiKeys(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;

  const keys = await prisma.apiKey.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      revoked: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ keys });
}

export async function createApiKey(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { name, scopes = ['*'], expiresInDays = 90 } = req.body;

  const rawKey = `ndk_${crypto.randomBytes(24).toString('hex')}`;
  const prefix = rawKey.slice(0, 8);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const apiKey = await prisma.apiKey.create({
    data: {
      tenantId: tenantId!,
      name: name || 'Production Integration Key',
      keyHash,
      prefix,
      scopes,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    },
  });

  // Return the plaintext key only once on creation
  res.status(201).json({
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
    },
    secretKey: rawKey,
    warning: 'Please copy this API key now. You will not be able to see it again.',
  });
}

export async function revokeApiKey(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { keyId } = req.params;

  const result = await prisma.apiKey.updateMany({
    where: { id: keyId, tenantId },
    data: { revoked: true },
  });
  if (!result.count) {
    res.status(404).json({ error: 'API key not found' });
    return;
  }

  res.json({ message: 'API key revoked successfully' });
}

// Webhooks
export async function getWebhooks(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;

  const webhooks = await prisma.webhook.findMany({
    where: { tenantId },
    include: {
      deliveries: {
        orderBy: { deliveredAt: 'desc' },
        take: 5,
      },
    },
  });

  res.json({ webhooks });
}

export async function createWebhook(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { url, events = ['*'] } = req.body;

  const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

  const webhook = await prisma.webhook.create({
    data: {
      tenantId: tenantId!,
      url,
      secret,
      events,
      isActive: true,
    },
  });

  res.status(201).json(webhook);
}
