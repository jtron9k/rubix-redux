import { Settings, X } from 'lucide-react';
import { useState } from 'react';
import { settings } from '../content/settings';

const KEY = 'setup_banner_dismissed';

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Dev only: a reminder to run /setup until business.json has setupComplete. */
export function SetupBanner() {
  const [hidden, setHidden] = useState(wasDismissed);
  if (!import.meta.env.DEV || settings.setupComplete || hidden) return null;
  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      // ignore
    }
    setHidden(true);
  };
  return (
    <div className="flex items-center justify-center gap-3 bg-ink-900 px-4 py-2 text-sm text-white">
      <Settings className="h-4 w-4 shrink-0" aria-hidden />
      <span>
        This site still has sample settings. <a href="/setup" className="font-semibold underline underline-offset-2">Run first-time setup</a> or <code className="rounded bg-white/10 px-1">npm run setup</code>.
      </span>
      <button type="button" onClick={dismiss} className="rounded p-1 hover:bg-white/10" aria-label="Dismiss">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
