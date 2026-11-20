import { Request } from 'express';
import { prisma } from '../db/prisma.js';

export async function logSecurityEvent(
  req: Request,
  action: string,
  details: Record<string, any>
): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const tenantId = req.tenantId || req.user?.tenantId || details.tenantId;
  const actorEmail = req.user?.email || details.email || 'unauthenticated';
  const actorId = req.user?.id || details.userId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) return;

  try {
    await prisma.aiAuditTrail.create({
      data: {
        tenantId,
        agentName: 'SECURITY_AUDIT',
        triggerType: 'API',
        promptInput: `Action: ${action} | IP: ${ip} | User: ${actorEmail}${actorId ? ` | User ID: ${actorId}` : ''}`,
        agentOutput: JSON.stringify(Object.fromEntries(Object.entries(details).filter(([key]) => key !== 'tenantId'))),
        executionTimeMs: 0,
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    // Non-blocking
  }
}
