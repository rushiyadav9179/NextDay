import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const seed = readFileSync('prisma/seed.ts', 'utf8');
const password = seed.match(/const adminPasswordHash = await bcrypt\.hash\('([^']+)'/)?.[1];
const email = seed.match(/email: '([^']+)', pass: adminPasswordHash, role: Role\.SUPER_ADMIN/)?.[1];
const slug = `qa-module-${Date.now()}`;
let moduleId: string | undefined;
let recordId: string | undefined;

async function api<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`http://127.0.0.1:4000/api/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${path} failed with HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function main() {
  if (!password || !email) throw new Error('Seeded QA login was not available.');
  try {
  const login = await api<{ accessToken: string }>('/auth/login', '', 'POST', { email, password });
  const preview = await api<{ spec: { name: string; fields: unknown[] }; previewReady: boolean }>('/custom-modules/generate', login.accessToken, 'POST', { prompt: 'Create a vaccination tracking module for QA preview.' });
  if (!preview.previewReady || preview.spec.fields.length === 0) throw new Error('Autocoding preview did not validate.');
  console.log('AUTOCODING_PROMPT_PREVIEW PASS');

  const spec = { name: 'Temporary QA Module', slug, icon: 'Boxes', description: 'Temporary QA only', fields: [{ name: 'assetName', label: 'Asset Name', type: 'text', required: true }], tableColumns: ['assetName'], charts: [], permissions: ['SUPER_ADMIN', 'HR_ADMIN'] };
  const published = await api<{ id: string }>('/custom-modules/publish', login.accessToken, 'POST', spec);
  moduleId = published.id;
  const visible = await api<{ modules: Array<{ slug: string }> }>('/custom-modules', login.accessToken);
  if (!visible.modules.some((m) => m.slug === slug)) throw new Error('Published module did not appear in dynamic module list.');
  console.log('AUTOCODING_PUBLISH_DYNAMIC_MODULE PASS');

  const record = await api<{ id: string }>(`/custom-modules/${moduleId}/records`, login.accessToken, 'POST', { data: { assetName: 'Temporary QA asset' } });
  recordId = record.id;
  const readBack = await api<{ module: { records: Array<{ id: string }> } }>(`/custom-modules/${slug}`, login.accessToken);
  if (!readBack.module.records.some((r) => r.id === recordId)) throw new Error('Published module record CRUD read failed.');
  await api(`/custom-modules/records/${recordId}`, login.accessToken, 'DELETE');
  recordId = undefined;
  console.log('AUTOCODING_DYNAMIC_CRUD PASS');
} finally {
  if (recordId) await prisma.customRecord.deleteMany({ where: { id: recordId } });
  if (moduleId) await prisma.customModule.deleteMany({ where: { id: moduleId } });
  await prisma.$disconnect();
}
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Autocoding QA failed.');
  process.exit(1);
});
