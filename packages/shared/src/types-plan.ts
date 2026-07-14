export type ActionType =
  | 'click'
  | 'type'
  | 'wait'
  | 'navigate'
  | 'highlight'
  | 'scroll';

export interface PlanStep {
  action: ActionType;
  selector?: string;
  elementIndex?: number;
  value?: string;
  url?: string;
  condition?: string;
  timeout?: number;
  duration?: number;
  narrate?: string;
  intent?: string;
  requiresConfirmation?: boolean;
  confirmMessage?: string;
  assert?: {
    selector: string;
    textContains?: string;
    isVisible?: boolean;
  };
}

export interface Plan {
  steps: PlanStep[];
  intent: string;
  createdAt: string;
}

export interface CachedPlan extends Plan {
  pageUrl: string;
  steps: CachedStep[];
}

export interface CachedStep extends PlanStep {
  selector: string;
  intent: string;
}

export interface PageElement {
  index: number;
  tag: string;
  type?: string;
  text: string;
  placeholder?: string;
  role?: string;
  ariaLabel?: string;
  id?: string;
  selector: string;
  visible: boolean;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
