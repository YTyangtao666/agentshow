import { describe, it, expect } from 'vitest';
import { getCacheKey } from '../src/cache-key.js';

describe('getCacheKey', () => {
  it('相同intent+URL返回相同key', () => {
    expect(getCacheKey('展示AI生成', 'http://localhost:5175/')).toBe(
      getCacheKey('展示AI生成', 'http://localhost:5175/'),
    );
  });

  it('不同intent返回不同key', () => {
    expect(getCacheKey('展示AI生成', 'http://localhost:5175/')).not.toBe(
      getCacheKey('展示导出功能', 'http://localhost:5175/'),
    );
  });

  it('不同URL返回不同key', () => {
    expect(getCacheKey('展示AI生成', 'http://localhost:5175/')).not.toBe(
      getCacheKey('展示AI生成', 'http://localhost:5175/create'),
    );
  });

  it('key格式为8+8 hex', () => {
    const key = getCacheKey('test', 'http://example.com');
    expect(key).toMatch(/^[a-f0-9]{8}_[a-f0-9]{8}$/);
  });
});
