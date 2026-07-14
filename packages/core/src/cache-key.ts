import { createHash } from 'node:crypto';

export function getCacheKey(intent: string, pageUrl: string): string {
  const intentHash = createHash('md5').update(intent).digest('hex').slice(0, 8);
  const urlHash = createHash('md5').update(pageUrl).digest('hex').slice(0, 8);
  return `${intentHash}_${urlHash}`;
}
