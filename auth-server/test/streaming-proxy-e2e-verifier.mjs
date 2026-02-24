#!/usr/bin/env node

const TARGET_URL =
  process.env.STREAM_TEST_URL || 'http://localhost:3001/api/v1/ai/chat/turn';
const MIN_SPAN_MS = Number(process.env.STREAM_TEST_MIN_SPAN_MS || 150);

function fail(message, details = {}) {
  console.error(`❌ STREAM PROXY E2E FAILED: ${message}`);
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

function getHeader(response, name) {
  return response.headers.get(name) || '';
}

async function run() {
  const requestBody = {
    messages: [{ role: 'user', content: 'Proxy stream E2E check' }],
    toolsState: {
      fileSearchEnabled: false,
      webSearchEnabled: false,
      codeInterpreterEnabled: false,
    },
  };

  const response = await fetch(TARGET_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const status = response.status;
  const contentType = getHeader(response, 'content-type');
  const cacheControl = getHeader(response, 'cache-control');
  const connection = getHeader(response, 'connection');

  const headerErrors = [];
  if (status !== 200) {
    headerErrors.push('status !== 200');
  }
  if (!contentType.toLowerCase().includes('text/event-stream')) {
    headerErrors.push('content-type missing text/event-stream');
  }
  if (!cacheControl.toLowerCase().includes('no-cache')) {
    headerErrors.push('cache-control missing no-cache');
  }
  if (connection && !connection.toLowerCase().includes('keep-alive')) {
    headerErrors.push('connection present but not keep-alive');
  }

  if (headerErrors.length > 0) {
    fail('Headers check failed', {
      status,
      contentType,
      cacheControl,
      connection,
      issues: headerErrors,
    });
  }

  ok('Headers OK (SSE)', {
    status,
    contentType,
    cacheControl,
    connection: connection || '(not exposed by runtime)',
  });

  if (!response.body) {
    fail('Missing response body', {
      status,
      contentType,
      cacheControl,
      connection,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const deltaTimes = [];
  let doneSeen = false;
  let parsedEvents = 0;

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
      } catch (error) {
        fail('SSE JSON parsing failed', {
          rawLine,
          payload,
          error: error instanceof Error ? error.message : String(error),
          deltaCount: deltaTimes.length,
        });
      }

      parsedEvents += 1;
      const eventType = parsed.event || parsed.type;
      if (eventType === 'response.output_text.delta') {
        deltaTimes.push(Date.now());
      } else if (eventType === 'response.output_text.done') {
        doneSeen = true;
      }
    }
  }

  if (deltaTimes.length < 2 || !doneSeen) {
    fail('Streaming contract failed', {
      deltaCount: deltaTimes.length,
      doneSeen,
      parsedEvents,
      spanMs:
        deltaTimes.length > 1
          ? deltaTimes[deltaTimes.length - 1] - deltaTimes[0]
          : 0,
    });
  }

  const spanMs = deltaTimes[deltaTimes.length - 1] - deltaTimes[0];

  ok('Streaming contract OK (delta + done)', {
    deltaCount: deltaTimes.length,
    doneSeen,
    parsedEvents,
    spanMs,
  });

  if (spanMs < MIN_SPAN_MS) {
    fail('Non-buffering check failed', {
      deltaCount: deltaTimes.length,
      spanMs,
      thresholdMs: MIN_SPAN_MS,
    });
  }

  ok(`Non-buffering OK (spanMs >= ${MIN_SPAN_MS}ms)`, {
    deltaCount: deltaTimes.length,
    spanMs,
    thresholdMs: MIN_SPAN_MS,
  });
}

run().catch((error) => {
  fail('Unhandled verifier error', {
    message: error instanceof Error ? error.message : String(error),
  });
});
