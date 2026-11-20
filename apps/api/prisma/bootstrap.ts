import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  try {
    const tenants = await prisma.tenant.count();
    if (tenants > 0) {
      console.log(`Database already contains ${tenants} tenant(s); skipping demo seed.`);
      return;
    }

    console.log('Database is empty; creating the demo dataset.');
    const result = spawnSync('npx', ['tsx', 'prisma/seed.ts'], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Seed process exited with status ${result.status}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Database bootstrap failed:', error);
  process.exit(1);
});
