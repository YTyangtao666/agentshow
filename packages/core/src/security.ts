import type { PlanStep, ActionType } from '@agentshow/shared';

const ALLOWED_ACTIONS: ActionType[] = [
  'click', 'type', 'wait', 'navigate', 'highlight', 'scroll',
];

const MAX_STEPS = 20;
const MAX_VALUE_LENGTH = 1000;
const DEFAULT_DANGEROUS_KEYWORDS = ['删除', '清空', '支付', '发送邮件', '提交订单'];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePlan(
  steps: PlanStep[],
  options?: {
    dangerousKeywords?: string[];
    dangerousSelectors?: string[];
  },
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const keywords = options?.dangerousKeywords ?? DEFAULT_DANGEROUS_KEYWORDS;
  const dangerousSels = options?.dangerousSelectors ?? [];

  if (steps.length > MAX_STEPS) {
    errors.push(`Plan步数超限: ${steps.length} > ${MAX_STEPS}`);
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    if (!ALLOWED_ACTIONS.includes(step.action)) {
      errors.push(`步骤${i + 1}: 不允许的action "${step.action}"`);
    }

    if (step.value && step.value.length > MAX_VALUE_LENGTH) {
      errors.push(`步骤${i + 1}: value超过${MAX_VALUE_LENGTH}字符`);
    }

    const textToCheck = (step.value ?? '') + (step.narrate ?? '');
    for (const kw of keywords) {
      if (textToCheck.includes(kw)) {
        warnings.push(`步骤${i + 1}: 检测到危险关键词"${kw}"`);
      }
    }

    if (step.selector) {
      for (const ds of dangerousSels) {
        if (step.selector === ds) {
          warnings.push(`步骤${i + 1}: 危险selector "${ds}"`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export { ALLOWED_ACTIONS, MAX_STEPS, MAX_VALUE_LENGTH };
