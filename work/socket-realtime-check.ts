import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { io, Socket } from 'socket.io-client';

const prisma = new PrismaClient();
const base = 'http://localhost:4000';
const sockets: Socket[] = [];

async function main() {
  try {
  const login = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hr@nextday.work', password: 'Password123!' }),
  });
  if (!login.ok) throw new Error(`login failed (${login.status})`);
  const { accessToken } = await login.json() as { accessToken: string };
  const secondLogin = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@nextday.work', password: 'Password123!' }),
  });
  if (!secondLogin.ok) throw new Error(`second login failed (${secondLogin.status})`);
  const secondToken = (await secondLogin.json() as { accessToken: string }).accessToken;

  const [hrSocket, recruiterSocket] = [accessToken, secondToken].map(token => {
    const socket = io(base, { auth: { token }, transports: ['websocket'], timeout: 5000 });
    sockets.push(socket);
    return socket;
  });
  await Promise.all(sockets.map(socket => new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', err => reject(new Error(`socket connect failed: ${err.message}`)));
    setTimeout(() => reject(new Error('socket connect timeout')), 7000).unref();
  })));

  const tenant = await prisma.tenant.findUnique({ where: { slug: 'acme-corp' } });
  const candidate = tenant && await prisma.candidate.findFirst({ where: { tenantId: tenant.id } });
  if (!candidate) throw new Error('seeded candidate not found');

  const received = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('second browser session did not receive candidate stage event')), 5000);
    recruiterSocket.once('candidate:stage_updated', (event: { id: string; stage: string }) => {
      if (event.id !== candidate.id || event.stage !== candidate.stage) return;
      clearTimeout(timer);
      resolve();
    });
  });
  const update = await fetch(`${base}/api/v1/candidates/${candidate.id}/stage`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ stage: candidate.stage }),
  });
  if (!update.ok) throw new Error(`stage update failed (${update.status})`);
  await received;
  console.log('SOCKET_TWO_SESSION_EVENT PASS candidate:stage_updated');

  const invalidSocket = io(base, { auth: { token: 'invalid-token' }, transports: ['websocket'], timeout: 5000 });
  sockets.push(invalidSocket);
  const invalidRejected = await new Promise<boolean>(resolve => {
    invalidSocket.once('connect_error', () => resolve(true));
    invalidSocket.once('connect', () => resolve(false));
    setTimeout(() => resolve(false), 5000).unref();
  });
  console.log(`SOCKET_INVALID_TOKEN ${invalidRejected ? 'PASS' : 'FAIL'}`);
  const guestSocket = io(base, { transports: ['websocket'], timeout: 5000 });
  sockets.push(guestSocket);
  const guestRejected = await new Promise<boolean>(resolve => {
    guestSocket.once('connect_error', () => resolve(true));
    guestSocket.once('connect', () => resolve(false));
    setTimeout(() => resolve(false), 5000).unref();
  });
  console.log(`SOCKET_NO_TOKEN ${guestRejected ? 'PASS' : 'FAIL'}`);
  } finally {
    sockets.forEach(socket => socket.disconnect());
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error(`SOCKET_CHECK_FAILED ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
