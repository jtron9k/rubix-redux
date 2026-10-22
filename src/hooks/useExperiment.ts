import { useEffect } from 'react';
import { canRenderLayout } from '../../shared/content-core.mjs';
import { getPage } from '../content/pages';
import type { ExperimentConfig, ResolvedPage } from '../content/types';
import { pushEvent } from '../lib/analytics';
import {
  type Arm,
  armCookie,
  clearArmCookie,
  decideArm,
  type Decision,
  isActive,
  readPin,
  stripPin,
} from '../lib/experiment';

export interface ExperimentResult {
  /** The page to render: the control, the variant page's content, or the control with the variant layout. */
  resolved: ResolvedPage;
  experiment: ExperimentConfig | null;
  arm: Arm | null;
}

// Decided synchronously during render (deciding in an effect flashes the control), and cached per
// pathname plus QA pin so re-renders and StrictMode's double render agree.
const decisions = new Map<string, Decision>();
const reported = new Set<string>();

function variantFor(control: ResolvedPage, exp: ExperimentConfig): ResolvedPage | null {
  if (exp.variantSlug && exp.variantSlug.trim()) {
    const target = getPage(exp.variantSlug);
    if (!target || !canRenderLayout(target.page, target.page.layout)) return null;
    return target;
  }
  if (exp.variantLayout && canRenderLayout(control.page, exp.variantLayout)) {
    return { ...control, page: { ...control.page, layout: exp.variantLayout } };
  }
  return null;
}

export function useExperiment(control: ResolvedPage | null, pathname: string, search: string): ExperimentResult | null {
  const exp = control && isActive(control.page.experiment) ? control.page.experiment : null;
  const variant = control && exp ? variantFor(control, exp) : null;

  let decision: Decision | null = null;
  const key = `${pathname}|${readPin(search) ?? ''}`;
  if (exp) {
    decision = decisions.get(key) ?? null;
    if (!decision) {
      decision = decideArm({
        experiment: exp,
        search,
        cookieString: typeof document === 'undefined' ? '' : document.cookie,
        variantRenderable: Boolean(variant),
      });
      decisions.set(key, decision);
    }
  }

  useEffect(() => {
    if (!exp || !decision) return;
    if (decision.cookie === 'write') document.cookie = armCookie(exp.id, decision.arm);
    if (decision.cookie === 'clear') document.cookie = clearArmCookie(exp.id);
    const stripped = stripPin(window.location.search);
    if (stripped !== null) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${stripped}${window.location.hash}`);
    }
    // One experiment_view per page load.
    if (!reported.has(pathname)) {
      reported.add(pathname);
      pushEvent('experiment_view', {
        experiment_id: exp.id,
        experiment_arm: decision.arm,
        page_path: pathname,
        page_group: control?.site.groupSlug ?? '',
      });
    }
  }, [exp, decision, pathname, control]);

  if (!control) return null;
  if (!exp || !decision) return { resolved: control, experiment: null, arm: null };
  const resolved = decision.arm === 'variant' && variant ? variant : control;
  return { resolved, experiment: exp, arm: decision.arm };
}
