#!/usr/bin/env node

import net from 'node:net';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VERBOSE = process.env.V2_SMOKE_VERBOSE === '1';
const START_TIMEOUT_MS = Number(process.env.V2_SMOKE_START_TIMEOUT_MS || 120000);
const MIN_SPAN_MS = Number(process.env.V2_SMOKE_MIN_SPAN_MS || 150);

const repoRoot = join(__dirname, '..', '..', '..');
const authDir = join(repoRoot, 'go-exchange-server', 'auth-server');
const vaChatDir = join(repoRoot, 'va-chat-service');
const clientDir = join(repoRoot, 'go-exchange-client');

function log(message, details = {}) {
  if (!VERBOSE) {
    return;
  }

  console.log(`[v2-smoke] ${message}`);
  if (Object.keys(details).length > 0) {
    console.log(JSON.stringify(details, null, 2));
  }
}

function fail(message, details = {}) {
  console.error(`❌ V2 SMOKE FAILED: ${message}`);
  if (Object.keys(details).length > 0) {
    console.error(JSON.stringify(details, null, 2));
  }
  process.exit(1);
}

function ok(message, details = {}) {
  console.log(`✅ ${message}`);
  if (Object.keys(details).length > 0) {
    console.log(JSON.stringify(details, null, 2));
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Unable to allocate free port')));
        return;
      }

      const { port } = address;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(port);
      });
    });
  });
}

function resolveNextBin(cwd) {
  return require.resolve('next/dist/bin/next', { paths: [cwd] });
}

function startVaChatService(port) {
  const nextBin = resolveNextBin(vaChatDir);
  const child = spawn(process.execPath, [nextBin, 'dev', '-p', String(port)], {
    cwd: vaChatDir,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(port),
      RAG_GATEWAY_MOCK: '1',
    },
    stdio: VERBOSE ? 'inherit' : 'pipe',
  });

  if (!VERBOSE) {
    child.stdout?.on('data', () => {});
    child.stderr?.on('data', () => {});
  }

  return child;
}

function startAuthServer(port, vaChatPort) {
  const bootstrapCode = `
const app = require('./src/app').default;
const port = Number(process.env.PORT || ${port});
const server = app.listen(port, () => {
  console.log('[v2-smoke-auth] listening', port);
});
const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
`;

  const child = spawn(
    process.execPath,
    ['-r', 'ts-node/register/transpile-only', '-e', bootstrapCode],
    {
      cwd: authDir,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PORT: String(port),
        VA_CHAT_USE_V2: '1',
        VA_CHAT_SERVICE_URL: `http://127.0.0.1:${vaChatPort}`,
        VA_CHAT_SERVICE_API_KEY: '',
      },
      stdio: VERBOSE ? 'inherit' : 'pipe',
    }
  );

  if (!VERBOSE) {
    child.stdout?.on('data', () => {});
    child.stderr?.on('data', () => {});
  }

  return child;
}

function startClientDevServer(port, authPort) {
  const nextBin = resolveNextBin(clientDir);
  const child = spawn(process.execPath, [nextBin, 'dev', '--turbopack', '-p', String(port)], {
    cwd: clientDir,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(port),
      NEXT_PUBLIC_CHAT_USE_V2: '1',
      NEXT_PUBLIC_CHAT_API: `http://127.0.0.1:${authPort}/api/v1/ai/chat`,
      NEXT_PUBLIC_AUTH_API: `http://127.0.0.1:${authPort}/api/v1`,
    },
    stdio: VERBOSE ? 'inherit' : 'pipe',
  });

  if (!VERBOSE) {
    child.stdout?.on('data', () => {});
    child.stderr?.on('data', () => {});
  }

  return child;
}

async function waitForAuthServerReady(port) {
  const start = Date.now();
  const pingUrl = `http://127.0.0.1:${port}/api/v1/ping`;

  while (Date.now() - start < START_TIMEOUT_MS) {
    try {
      const response = await fetch(pingUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }

    await sleep(250);
  }

  throw new Error(`Auth server did not become ready within ${START_TIMEOUT_MS}ms`);
}

async function waitForV2GatewayReady(port) {
  const start = Date.now();
  const url = `http://127.0.0.1:${port}/api/turn_response_v2`;

  while (Date.now() - start < START_TIMEOUT_MS) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'ready-check' }],
        }),
      });

      if (response.status !== 404) {
        return;
      }
    } catch {
      // retry
    }

    await sleep(250);
  }

  throw new Error(`V2 gateway did not become ready within ${START_TIMEOUT_MS}ms`);
}

async function waitForClientReady(port) {
  const start = Date.now();
  const url = `http://127.0.0.1:${port}/`;

  while (Date.now() - start < START_TIMEOUT_MS) {
    try {
      const response = await fetch(url);
      if (response.status >= 100) {
        return;
      }
    } catch {
      // retry
    }

    await sleep(300);
  }

  throw new Error(`Client dev server did not become ready within ${START_TIMEOUT_MS}ms`);
}

async function verifyProxyStreaming(authPort) {
  const url = `http://127.0.0.1:${authPort}/api/v1/ai/chat/turn`;
  const startedAt = Date.now();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': `smoke-${Date.now()}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'test v2 stream' }],
    }),
  });

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const modeHeader = (response.headers.get('x-va-chat-mode') || '').toLowerCase();

  if (!response.ok) {
    const bodyText = await response.text();
    fail('Proxy returned non-2xx response', {
      status: response.status,
      contentType,
      modeHeader,
      body: bodyText.slice(0, 500),
    });
  }

  if (!contentType.includes('text/event-stream')) {
    fail('Expected text/event-stream from proxy', {
      status: response.status,
      contentType,
      modeHeader,
    });
  }

  if (modeHeader !== 'v2') {
    fail('Expected X-VA-Chat-Mode header to be v2', {
      modeHeader,
    });
  }

  if (!response.body) {
    fail('Response body is empty');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const deltaTimestamps = [];
  let doneEventSeen = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || !line.startsWith('data:')) {
        continue;
      }

      const payload = line.slice(5).trim();
      if (payload === '[DONE]') {
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue;
      }

      const eventType = parsed.event || parsed.type;
      if (eventType === 'response.output_text.delta') {
        deltaTimestamps.push(Date.now());
      }

      if (eventType === 'response.output_text.done') {
        doneEventSeen = true;
      }
    }
  }

  if (deltaTimestamps.length < 2) {
    fail('Expected at least 2 response.output_text.delta events', {
      deltaCount: deltaTimestamps.length,
      elapsedMs: Date.now() - startedAt,
    });
  }

  const spanMs = deltaTimestamps[deltaTimestamps.length - 1] - deltaTimestamps[0];
  if (spanMs < MIN_SPAN_MS) {
    fail('Delta events appear buffered', {
      spanMs,
      thresholdMs: MIN_SPAN_MS,
      deltaCount: deltaTimestamps.length,
    });
  }

  if (!doneEventSeen) {
    fail('response.output_text.done was not received', {
      deltaCount: deltaTimestamps.length,
    });
  }

  ok('V2 proxy streaming smoke passed', {
    deltaCount: deltaTimestamps.length,
    spanMs,
    thresholdMs: MIN_SPAN_MS,
    doneEventSeen,
    modeHeader,
    elapsedMs: Date.now() - startedAt,
  });
}

async function stopProcess(child, name) {
  if (!child || child.killed) {
    return;
  }

  log(`Stopping ${name}`);
  child.kill('SIGTERM');

  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    sleep(5000).then(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }),
  ]);
}

async function cleanup(processes) {
  await Promise.allSettled([
    stopProcess(processes.client, 'go-exchange-client'),
    stopProcess(processes.auth, 'auth-server'),
    stopProcess(processes.va, 'va-chat-service'),
  ]);
}

async function main() {
  const vaPort = await getFreePort();
  const authPort = await getFreePort();
  const clientPort = await getFreePort();

  const processes = {
    va: null,
    auth: null,
    client: null,
  };

  const terminate = async () => {
    await cleanup(processes);
    process.exit(1);
  };

  process.on('SIGINT', terminate);
  process.on('SIGTERM', terminate);

  try {
    log('Allocated ports', { vaPort, authPort, clientPort });

    processes.va = startVaChatService(vaPort);
    await waitForV2GatewayReady(vaPort);
    log('va-chat-service ready', { vaPort });

    processes.auth = startAuthServer(authPort, vaPort);
    await waitForAuthServerReady(authPort);
    log('auth-server ready', { authPort });

    processes.client = startClientDevServer(clientPort, authPort);
    await waitForClientReady(clientPort);
    log('go-exchange-client ready', { clientPort });

    await verifyProxyStreaming(authPort);
  } finally {
    await cleanup(processes);
  }
}

main().catch((error) => {
  fail('Unhandled exception in smoke harness', {
    message: error instanceof Error ? error.message : String(error),
  });
});
