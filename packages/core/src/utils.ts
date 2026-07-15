export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateToken(): string {
  // Browser or Node >= 19
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older Node
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0'),
  ).join('');
}

export function isAllowedOrigin(
  origin: string | undefined,
  allowed: string[],
): boolean {
  if (!origin) return false;
  return allowed.some((pattern) => {
    if (pattern === '*') return true;
    return origin === pattern;
  });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
