import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  role: Role;
  apiKeyId?: string;
  scopes?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      tenantId?: string;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Check API Key header (X-API-Key)
    const apiKeyHeader = req.headers['x-api-key'] as string;
    if (apiKeyHeader) {
      const hashedKey = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { keyHash: hashedKey },
        include: { tenant: true },
      });

      if (!apiKeyRecord || apiKeyRecord.revoked) {
        res.status(401).json({ error: 'Invalid or revoked API Key' });
        return;
      }

      if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
        res.status(401).json({ error: 'API Key has expired' });
        return;
      }

      // Update last used timestamp non-blocking
      prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {});

      req.user = {
        id: 'system-api-key',
        tenantId: apiKeyRecord.tenantId,
        email: `api-key@${apiKeyRecord.tenant.slug}.work`,
        role: Role.SUPER_ADMIN,
        apiKeyId: apiKeyRecord.id,
        scopes: apiKeyRecord.scopes,
      };
      req.tenantId = apiKeyRecord.tenantId;
      return next();
    }

    // 2. Check Bearer Authorization header or httpOnly cookie
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required. No token provided.' });
      return;
    }

    // Verify access token
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      sub: string;
      tenantId: string;
      email: string;
      role: Role;
    };

    req.user = {
      id: decoded.sub,
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role,
    };
    req.tenantId = decoded.tenantId;

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired. Please refresh your session.', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ error: 'Invalid authentication token.' });
  }
}
