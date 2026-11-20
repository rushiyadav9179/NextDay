import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { llm } from '../ai/llmClient.js';
import { socketService } from '../services/socketService.js';

// Module specification Zod schema
export const moduleSpecSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  icon: z.string().default('Boxes'),
  description: z.string().optional(),
  fields: z.array(
    z.object({
      name: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/),
      label: z.string(),
      type: z.enum(['text', 'number', 'date', 'select', 'badge', 'boolean']),
      required: z.boolean().default(false),
      options: z.array(z.string()).optional(),
      default: z.any().optional(),
    }).strict()
  ),
  tableColumns: z.array(z.string()),
  charts: z
    .array(
      z.object({
        type: z.enum(['pie', 'bar', 'line']),
        title: z.string(),
        field: z.string(),
      }).strict()
    )
    .optional(),
  permissions: z.array(z.enum(['SUPER_ADMIN', 'HR_ADMIN', 'RECRUITER', 'MANAGER', 'EMPLOYEE', 'CANDIDATE'])).default(['HR_ADMIN']),
}).strict().superRefine((spec, ctx) => {
  const fieldNames = new Set(spec.fields.map((field) => field.name));
  if (fieldNames.size !== spec.fields.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fields'], message: 'Field names must be unique' });
  }
  spec.tableColumns.forEach((name, index) => {
    if (!fieldNames.has(name)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tableColumns', index], message: 'Column must reference a declared field' });
  });
  spec.charts?.forEach((chart, index) => {
    if (!fieldNames.has(chart.field)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['charts', index, 'field'], message: 'Chart must reference a declared field' });
  });
});

export async function getCustomModules(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;

  const modules = await prisma.customModule.findMany({
    where: { tenantId, isPublished: true },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ modules: modules.filter((module) => {
    const parsed = moduleSpecSchema.safeParse(module.schemaSpec);
    const role = req.user?.role;
    return parsed.success && !!role && (parsed.data.permissions.includes(role) || role === 'SUPER_ADMIN');
  }) });
}

export async function getCustomModuleBySlug(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { slug } = req.params;

  const customModule = await prisma.customModule.findUnique({
    where: { tenantId_slug: { tenantId: tenantId!, slug } },
    include: {
      records: {
        where: { tenantId: tenantId! },
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
    },
  });

  if (!customModule) {
    res.status(404).json({ error: 'Custom module not found' });
    return;
  }

  const parsedSpec = moduleSpecSchema.safeParse(customModule.schemaSpec);
  const role = req.user?.role;
  if (!parsedSpec.success || !role || (!parsedSpec.data.permissions.includes(role) && role !== 'SUPER_ADMIN')) {
    res.status(404).json({ error: 'Custom module not found' });
    return;
  }

  res.json({ module: customModule });
}

// Generate Module Spec using Dev Agent
export async function generateModuleSpec(req: Request, res: Response): Promise<void> {
  const { prompt } = req.body;

  const system = `You are the NextDay Autonomous Dev Agent. Generate a validated JSON ModuleSpec for an enterprise HR module.
Spec schema must contain:
- name: string
- slug: string (kebab-case)
- icon: Lucide icon name (e.g. ShieldCheck, HeartPulse, Award, Laptop, Car, GraduationCap, FileCheck)
- description: string
- fields: array of { name, label, type ('text'|'number'|'date'|'select'|'badge'|'boolean'), required: boolean, options?: string[], default?: any }
- tableColumns: array of field names to display in table
- charts: array of { type ('pie'|'bar'|'line'), title: string, field: string }
- permissions: array of roles (e.g. ['HR_ADMIN', 'MANAGER'])`;

  const rawSpec = await llm.generateStructured<any>({ prompt, systemInstruction: system });
  const validated = moduleSpecSchema.parse(rawSpec);

  res.json({ spec: validated, previewReady: true });
}

// Publish or Update Custom Module
export async function publishCustomModule(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const spec = moduleSpecSchema.parse(req.body);

  const customModule = await prisma.customModule.upsert({
    where: { tenantId_slug: { tenantId: tenantId!, slug: spec.slug } },
    update: {
      name: spec.name,
      icon: spec.icon,
      description: spec.description,
      schemaSpec: spec,
      isPublished: true,
      version: { increment: 1 },
    },
    create: {
      tenantId: tenantId!,
      name: spec.name,
      slug: spec.slug,
      icon: spec.icon,
      description: spec.description,
      schemaSpec: spec,
      version: 1,
      isPublished: true,
    },
  });

  socketService.emitToTenant(tenantId!, 'custom_module:published', customModule);

  res.status(201).json(customModule);
}

// Generic CRUD for CustomRecord
export async function getCustomRecords(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { moduleId } = req.params;

  const customModule = await prisma.customModule.findFirst({ where: { id: moduleId, tenantId, isPublished: true } });
  const spec = customModule ? moduleSpecSchema.safeParse(customModule.schemaSpec) : null;
  const role = req.user?.role;
  if (!spec?.success || !role || (!spec.data.permissions.includes(role) && role !== 'SUPER_ADMIN')) {
    res.status(404).json({ error: 'Custom module not found' });
    return;
  }

  const records = await prisma.customRecord.findMany({
    where: { tenantId: tenantId!, moduleId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ records });
}

export async function createCustomRecord(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { moduleId } = req.params;
  const { data } = req.body;

  const module = await prisma.customModule.findFirst({ where: { id: moduleId, tenantId, isPublished: true } });
  if (!module) {
    res.status(404).json({ error: 'Custom module not found' });
    return;
  }

  const spec = moduleSpecSchema.safeParse(module.schemaSpec);
  if (!spec.success) {
    res.status(409).json({ error: 'This module has an invalid schema and cannot accept records.' });
    return;
  }
  if (!req.user || (!spec.data.permissions.includes(req.user.role) && req.user.role !== 'SUPER_ADMIN')) {
    res.status(403).json({ error: 'Your role cannot add records to this module.' });
    return;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    res.status(400).json({ error: 'Record data must be an object.' });
    return;
  }
  const fieldNames = new Set(spec.data.fields.map((field) => field.name));
  const unknownFields = Object.keys(data).filter((key) => !fieldNames.has(key));
  if (unknownFields.length) {
    res.status(400).json({ error: 'Record contains unknown fields.', fields: unknownFields });
    return;
  }
  for (const field of spec.data.fields) {
    const value = data[field.name];
    if (field.required && (value === undefined || value === null || value === '')) {
      res.status(400).json({ error: `Field "${field.label}" is required.` });
      return;
    }
    if (value === undefined || value === null || value === '') continue;
    const valid = field.type === 'number' ? typeof value === 'number' && Number.isFinite(value)
      : field.type === 'boolean' ? typeof value === 'boolean'
      : field.type === 'select' || field.type === 'badge' ? typeof value === 'string' && (!field.options?.length || field.options.includes(value))
      : field.type === 'date' ? typeof value === 'string' && !Number.isNaN(Date.parse(value))
      : typeof value === 'string';
    if (!valid) {
      res.status(400).json({ error: `Field "${field.label}" has an invalid value.` });
      return;
    }
  }

  const record = await prisma.customRecord.create({
    data: {
      tenantId: tenantId!,
      moduleId,
      data: data || {},
      createdByUserId: req.user?.id,
    },
  });

  socketService.emitToTenant(tenantId!, 'custom_record:created', { moduleId, record });

  res.status(201).json(record);
}

export async function deleteCustomRecord(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { recordId } = req.params;

  const result = await prisma.customRecord.deleteMany({ where: { id: recordId, tenantId } });
  if (!result.count) {
    res.status(404).json({ error: 'Custom record not found' });
    return;
  }

  res.json({ message: 'Record deleted successfully' });
}
