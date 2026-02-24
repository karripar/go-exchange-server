import type {NextFunction, Request, Response} from 'express';

const {VA_CHAT_SERVICE_URL, VA_CHAT_SERVICE_API_KEY} = process.env;

/**
 * Proxy a single AI chat turn to the VA-chat-service.
 *
 * Route: POST /api/v1/ai/chat/turn
 *
 * The request body is forwarded as-is to the VA-chat-service endpoint
 * `${VA_CHAT_SERVICE_URL}/api/turn_response` (or `/api/turn_response_v2`
 * when VA_CHAT_USE_V2=1) and the response status, headers and body are
 * streamed back to the client.
 */
export const aiChatTurn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!VA_CHAT_SERVICE_URL) {
      res
        .status(500)
        .json({message: 'VA_CHAT_SERVICE_URL is not configured on the server'});
      return;
    }

    const useV2 = process.env.VA_CHAT_USE_V2 === '1';
    const targetPath = useV2 ? '/api/turn_response_v2' : '/api/turn_response';
    const targetUrl = `${VA_CHAT_SERVICE_URL.replace(/\/$/, '')}${targetPath}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (VA_CHAT_SERVICE_API_KEY) {
      headers['x-service-api-key'] = VA_CHAT_SERVICE_API_KEY;
    }

    const abortController = new AbortController();
    const onClientClose = () => {
      if (!res.writableEnded) {
        abortController.abort();
      }
    };
    res.on('close', onClientClose);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const contentType =
        response.headers.get('content-type') || 'application/json';
      const bodyText = await response.text();

      res.status(response.status);
      res.setHeader('Content-Type', contentType);
      res.send(bodyText);
      res.off('close', onClientClose);
      return;
    }

    if (!response.body) {
      res.status(502).json({message: 'Upstream response body is empty'});
      res.off('close', onClientClose);
      return;
    }

    res.status(response.status);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const upstreamRequestId = response.headers.get('x-request-id');
    if (upstreamRequestId) {
      res.setHeader('X-Request-Id', upstreamRequestId);
    }

    const upstreamRateLimitRemaining = response.headers.get(
      'x-ratelimit-remaining',
    );
    if (upstreamRateLimitRemaining) {
      res.setHeader('X-RateLimit-Remaining', upstreamRateLimitRemaining);
    }

    const upstreamRateLimitReset = response.headers.get('x-ratelimit-reset');
    if (upstreamRateLimitReset) {
      res.setHeader('X-RateLimit-Reset', upstreamRateLimitReset);
    }

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const reader = response.body.getReader();

    try {
      while (true) {
        const {done, value} = await reader.read();

        if (done) {
          break;
        }

        if (value) {
          res.write(Buffer.from(value));
        }
      }
      res.end();
    } finally {
      res.off('close', onClientClose);
      reader.releaseLock();
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }
    next(error);
  }
};
