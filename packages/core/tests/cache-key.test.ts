import { describe, it, expect } from 'vitest';
import { getCacheKeySync } from '../src/cache-key.js';

describe('getCacheKey', () => {
  it('相同intent+URL返回相同key', () => {
    expect(getCacheKeySync('展示AI生成', 'http://localhost:5175/')).toBe(
      getCacheKeySync('展示AI生成', 'http://localhost:5175/'),
    );
  });

  it('不同intent返回不同key', () => {
    expect(getCacheKeySync('展示AI生成', 'http://localhost:5175/')).not.toBe(
      getCacheKeySync('展示导出功能', 'http://localhost:5175/'),
    );
  });

  it('不同URL返回不同key', () => {
    expect(getCacheKeySync('展示AI生成', 'http://localhost:5175/')).not.toBe(
      getCacheKeySync('展示AI生成', 'http://localhost:5175/create'),
    );
  });

  it('key格式为8+8 hex', () => {
    const key = getCacheKeySync('test', 'http://example.com');
    expect(key).toMatch(/^[a-f0-9]{8}_[a-f0-9]{8}$/);
  });
});
