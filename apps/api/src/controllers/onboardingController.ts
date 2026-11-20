import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { llm } from '../ai/llmClient.js';
import { socketService } from '../services/socketService.js';
import crypto from 'crypto';
import { Role } from '@prisma/client';

export async function getOnboardingPlans(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;

  const plans = await prisma.onboardingPlan.findMany({
    where: { tenantId },
    include: {
      employee: true,
      tasks: { orderBy: { order: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ plans });
}

export async function createOnboardingPlan(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { employeeId, title, role, isTemplate = false } = req.body;

  if (employeeId) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, tenantId }, select: { id: true } });
    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }
  }

  const plan = await prisma.onboardingPlan.create({
    data: {
      tenantId: tenantId!,
      employeeId,
      title: title || 'Standard Engineering Onboarding',
      role,
      isTemplate,
      status: 'IN_PROGRESS',
      progress: 10,
    },
  });

  // Default checklist tasks
  const standardTasks = [
    { title: 'Upload Government Photo ID & Tax Forms', category: 'DOCUMENT', order: 1, autoCompletable: true },
    { title: 'Sign Employee Handbook & IP Agreement', category: 'DOCUMENT', order: 2, autoCompletable: true },
    { title: 'Setup Corporate SSO, Slack & GitHub Access', category: 'IT_SETUP', order: 3, autoCompletable: true },
    { title: 'Schedule 1:1 Intro with Engineering Manager', category: 'MEET_TEAM', order: 4, autoCompletable: false },
    { title: 'Complete Security & Data Privacy Training', category: 'TRAINING', order: 5, autoCompletable: true },
  ];

  for (const t of standardTasks) {
    await prisma.onboardingTask.create({
      data: {
        tenantId: tenantId!,
        planId: plan.id,
        title: t.title,
        category: t.category,
        order: t.order,
        autoCompletable: t.autoCompletable,
        status: 'PENDING',
      },
    });
  }

  const completePlan = await prisma.onboardingPlan.findUnique({
    where: { id: plan.id },
    include: { tasks: true, employee: true },
  });

  res.status(201).json(completePlan);
}

export async function updateTaskStatus(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { taskId } = req.params;
  const { status } = req.body;

  const taskExists = await prisma.onboardingTask.findFirst({ where: { id: taskId, tenantId }, include: { plan: { select: { employeeId: true } } } });
  if (!taskExists) {
    res.status(404).json({ error: 'Onboarding task not found' });
    return;
  }
  if (req.user?.role === Role.EMPLOYEE) {
    const ownEmployee = await prisma.employee.findFirst({ where: { id: taskExists.plan.employeeId || '', tenantId, userId: req.user.id }, select: { id: true } });
    if (!ownEmployee) {
      res.status(403).json({ error: 'You can only update your own onboarding tasks' });
      return;
    }
  }
  const task = await prisma.onboardingTask.update({
    where: { id: taskExists.id },
    data: {
      status,
      completedAt: status === 'COMPLETED' ? new Date() : null,
    },
    include: { plan: { include: { tasks: true } } },
  });

  // Calculate and update overall plan progress
  const allTasks = task.plan.tasks;
  const completedCount = allTasks.filter((t) => t.status === 'COMPLETED').length;
  const progressPercent = Math.round((completedCount / (allTasks.length || 1)) * 100);

  await prisma.onboardingPlan.updateMany({
    where: { id: task.planId, tenantId },
    data: {
      progress: progressPercent,
      status: progressPercent === 100 ? 'COMPLETED' : 'IN_PROGRESS',
    },
  });

  socketService.emitToTenant(tenantId!, 'onboarding:task_updated', {
    taskId: task.id,
    planId: task.planId,
    progress: progressPercent,
  });

  res.json({ task, progress: progressPercent });
}

// E-Sign and document verification
export async function signDocument(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  let { documentTitle, type, employeeId } = req.body;

  if (req.user?.role === Role.EMPLOYEE) {
    const ownEmployee = await prisma.employee.findFirst({ where: { tenantId, userId: req.user.id }, select: { id: true } });
    if (!ownEmployee) {
      res.status(404).json({ error: 'Employee profile not found' });
      return;
    }
    employeeId = ownEmployee.id;
  }

  const employee = await prisma.employee.findFirst({ where: { id: employeeId, tenantId }, select: { id: true } });
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  const acknowledgementHash = crypto.createHash('sha256').update(`${employeeId}-${documentTitle}-${Date.now()}`).digest('hex');

  const doc = await prisma.document.create({
    data: {
      tenantId: tenantId!,
      employeeId,
      title: documentTitle || 'Electronic Acknowledgment & Consent',
      type: type || 'NDA',
      fileUrl: `urn:nextday:internal-acknowledgement:${acknowledgementHash}`,
      status: 'PENDING',
      signedAt: new Date(),
      signatureHash: acknowledgementHash,
      ocrExtractedData: {
        method: 'INTERNAL_ACKNOWLEDGEMENT_HASH',
        legallyBindingSignature: false,
      },
    },
  });

  res.status(201).json({
    message: 'Internal acknowledgement recorded. This is not a legally binding e-signature or a verified document.',
    document: doc,
  });
}

// Onboarding Concierge Chat
export async function conciergeChat(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { message, employeeId } = req.body;

  const prompt = `You are the NextDay HR Onboarding Concierge. Answer the new hire's question warmly and accurately:
"${message}"
Include any actionable steps for benefits, workspace, or team intros.`;

  const replyText = await llm.generateText({ prompt });

  res.json({
    reply: replyText,
    timestamp: new Date().toISOString(),
  });
}
