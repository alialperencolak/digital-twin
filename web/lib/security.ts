const INJECTION_PATTERNS = [
  /ignore\s+(previous|above|prior|all|any)\s+instructions?/i,
  /forget\s+(everything|all|your|previous|above)/i,
  /you\s+are\s+now\s+(a|an|the)/i,
  /act\s+as\s+(a|an|if)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /new\s+instructions?:/i,
  /\bsystem\s*prompt\b/i,
  /\bjailbreak\b/i,
  /\bDAN\s+mode\b/i,
  /\bdeveloper\s+mode\b/i,
  /override\s+(your|all|previous)\s+instructions?/i,
  /reveal\s+(your|the)\s+(prompt|instructions?|system)/i,
  /what\s+(are|is)\s+your\s+(system\s+prompt|instructions?)/i,
  /disregard\s+(all|your|previous)/i,
  /\breprompt\b/i,
];

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

const rateMap = new Map<string, { count: number; resetAt: number }>();

export function sanitizeInput(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')       // strip HTML
    .replace(/[^\S\n]+/g, ' ')     // collapse horizontal whitespace
    .trim()
    .slice(0, 500);
}

export function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || entry.resetAt < now) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count++;
  return true;
}
