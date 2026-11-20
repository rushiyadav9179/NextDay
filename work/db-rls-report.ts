import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: {
      slug: true,
      _count: { select: { employees: true, candidates: true, leaveRequests: true, expenses: true, customRecords: true } },
    },
  });
  console.log('tenantCounts=' + JSON.stringify(tenants.map(({ slug, _count }) => ({ slug, ..._count }))));

  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string; rowsecurity: boolean; forcerowsecurity: boolean }>>(
    `SELECT c.relname AS tablename, c.relrowsecurity AS rowsecurity, c.relforcerowsecurity AS forcerowsecurity
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname IN ('users', 'employees', 'candidates', 'leave_requests', 'expenses', 'custom_records')
     ORDER BY c.relname`
  );
  console.log('rls=' + JSON.stringify(tables));
  const policies = await prisma.$queryRawUnsafe<Array<{ tablename: string; policyname: string }>>(
    `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('users', 'employees', 'candidates', 'leave_requests', 'expenses', 'custom_records') ORDER BY tablename`
  );
  console.log('rlsPolicies=' + JSON.stringify(policies));
  const roleFlags = await prisma.$queryRawUnsafe<Array<{ superuser: boolean; createRole: boolean; bypassrls: boolean; ownsTenantTables: boolean }>>(
    `SELECT r.rolsuper AS superuser, r.rolcreaterole AS "createRole", r.rolbypassrls AS bypassrls,
      EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relowner = r.oid
          AND c.relname IN ('users', 'employees', 'candidates', 'leave_requests', 'expenses', 'custom_records')) AS "ownsTenantTables"
     FROM pg_roles r WHERE r.rolname = current_user`
  );
  console.log('databaseRoleFlags=' + JSON.stringify(roleFlags));

  const tenant = await prisma.tenant.findFirst({ select: { id: true } });
  if (tenant) {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenant.id}, true)`;
      const context = await tx.$queryRaw<Array<{ tenant_id: string }>>`SELECT current_setting('app.current_tenant_id', true) AS tenant_id`;
      console.log('transactionTenantContextSet=' + (context[0]?.tenant_id === tenant.id));
    });
  }
}

main().catch(() => {
  console.log('database audit query failed');
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
