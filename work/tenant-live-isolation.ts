import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const seed = readFileSync('prisma/seed.ts', 'utf8');
const password = seed.match(/const passwordHash = await bcrypt\.hash\('([^']+)'/)?.[1];
const email = seed.match(/email: '([^']+)', pass: passwordHash, role: Role\.HR_ADMIN/)?.[1];
const slug = `tenant-qa-${Date.now()}`;
const emailB = `tenant-qa-${Date.now()}@example.invalid`;
let candidateId: string | undefined;
let leaveId: string | undefined;
let expenseId: string | undefined;
let moduleId: string | undefined;
let recordId: string | undefined;

async function call<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<{ status: number; body: T }> {
  const response = await fetch(`http://127.0.0.1:4000/api/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) as T };
}

async function main() {
  try {
    if (!password || !email) throw new Error('Seeded HR test login unavailable.');
    const user = await prisma.user.findFirst({ where: { email, role: 'HR_ADMIN' }, select: { tenantId: true } });
    if (!user) throw new Error('Seeded HR tenant unavailable.');
    const tenantB = await prisma.tenant.findFirst({ where: { id: { not: user.tenantId } }, select: { id: true } });
    if (!tenantB) throw new Error('Second tenant unavailable for isolation verification.');
    const employeeB = await prisma.employee.findFirst({ where: { tenantId: tenantB.id }, select: { id: true, status: true } });
    if (!employeeB) throw new Error('Second-tenant employee fixture unavailable.');

    const candidate = await prisma.candidate.create({ data: { tenantId: tenantB.id, firstName: 'Tenant', lastName: 'QA', email: emailB } });
    candidateId = candidate.id;
    const leave = await prisma.leaveRequest.create({ data: { tenantId: tenantB.id, employeeId: employeeB.id, startDate: new Date(Date.now() + 10 * 86400000), endDate: new Date(Date.now() + 11 * 86400000), daysCount: 1, reason: 'Temporary tenant isolation QA.' } });
    leaveId = leave.id;
    const expense = await prisma.expense.create({ data: { tenantId: tenantB.id, employeeId: employeeB.id, title: 'Temporary tenant isolation QA', amount: 1 } });
    expenseId = expense.id;
    const module = await prisma.customModule.create({ data: { tenantId: tenantB.id, name: 'Tenant QA Module', slug, schemaSpec: { name: 'Tenant QA Module', slug, fields: [{ name: 'name', label: 'Name', type: 'text', required: true }], tableColumns: ['name'], permissions: ['HR_ADMIN'] } } });
    moduleId = module.id;
    const record = await prisma.customRecord.create({ data: { tenantId: tenantB.id, moduleId: module.id, data: { name: 'Tenant B only' } } });
    recordId = record.id;

    const login = await call<{ accessToken: string }>('/auth/login', '', 'POST', { email, password });
    if (login.status !== 200 || !login.body.accessToken) throw new Error('Seeded HR login failed.');
    const token = login.body.accessToken;
    const reads = [
      (await call(`/employees/${employeeB.id}`, token)).status === 404,
      !((await call<{ candidates: Array<{ id: string }> }>('/candidates', token)).body.candidates || []).some((item) => item.id === candidate.id),
      ((await call<{ leaves: unknown[] }>(`/leave?employeeId=${employeeB.id}`, token)).body.leaves || []).length === 0,
      ((await call<{ expenses: unknown[] }>(`/expenses?employeeId=${employeeB.id}`, token)).body.expenses || []).length === 0,
      (await call(`/custom-modules/${slug}`, token)).status === 404,
    ];
    if (reads.some((result) => !result)) throw new Error('A second-tenant read was visible from tenant A.');
    console.log('LIVE_TENANT_READ_ISOLATION 5/5 PASS');

    const writes = [
      (await call(`/employees/${employeeB.id}/status`, token, 'PATCH', { status: 'SUSPENDED' })).status === 404,
      (await call(`/candidates/${candidate.id}/stage`, token, 'PATCH', { stage: 'REJECTED' })).status === 404,
      (await call(`/leave/${leave.id}/review`, token, 'PATCH', { status: 'APPROVED' })).status === 404,
      (await call('/expenses', token, 'POST', { employeeId: employeeB.id, amount: 5, title: 'Cross-tenant rejection QA' })).status === 404,
      (await call(`/custom-modules/records/${record.id}`, token, 'DELETE')).status === 404,
    ];
    if (writes.some((result) => !result)) throw new Error('A second-tenant write was accepted from tenant A.');
    const unchanged = await Promise.all([
      prisma.employee.findFirst({ where: { id: employeeB.id, tenantId: tenantB.id }, select: { status: true } }),
      prisma.candidate.findFirst({ where: { id: candidate.id, tenantId: tenantB.id }, select: { stage: true } }),
      prisma.leaveRequest.findFirst({ where: { id: leave.id, tenantId: tenantB.id }, select: { status: true } }),
      prisma.expense.findFirst({ where: { id: expense.id, tenantId: tenantB.id }, select: { status: true } }),
      prisma.customRecord.findFirst({ where: { id: record.id, tenantId: tenantB.id }, select: { id: true } }),
    ]);
    if (unchanged[0]?.status !== employeeB.status || unchanged[1]?.stage !== candidate.stage || unchanged[2]?.status !== leave.status || unchanged[3]?.status !== expense.status || !unchanged[4]) throw new Error('A second-tenant fixture changed during denial tests.');
    console.log('LIVE_TENANT_WRITE_ISOLATION 5/5 PASS');
  } finally {
    if (recordId) await prisma.customRecord.deleteMany({ where: { id: recordId } });
    if (moduleId) await prisma.customModule.deleteMany({ where: { id: moduleId } });
    if (expenseId) await prisma.expense.deleteMany({ where: { id: expenseId } });
    if (leaveId) await prisma.leaveRequest.deleteMany({ where: { id: leaveId } });
    if (candidateId) await prisma.candidate.deleteMany({ where: { id: candidateId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Tenant isolation QA failed.');
  process.exit(1);
});
