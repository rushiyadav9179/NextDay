import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { env } from '../apps/api/src/config/env.js';
import { llm } from '../apps/api/src/ai/llmClient.js';

const prisma = new PrismaClient();
const seed = readFileSync('prisma/seed.ts', 'utf8');
const password = seed.match(/const adminPasswordHash = await bcrypt\.hash\('([^']+)'/)?.[1];
const email = seed.match(/email: '([^']+)', pass: adminPasswordHash, role: Role\.SUPER_ADMIN/)?.[1];
const recipients = [`qa-one-${Date.now()}@example.invalid`, `qa-two-${Date.now()}@example.invalid`];

async function main() {
  try {
    if (!password || !email) throw new Error('Seeded test login not found.');
    const loginResponse = await fetch('http://127.0.0.1:4000/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!loginResponse.ok) throw new Error('Email QA login failed.');
    const login = await loginResponse.json() as { accessToken: string };
    const request = async <T>(path: string, body: unknown): Promise<T> => {
      const response = await fetch(`http://127.0.0.1:4000/api/v1${path}`, { method: 'POST', headers: { Authorization: `Bearer ${login.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(`${path} failed with HTTP ${response.status}`);
      return response.json() as Promise<T>;
    };
    const preview = await request<{ subject: string; bodyHtml: string }>('/emails/preview', { subject: 'Welcome, {{firstName}}', bodyHtml: '<p>Hello {{firstName}} at {{companyName}}</p>', variables: { firstName: 'QA', companyName: 'Test Co' } });
    if (preview.subject !== 'Welcome, QA' || preview.bodyHtml !== '<p>Hello QA at Test Co</p>') throw new Error('Template merge verification failed.');
    console.log('EMAIL_TEMPLATE_MERGE PASS');

    if (env.SMTP_HOST && env.SMTP_USER) {
      console.log('EMAIL_BULK_LOG SKIP real SMTP is configured; external delivery was not attempted.');
    } else {
      const bulk = await request<{ total: number; sent: number; failed: number }>('/emails/bulk-send', {
        recipients: recipients.map((to, index) => ({ to, recipientName: `QA ${index + 1}`, variables: { firstName: `QA ${index + 1}`, companyName: 'Test Co' } })),
        subject: 'Hello {{firstName}}', bodyHtml: '<p>Welcome {{firstName}} to {{companyName}}</p>',
      });
      if (bulk.total !== 2 || bulk.sent !== 2 || bulk.failed !== 0) throw new Error('Bulk simulated delivery result was unexpected.');
      const logs = await prisma.emailLog.findMany({ where: { recipientEmail: { in: recipients } }, select: { recipientEmail: true, subject: true, bodyHtml: true, status: true } });
      if (logs.length !== 2 || logs.some((log) => log.status !== 'SIMULATED' || !log.bodyHtml.includes('Test Co'))) throw new Error('Bulk EmailLog merge or status verification failed.');
      console.log('EMAIL_BULK_MERGE_AND_LOG PASS');
    }

    if (llm.isMockMode) {
      const draft = await request<{ subject: string; bodyHtml: string }>('/emails/ai-draft', { instruction: 'Write a welcome email', tone: 'professional_warm' });
      if (!draft.subject || !draft.bodyHtml) throw new Error('Mock AI draft was empty.');
      console.log('EMAIL_AI_DRAFT_MOCK PASS');
    } else {
      console.log('EMAIL_AI_DRAFT_MOCK SKIP provider mode is configured.');
    }
  } finally {
    await prisma.emailLog.deleteMany({ where: { recipientEmail: { in: recipients } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Email QA failed.');
  process.exit(1);
});
