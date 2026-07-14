// ===== 客户端 → Server =====

export interface ChatMessage {
  type: 'chat';
  content: string;
}

export interface PageStateRequest {
  type: 'page-state-request';
}

export interface CancelMessage {
  type: 'cancel';
}

export interface PlayMessage {
  type: 'play';
  playbookId: string;
}

export interface PageStateMessage {
  type: 'page-state';
  url: string;
  title: string;
  elements: PageElement[];
}

export type ClientMessage =
  | ChatMessage
  | PageStateRequest
  | CancelMessage
  | PlayMessage
  | PageStateMessage;

// ===== Server → 客户端 =====

export interface AgentChatMessage {
  type: 'chat';
  content: string;
  sender: 'agent';
}

export interface PlanMessage {
  type: 'plan';
  steps: PlanStep[];
}

export interface StepProgressMessage {
  type: 'step-progress';
  current: number;
  total: number;
  status: 'executing' | 'done' | 'error';
  narrate: string;
}

export interface ExecuteMessage {
  type: 'execute';
  action: PlanStep;
}

export interface CompleteMessage {
  type: 'complete';
  summary: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  code?: string;
}

export interface StatusMessage {
  type: 'status';
  status: 'thinking' | 'executing' | 'idle' | 'error';
}

export type ServerMessage =
  | AgentChatMessage
  | PlanMessage
  | StepProgressMessage
  | ExecuteMessage
  | CompleteMessage
  | ErrorMessage
  | StatusMessage;

// ===== 共享数据结构（从 types-plan.ts 引入） =====

import type { PlanStep, PageElement } from './types-plan.js';

