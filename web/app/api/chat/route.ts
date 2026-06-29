import { NextRequest } from 'next/server';
import { sanitizeInput, detectInjection, checkRateLimit } from '@/lib/security';
import { buildSystemPrompt } from '@/lib/twin';

export const runtime = 'nodejs';

const MODEL = process.env.MODEL_ID ?? 'qwen/qwen3.6-plus';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://digital-twin.vercel.app';
const MAX_HISTORY_PAIRS = 10;

interface HistoryMessage {
  role: string;
  content: string;
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sseStream(text: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const chunk = JSON.stringify({ choices: [{ delta: { content: text } }] });
      controller.enqueue(enc.encode(`data: ${chunk}\n\n`));
      controller.enqueue(enc.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  if (!checkRateLimit(ip)) {
    return jsonError('Too many requests — please wait a moment.', 429);
  }

  // Parse body
  let body: { message?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid request body.', 400);
  }

  const { message, history = [] } = body;

  // Validate message
  if (!message || typeof message !== 'string' || !message.trim()) {
    return jsonError('message is required.', 400);
  }

  // Sanitize user input
  const clean = sanitizeInput(message);

  // Block prompt injection attempts before they reach the model
  if (detectInjection(clean)) {
    return new Response(sseStream(
      "I'm here to answer professional questions about Ali Alperen Colak's background. What would you like to know?"
    ), {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }

  // Validate and sanitize history
  const safeHistory = (Array.isArray(history) ? history : [])
    .filter(
      (m): m is HistoryMessage =>
        m != null &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string',
    )
    .slice(-MAX_HISTORY_PAIRS * 2)
    .map((m) => ({ role: m.role, content: sanitizeInput(m.content).slice(0, 1000) }));

  // Build system prompt with retrieval
  const systemPrompt = buildSystemPrompt(clean);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...safeHistory,
    { role: 'user', content: clean },
  ];

  // API key — server-side only, never sent to client
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY not configured');
    return jsonError('Service temporarily unavailable.', 503);
  }

  // Call OpenRouter
  let upstream: Response;
  try {
    upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': SITE_URL,
        'X-Title': `Digital Twin - ${TWIN_NAME}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });
  } catch (err) {
    console.error('Upstream fetch failed:', err);
    return jsonError('Service error — please try again.', 502);
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => 'unknown');
    console.error('OpenRouter error:', upstream.status, text);
    return jsonError('Upstream error — please try again.', 502);
  }

  // Pipe the SSE stream directly to the client
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}

const TWIN_NAME = 'Ali Alperen Colak';
