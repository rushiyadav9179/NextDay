import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';

export async function getComplianceDocuments(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { status, type } = req.query;

  const whereClause: any = { tenantId };
  if (status) whereClause.status = status as any;
  if (type) whereClause.type = String(type);

  const documents = await prisma.document.findMany({
    where: whereClause,
    include: {
      employee: true,
      candidate: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate upcoming expirations (< 60 days)
  const now = new Date();
  const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const expiringSoonCount = documents.filter(
    (d) => d.expiryDate && new Date(d.expiryDate) <= sixtyDaysFromNow && new Date(d.expiryDate) >= now
  ).length;

  res.json({
    documents,
    stats: {
      total: documents.length,
      verified: documents.filter((d) => d.status === 'VERIFIED').length,
      pending: documents.filter((d) => d.status === 'PENDING').length,
      expiringSoon: expiringSoonCount,
    },
  });
}
