#!/usr/bin/env node

import http from 'node:http';
import net from 'node:net';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VERBOSE = process.env.STREAM_TEST_VERBOSE === '1';
const VERIFY_TIMEOUT_MS = Number(process.env.STREAM_TEST_TIMEOUT_MS || 30000);

function log(message, details) {
  if (!VERBOSE) {
    return;
  }

  console.log(`[proxy-stream-test] ${message}`);
  if (details) {
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

function startMockUpstream(port) {
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/api/turn_response') {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    req.resume();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const emit = (eventName, data) => {
      const payload = JSON.stringify({
        event: eventName,
        data,
      });
      res.write(`data: ${payload}\n\n`);
    };

    emit('response.output_text.delta', { delta: 'Ensimmäinen osa. ' });
    await sleep(200);
    emit('response.output_text.delta', { delta: 'Toinen osa. ' });
    await sleep(200);
    emit('response.output_text.delta', { delta: 'Kolmas osa.' });
    await sleep(50);
    emit('response.output_text.done', { text: 'Ensimmäinen osa. Toinen osa. Kolmas osa.' });
    res.end();
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

async function waitForAuthServer(port, timeoutMs) {
  const start = Date.now();
  const pingUrl = `http://127.0.0.1:${port}/api/v1/ping`;

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(pingUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await sleep(200);
  }

  throw new Error(`Auth server did not become ready within ${timeoutMs}ms`);
}

function startAuthServer(authPort, mockPort) {
  const bootstrapCode = `
const app = require('./src/app').default;
const port = Number(process.env.PORT || ${authPort});
const server = app.listen(port, () => {
  console.log('[stream-test-auth] listening', port);
});
const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
`;

  const child = spawn(
    process.execPath,
    ['-r', 'ts-node/register/transpile-only', '-e', bootstrapCode],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(authPort),
        VA_CHAT_SERVICE_URL: `http://127.0.0.1:${mockPort}`,
        VA_CHAT_USE_V2: process.env.VA_CHAT_USE_V2 || '0',
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

function runVerifier(authPort) {
  return new Promise((resolve, reject) => {
    const verifierPath = join(__dirname, 'streaming-verifier.mjs');
    const child = spawn(process.execPath, [verifierPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        STREAM_TEST_URL: `http://127.0.0.1:${authPort}/api/v1/ai/chat/turn`,
      },
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`streaming-verifier exited with code ${code}`));
    });
  });
}

async function shutdown(authProcess, mockServer) {
  if (authProcess && !authProcess.killed) {
    authProcess.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => authProcess.once('exit', resolve)),
      sleep(2000).then(() => {
        authProcess.kill('SIGKILL');
      }),
    ]);
  }

  if (mockServer) {
    await new Promise((resolve, reject) => {
      mockServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

async function main() {
  const mockPort = await getFreePort();
  const authPort = await getFreePort();
  log('Allocated ports', { mockPort, authPort });

  let mockServer;
  let authProcess;

  const terminate = async () => {
    await shutdown(authProcess, mockServer);
    process.exit(1);
  };

  process.on('SIGINT', terminate);
  process.on('SIGTERM', terminate);

  try {
    mockServer = await startMockUpstream(mockPort);
    log('Mock upstream started', { mockPort });

    authProcess = startAuthServer(authPort, mockPort);
    log('Auth server process started', { authPort });

    await waitForAuthServer(authPort, VERIFY_TIMEOUT_MS);
    log('Auth server is ready', { authPort });

    await runVerifier(authPort);
  } finally {
    await shutdown(authProcess, mockServer);
  }
}

main().catch((error) => {
  console.error('❌ Proxy stream harness failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
