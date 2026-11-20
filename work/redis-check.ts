import 'dotenv/config';
import Redis from 'ioredis';

const raw = process.env.REDIS_URL || '';
let protocol = 'invalid';
let hasAuth = false;
try {
  const url = new URL(raw);
  protocol = url.protocol;
  hasAuth = Boolean(url.username || url.password);
} catch { /* Do not print or echo the URL. */ }

console.log(`REDIS_URL_SCHEME ${protocol}`);
console.log(`REDIS_AUTH_COMPONENTS_PRESENT ${hasAuth}`);
const client = new Redis(raw, { lazyConnect: true, connectTimeout: 5000, maxRetriesPerRequest: 1, retryStrategy: () => null });
let lastError = '';
client.on('error', (error) => { lastError = error.message; });
async function main() {
  try {
    await client.connect();
    const result = await client.ping();
    console.log(result === 'PONG' ? 'REDIS_PING PASS' : 'REDIS_PING UNEXPECTED');
  } catch (error) {
    const message = `${String((error as Error)?.message || '')} ${lastError}`.toLowerCase();
    console.log(message.includes('wrongpass') || message.includes('authentication') ? 'REDIS_PING FAIL_AUTH' : message.includes('tls') || message.includes('certificate') ? 'REDIS_PING FAIL_TLS' : 'REDIS_PING FAIL_CONNECT');
  } finally {
    client.disconnect();
  }
}

main().catch(() => console.log('REDIS_PING FAIL_CONNECT'));
