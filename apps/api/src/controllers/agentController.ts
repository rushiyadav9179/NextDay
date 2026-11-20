import { Request, Response } from 'express';
import { agentRegistry } from '../ai/agentFramework.js';
import { routeIntent } from '../ai/intentRouter.js';
import { prisma } from '../db/prisma.js';
import { socketService } from '../services/socketService.js';
import { llm } from '../ai/llmClient.js';

export async function listAgents(req: Request, res: Response): Promise<void> {
  const agents = agentRegistry.getAll().map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category,
    description: a.description,
    toolsCount: a.tools.length,
    status: 'REGISTERED',
    executionMode: llm.isMockMode ? 'MOCK' : 'PROVIDER',
  }));

  res.json({ agents });
}

export async function runAgentManual(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { id } = req.params;
  const { params } = req.body;

  const result = await agentRegistry.runAgent(id, {
    tenantId: tenantId!,
    userId: req.user?.id,
    params: params || {},
    socketEmitter: (event, payload) => socketService.emitToTenant(tenantId!, event, payload),
  });

  res.json(result);
}

export async function executeCommand(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { command, confirmed = false } = req.body;

  if (!command) {
    res.status(400).json({ error: 'Command prompt required' });
    return;
  }

  const result = await routeIntent(command, tenantId!, req.user?.id, confirmed);

  // Broadcast to live agent feed
  socketService.emitAgentActivity(
    tenantId!,
    'Intent Router',
    `Routed: "${command}" -> ${result.module} (${result.action})`,
    result.requiresConfirmation ? 'RUNNING' : 'SUCCESS'
  );

  res.json(result);
}

export async function getAgentRuns(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;

  const runs = await prisma.agentRun.findMany({
    where: { tenantId },
    orderBy: { startedAt: 'desc' },
    take: 40,
  });

  res.json({ runs });
}

export async function getAiAuditTrail(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;

  const trails = await prisma.aiAuditTrail.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json({ trails });
}
