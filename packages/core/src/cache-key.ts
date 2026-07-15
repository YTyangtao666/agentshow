// Browser+Node compatible hash for cache keys.
// Uses Web Crypto API (SubtleCrypto) in browser, Node crypto in server.
export function getCacheKeySync(intent: string, pageUrl: string): string {
  // Simple hash (djb2) — fast, deterministic, no deps.
  function djb2(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
  }
  return `${djb2(intent)}_${djb2(pageUrl)}`;
}

// Keep the original name for server-side use (server can import node:crypto)
export async function getCacheKey(intent: string, pageUrl: string): Promise<string> {
  return getCacheKeySync(intent, pageUrl);
}
