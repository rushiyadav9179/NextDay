import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Handlebars from 'handlebars';
import { RoleHierarchy } from '../src/middleware/rbac.js';
import { Role } from '@prisma/client';
import { routeIntent } from '../src/ai/intentRouter.js';
import { registerAllAgents } from '../src/ai/agents/allAgents.js';
import { agentRegistry } from '../src/ai/agentFramework.js';
import { llm } from '../src/ai/llmClient.js';
import { bodySchemas } from '../src/routes/schemas.js';

describe('NextDay Core Security & RBAC Tests', () => {
  it('should hash and verify passwords using bcrypt', async () => {
    const raw = 'SecureP@ssw0rd!';
    const hash = await bcrypt.hash(raw, 10);
    const valid = await bcrypt.compare(raw, hash);
    const invalid = await bcrypt.compare('WrongPassword', hash);

    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });

  it('should enforce role hierarchy: SUPER_ADMIN > HR_ADMIN > RECRUITER > MANAGER > EMPLOYEE', () => {
    expect(RoleHierarchy[Role.SUPER_ADMIN]).toBeGreaterThan(RoleHierarchy[Role.HR_ADMIN]);
    expect(RoleHierarchy[Role.HR_ADMIN]).toBeGreaterThan(RoleHierarchy[Role.RECRUITER]);
    expect(RoleHierarchy[Role.RECRUITER]).toBeGreaterThan(RoleHierarchy[Role.MANAGER]);
    expect(RoleHierarchy[Role.MANAGER]).toBeGreaterThan(RoleHierarchy[Role.EMPLOYEE]);
    expect(RoleHierarchy[Role.EMPLOYEE]).toBeGreaterThan(RoleHierarchy[Role.CANDIDATE]);
  });

  it('should sign and verify JWT tokens with claims', () => {
    const secret = 'test-secret-key-12345';
    const payload = { sub: 'usr-1', tenantId: 'ten-1', email: 'test@nextday.work', role: 'HR_ADMIN' };
    const token = jwt.sign(payload, secret, { expiresIn: '15m' });

    const decoded = jwt.verify(token, secret) as any;
    expect(decoded.sub).toBe('usr-1');
    expect(decoded.tenantId).toBe('ten-1');
    expect(decoded.role).toBe('HR_ADMIN');
  });
});

describe('NextDay Email Template Rendering', () => {
  it('should compile Handlebars template variables accurately', () => {
    const templateStr = 'Dear {{firstName}}, welcome to {{companyName}} as {{jobTitle}}! Start: {{startDate}}.';
    const compiled = Handlebars.compile(templateStr);
    const result = compiled({
      firstName: 'Elena',
      companyName: 'Acme Corporation',
      jobTitle: 'Senior Staff Engineer',
      startDate: 'October 1st',
    });

    expect(result).toBe('Dear Elena, welcome to Acme Corporation as Senior Staff Engineer! Start: October 1st.');
  });
});

describe('NextDay Intent Router & Zero-UI Command Tests', () => {
  it('should route "Show top 5 backend candidates" to RECRUITMENT', async () => {
    const res = await routeIntent('Show top 5 backend candidates', 'mock-tenant-id');
    expect(res.module).toBe('RECRUITMENT');
    expect(res.action).toBe('SHOW_TOP_CANDIDATES');
  });

  it('should route vaccination command to DEV_AUTOCODE with confirmation needed', async () => {
    const res = await routeIntent('Add a vaccination tracking dashboard', 'mock-tenant-id', undefined, false);
    expect(res.module).toBe('DEV_AUTOCODE');
    expect(res.requiresConfirmation).toBe(true);
  });
});

describe('Agent inventory and strict request contracts', () => {
  it('registers all 19 expected agents for the control center', () => {
    registerAllAgents();
    expect(agentRegistry.getAll()).toHaveLength(19);
    expect(agentRegistry.get('dev-autocoding')).toBeDefined();
  });

  it('rejects unknown properties on write request bodies', () => {
    expect(bodySchemas.leave.safeParse({ employeeId: '00000000-0000-4000-8000-000000000001', startDate: '2026-11-20T00:00:00.000Z', endDate: '2026-11-21T00:00:00.000Z', injectedTenantId: 'tenant-b' }).success).toBe(false);
    expect(bodySchemas.moduleSpec.safeParse({ name: 'Valid Module', slug: 'valid-module', fields: [], tableColumns: [], unknown: true }).success).toBe(false);
  });

  it('returns a valid custom module spec in mock mode when no key is configured', async () => {
    if (!llm.isMockMode) return;
    const spec = await llm.generateStructured<{ slug: string; fields: unknown[] }>({
      prompt: 'Generate a vaccination tracking module specification',
      systemInstruction: 'Dev autocoding agent',
    });
    expect(spec.slug).toBe('vaccination-tracker');
    expect(spec.fields.length).toBeGreaterThan(0);
  });

  it('returns an email draft shape when the mock prompt also mentions a candidate', async () => {
    if (!llm.isMockMode) return;
    const draft = await llm.generateStructured<{ subject: string; bodyHtml: string }>({
      prompt: 'Draft a modern enterprise HR email. Instruction: "Draft an offer letter". Recipient context: candidate. Return JSON with subject and bodyHtml.',
    });
    expect(draft.subject).toContain('NextDay');
    expect(draft.bodyHtml).toContain('<p>');
  });
});
