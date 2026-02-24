#!/usr/bin/env node

const TARGET_URL =
  process.env.STREAM_TEST_URL || 'http://localhost:3001/api/v1/ai/chat/turn';
const BUFFERING_SPAN_MS = Number(process.env.STREAM_TEST_MIN_SPAN_MS || 150);
const VERBOSE = process.env.STREAM_TEST_VERBOSE === '1';

function getHeadersObject(headers) {
  return Object.fromEntries(headers.entries());
}

function debug(message, details = {}) {
  if (!VERBOSE) {
    return;
  }

  console.log(`[stream-debug] ${message}`);
  if (Object.keys(details).length > 0) {
    console.log(JSON.stringify(details, null, 2));
  }
}

function fail(message, details = {}) {
  console.error(`❌ STREAM TEST FAILED: ${message}`);
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

async function run() {
  const body = {
    messages: [
      {
        role: 'user',
        content:
          'Kerro lyhyesti viidellä bulletilla vaihto-opiskelun suunnittelun tärkeimmät vaiheet ja lisää lähteet loppuun.',
      },
    ],
    toolsState: {
      fileSearchEnabled: true,
      webSearchEnabled: false,
      codeInterpreterEnabled: false,
      vectorStore: process.env.STREAM_TEST_VECTOR_STORE_ID
        ? { id: process.env.STREAM_TEST_VECTOR_STORE_ID }
        : undefined,
    },
  };

  const startedAt = Date.now();
  debug('Sending stream verification request', {
    targetUrl: TARGET_URL,
    bufferingThresholdMs: BUFFERING_SPAN_MS,
  });

  const response = await fetch(TARGET_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const headersObj = getHeadersObject(response.headers);
  const contentType = response.headers.get('content-type') || '';
  debug('Received response headers', {
    status: response.status,
    contentType,
    headers: headersObj,
  });

  if (!response.ok) {
    const errorText = await response.text();
    fail('Non-2xx response status', {
      status: response.status,
      contentType,
      body: errorText.slice(0, 500),
      headers: VERBOSE ? headersObj : undefined,
    });
  }

  if (!contentType.toLowerCase().includes('text/event-stream')) {
    fail('Expected text/event-stream content type', {
      status: response.status,
      contentType,
      headers: VERBOSE ? headersObj : undefined,
    });
  }

  if (!response.body) {
    fail('Response body is empty; cannot read SSE stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const deltaTimestamps = [];
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
      } catch {
        continue;
      }

      parsedEvents += 1;
      const eventType = parsed.event || parsed.type;
      debug('Parsed SSE event', {
        eventType,
      });
      if (eventType === 'response.output_text.delta') {
        deltaTimestamps.push(Date.now());
      }
    }
  }

  if (deltaTimestamps.length < 2) {
    fail('Expected at least 2 response.output_text.delta events', {
      parsedEvents,
      deltaCount: deltaTimestamps.length,
      elapsedMs: Date.now() - startedAt,
    });
  }

  const spanMs = deltaTimestamps[deltaTimestamps.length - 1] - deltaTimestamps[0];
  if (spanMs < BUFFERING_SPAN_MS) {
    fail('Delta events appear buffered (arrived essentially at once)', {
      deltaCount: deltaTimestamps.length,
      spanMs,
      thresholdMs: BUFFERING_SPAN_MS,
      elapsedMs: Date.now() - startedAt,
    });
  }

  ok('Streaming verified: incremental SSE deltas detected', {
    deltaCount: deltaTimestamps.length,
    spanMs,
    thresholdMs: BUFFERING_SPAN_MS,
    elapsedMs: Date.now() - startedAt,
  });
}

run().catch((error) => {
  fail('Unhandled verifier error', {
    message: error instanceof Error ? error.message : String(error),
  });
});
