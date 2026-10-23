import type { SetupAnswers, SetupErrors } from '../../shared/setup-rules.mjs';

export interface SetupChange {
  path: string;
  action: 'create' | 'update' | 'delete';
  content?: string;
}

export interface SetupPlan {
  errors: SetupErrors;
  changes: SetupChange[];
  checklist: string[];
}

export class SetupValidationError extends Error {
  errors: SetupErrors;
  constructor(errors: SetupErrors);
}

export function setEnvLine(env: string | null, key: string, value: string): string;
export function readState(opts?: { root?: string }): { setupComplete: boolean; answers: SetupAnswers };
export function planSetup(answers: SetupAnswers, opts?: { root?: string }): SetupPlan;
export function applySetup(
  answers: SetupAnswers,
  opts?: { root?: string },
): { changes: Omit<SetupChange, 'content'>[]; checklist: string[] };
