export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const { randomUUID } = require('node:crypto');
  return randomUUID();
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
