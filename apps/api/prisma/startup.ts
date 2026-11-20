import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function runNpx(args: string[]): void {
  const result = spawnSync('npx', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npx ${args.join(' ')} exited with status ${result.status}`);
}

async function main(): Promise<void> {
  let shouldRunBootstrap = false;
  try {
    const tables = await prisma.$queryRaw<Array<{ schemaName: string; tableName: string }>>`
      SELECT table_schema AS "schemaName", table_name AS "tableName"
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_type = 'BASE TABLE'
        AND table_name <> '_prisma_migrations'
    `;

    const hasTenantTable = tables.some((table) => table.tableName === 'tenants');
    if (tables.length === 0) {
      console.log('Database has no application tables; initializing the empty database.');
      await prisma.$disconnect();
      runNpx(['prisma', 'db', 'push']);
      shouldRunBootstrap = true;
    } else if (!hasTenantTable) {
      let hasRows = false;
      for (const table of tables) {
        if (!/^[A-Za-z0-9_]+$/.test(table.schemaName) || !/^[A-Za-z0-9_]+$/.test(table.tableName)) {
          throw new Error('Database contains an unexpected table identifier; refusing automatic initialization.');
        }
        const result = await prisma.$queryRaw<Array<{ hasRows: boolean }>>(
          Prisma.sql`SELECT EXISTS (SELECT 1 FROM ${Prisma.raw(`"${table.schemaName}"."${table.tableName}"`)} LIMIT 1) AS "hasRows"`
        );
        if (result[0]?.hasRows) hasRows = true;
      }
      if (hasRows) {
        throw new Error('Database has application data but no tenant table; refusing schema push and seed.');
      }
      console.log('Application tables are empty; initializing schema and seed data.');
      await prisma.$disconnect();
      runNpx(['prisma', 'db', 'push']);
      shouldRunBootstrap = true;
    } else if (await prisma.tenant.count() > 0) {
      console.log('Database already has tenants; skipping schema push and demo seed.');
    } else {
      let hasRows = false;
      for (const table of tables) {
        if (!/^[A-Za-z0-9_]+$/.test(table.schemaName) || !/^[A-Za-z0-9_]+$/.test(table.tableName)) {
          throw new Error('Database contains an unexpected table identifier; refusing demo seed.');
        }
        const result = await prisma.$queryRaw<Array<{ hasRows: boolean }>>(
          Prisma.sql`SELECT EXISTS (SELECT 1 FROM ${Prisma.raw(`"${table.schemaName}"."${table.tableName}"`)} LIMIT 1) AS "hasRows"`
        );
        if (result[0]?.hasRows) hasRows = true;
      }
      if (hasRows) {
        console.log('Database has application rows but no tenants; skipping demo seed.');
      } else {
        console.log('Application tables are empty; seeding the database.');
        shouldRunBootstrap = true;
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  if (shouldRunBootstrap) runNpx(['tsx', 'prisma/bootstrap.ts']);
}

main().catch(async (error) => {
  console.error('API startup preparation failed:', error instanceof Error ? error.message : 'unknown error');
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
