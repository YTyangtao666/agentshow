import { describe, it, expect } from 'vitest';
import { isValidSelector, validatePlan } from '../src/security.js';
import type { PlanStep } from '@agentshow/shared';

describe('isValidSelector', () => {
  it('允许标准CSS选择器', () => {
    expect(isValidSelector('#my-id')).toBe(true);
    expect(isValidSelector('.my-class')).toBe(true);
    expect(isValidSelector('button')).toBe(true);
    expect(isValidSelector('div.child')).toBe(true);
    expect(isValidSelector('div > .child')).toBe(true); // space-around > is valid CSS
    expect(isValidSelector('[data-test="value"]')).toBe(true);
    expect(isValidSelector('li:nth-of-type(3)')).toBe(true);
  });

  it('允许空选择器', () => {
    expect(isValidSelector('')).toBe(true);
  });

  it('拒绝HTML尖括号注入', () => {
    expect(isValidSelector('<script>alert(1)</script>')).toBe(false);
    expect(isValidSelector('<img src=x onerror=alert(1)>')).toBe(false);
  });

  it('拒绝javascript: 协议', () => {
    expect(isValidSelector('a[href="javascript:alert(1)"]')).toBe(false);
  });

  it('拒绝 expression() 和 url()', () => {
    expect(isValidSelector('div { expression(alert(1)) }')).toBe(false);
    expect(isValidSelector("background: url('evil.js')")).toBe(false);
  });

  it('拒绝超长选择器', () => {
    expect(isValidSelector('.'.repeat(600))).toBe(false);
  });

  it('拒绝十六进制转义混淆', () => {
    expect(isValidSelector('\\41')).toBe(false);
    expect(isValidSelector('\\6a\\61\\76\\61\\73\\63\\72\\69\\70\\74')).toBe(false);
  });
});

describe('validatePlan selector injection', () => {
  it('拒绝包含注入的选择器', () => {
    const steps: PlanStep[] = [
      { action: 'click', selector: '<script>alert(1)</script>' },
    ];
    const result = validatePlan(steps);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('selector'))).toBe(true);
  });

  it('允许安全的选择器', () => {
    const steps: PlanStep[] = [
      { action: 'click', selector: '#submit-btn.btn-primary' },
    ];
    const result = validatePlan(steps);
    expect(result.valid).toBe(true);
  });
});
