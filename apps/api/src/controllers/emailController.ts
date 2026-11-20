import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { emailService } from '../services/emailService.js';
import { llm } from '../ai/llmClient.js';

export async function getEmailTemplates(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;

  const templates = await prisma.emailTemplate.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });

  res.json({ templates });
}

export async function createEmailTemplate(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { name, subject, bodyHtml, category, variables } = req.body;

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

  const template = await prisma.emailTemplate.upsert({
    where: { tenantId_slug: { tenantId: tenantId!, slug } },
    update: {
      name,
      subject,
      bodyHtml,
      category: category || 'GENERAL',
      variables: variables || [],
    },
    create: {
      tenantId: tenantId!,
      name,
      slug,
      subject,
      bodyHtml,
      category: category || 'GENERAL',
      variables: variables || [],
    },
  });

  res.status(201).json(template);
}

export async function previewTemplate(req: Request, res: Response): Promise<void> {
  const { bodyHtml, subject, variables } = req.body;

  const compiledSubject = emailService.compileTemplate(subject || '', variables || {});
  const compiledBody = emailService.compileTemplate(bodyHtml || '', variables || {});

  res.json({ subject: compiledSubject, bodyHtml: compiledBody });
}

export async function aiDraftEmail(req: Request, res: Response): Promise<void> {
  const { instruction, tone = 'professional_warm', recipientType = 'candidate' } = req.body;

  const prompt = `Draft a modern enterprise HR email.
Instruction: "${instruction}"
Tone: ${tone}
Recipient context: ${recipientType}

Return JSON with:
- subject: string
- bodyHtml: rich formatted HTML with clean paragraph and list tags. Use Handlebars placeholders like {{firstName}}, {{jobTitle}}, {{companyName}}, {{startDate}} where appropriate.`;

  const draft = await llm.generateStructured<any>({ prompt });

  res.json(draft);
}

export async function sendEmail(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { to, recipientName, subject, bodyHtml, templateId, variables } = req.body;

  const result = await emailService.sendEmail({
    tenantId: tenantId!,
    templateId,
    to,
    recipientName,
    subject,
    bodyHtml,
    variables,
  });

  res.json({
    message: result.status === 'SIMULATED' ? 'Email logged (Simulated dev mode)' : 'Email sent successfully',
    ...result,
  });
}

export async function bulkSendEmail(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { recipients, subject, bodyHtml, templateId } = req.body;

  const result = await emailService.sendBulk({
    tenantId: tenantId!,
    templateId,
    recipients,
    subject,
    bodyHtml,
  });

  res.json({
    message: `Dispatched ${result.sent} emails (${result.failed} failed)`,
    ...result,
  });
}

export async function getEmailLogs(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;

  const logs = await prisma.emailLog.findMany({
    where: { tenantId },
    orderBy: { sentAt: 'desc' },
    take: 50,
  });

  res.json({ logs });
}
