// Dev-only first-time setup at /setup. It reads and writes through the /__setup API in
// build/site-settings-plugin.ts, which calls scripts/lib/setup-core.mjs. Production builds never route here.

import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Plus, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { colorScale } from '../../shared/theme.mjs';
import { validateAnswers, type SetupAnswers, type SetupErrors, type SetupGroup } from '../../shared/setup-rules.mjs';

const STEPS = [
  { key: 'business', title: 'Business' },
  { key: 'brand', title: 'Brand' },
  { key: 'tracking', title: 'Tracking' },
  { key: 'leads', title: 'Leads' },
  { key: 'groups', title: 'Page groups' },
  { key: 'publishing', title: 'Publishing' },
  { key: 'review', title: 'Review and save' },
] as const;

interface Change {
  path: string;
  action: 'create' | 'update' | 'delete';
}

type Status =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'editing' }
  | { kind: 'saving' }
  | { kind: 'saved'; changes: Change[]; checklist: string[] };

async function api<T>(path: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(`/__setup/${path}`, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, data: (await res.json()) as T };
}

const inputClass =
  'mt-1 block w-full rounded-lg border border-ink-300 px-3 py-2 text-base text-ink-900 shadow-sm focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900';

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink-800">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </label>
  );
}

function TextInput(props: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; invalid?: boolean }) {
  return (
    <input
      type={props.type ?? 'text'}
      value={props.value}
      placeholder={props.placeholder}
      aria-invalid={props.invalid || undefined}
      onChange={(e) => props.onChange(e.target.value)}
      className={`${inputClass} ${props.invalid ? 'border-red-600' : ''}`}
    />
  );
}

function BrandPreview({ primary, accent, logoSrc, name }: { primary: string; accent: string; logoSrc: string; name: string }) {
  const p = colorScale(primary);
  const a = colorScale(accent, '#f59e0b');
  const rgb = (s: string) => `rgb(${s})`;
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200" style={{ background: rgb(p[50]) }}>
      <div className="flex items-center gap-3 border-b border-ink-200 bg-white px-4 py-3">
        {logoSrc ? <img src={logoSrc} alt="" className="h-8 w-auto" /> : null}
        <span className="font-display text-lg font-bold text-ink-900">{name || 'Your business'}</span>
      </div>
      <div className="space-y-3 p-5">
        <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold" style={{ background: rgb(a[100]), color: rgb(a[800]) }}>
          Limited-time offer
        </span>
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: rgb(p[700]) }}>
          Eyebrow text
        </p>
        <p className="font-display text-2xl font-bold text-ink-900">A sample headline</p>
        <span className="inline-flex rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white">Primary button</span>
        <div className="flex gap-1 pt-2">
          {Object.values(p).map((c) => (
            <span key={`p${c}`} className="h-5 flex-1 rounded" style={{ background: rgb(c) }} />
          ))}
        </div>
        <div className="flex gap-1">
          {Object.values(a).map((c) => (
            <span key={`a${c}`} className="h-5 flex-1 rounded" style={{ background: rgb(c) }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const emptyGroup = (): SetupGroup => ({ key: '', previousKey: '', name: '', regionName: '', stateAbbr: '', phone: '' });

export default function SetupWizard() {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [answers, setAnswers] = useState<SetupAnswers | null>(null);
  const [original, setOriginal] = useState<SetupGroup[]>([]);
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [useWebhook, setUseWebhook] = useState(false);
  const [preview, setPreview] = useState<{ changes: Change[]; checklist: string[] } | null>(null);
  const [serverErrors, setServerErrors] = useState<SetupErrors>({});

  useEffect(() => {
    document.title = 'First-time setup';
    api<{ answers: SetupAnswers }>('state')
      .then(({ data }) => {
        setAnswers(data.answers);
        setOriginal(data.answers.groups);
        setUseWebhook(Boolean(data.answers.leads.webhookUrl));
        setStatus({ kind: 'editing' });
      })
      .catch((err: unknown) => setStatus({ kind: 'error', message: String(err) }));
  }, []);

  // Choosing Netlify Forms clears the webhook so it isn't saved by accident.
  const effective = useMemo(
    () => (answers ? { ...answers, leads: { ...answers.leads, webhookUrl: useWebhook ? answers.leads.webhookUrl : '' } } : null),
    [answers, useWebhook],
  );
  const errors = useMemo(() => ({ ...(effective ? validateAnswers(effective) : {}), ...serverErrors }), [effective, serverErrors]);
  const current = STEPS[step].key;

  useEffect(() => {
    if (current !== 'review' || !effective) return;
    setPreview(null);
    api<{ changes: Change[]; checklist: string[] }>('save', { answers: effective, dryRun: true }).then(({ data }) => setPreview(data));
  }, [current, effective]);

  if (status.kind === 'loading' || !answers || !effective) {
    return (
      <Shell>
        {status.kind === 'error' ? (
          <p className="text-red-700">Couldn't load setup state: {status.message}. Is the dev server running?</p>
        ) : (
          <p className="flex items-center gap-2 text-ink-600">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading current settings…
          </p>
        )}
      </Shell>
    );
  }

  if (status.kind === 'saved') {
    return (
      <Shell>
        <div className="flex items-center gap-3 text-emerald-700">
          <CheckCircle2 className="h-7 w-7" aria-hidden />
          <h1 className="font-display text-3xl font-bold text-ink-900">Setup saved</h1>
        </div>
        <p className="mt-3 text-ink-700">{status.changes.length} file{status.changes.length === 1 ? '' : 's'} changed. Open the site to see the new settings.</p>
        <ul className="mt-3 space-y-1 font-mono text-sm text-ink-700">
          {status.changes.map((c) => (
            <li key={c.path}>
              {c.action} {c.path}
            </li>
          ))}
        </ul>
        <h2 className="mt-8 text-lg font-semibold text-ink-900">Next steps</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-700">
          {status.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <a href="/" className="mt-8 inline-flex rounded-full bg-black px-6 py-3 font-semibold text-white hover:bg-zinc-800">
          View the site
        </a>
      </Shell>
    );
  }

  const set = <S extends keyof SetupAnswers>(section: S, patch: Partial<SetupAnswers[S]>) => {
    setServerErrors({});
    setAnswers((a) => (a ? { ...a, [section]: { ...(a[section] as object), ...patch } } : a));
  };
  const setGroups = (fn: (g: SetupGroup[]) => SetupGroup[]) => {
    setServerErrors({});
    setAnswers((a) => (a ? { ...a, groups: fn(a.groups) } : a));
  };
  const err = (path: string) => (showErrors ? errors[path] : undefined);
  const stepErrors = Object.keys(errors).filter((k) => k.startsWith(`${current}.`));

  const next = () => {
    if (stepErrors.length) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo(0, 0);
  };

  const save = async () => {
    if (Object.keys(errors).length) {
      setShowErrors(true);
      const firstBad = STEPS.findIndex((s) => Object.keys(errors).some((k) => k.startsWith(`${s.key}.`)));
      if (firstBad >= 0) setStep(firstBad);
      return;
    }
    setStatus({ kind: 'saving' });
    const { status: code, data } = await api<{ errors?: SetupErrors; error?: string; changes: Change[]; checklist: string[] }>('save', { answers: effective });
    if (code === 200) setStatus({ kind: 'saved', changes: data.changes, checklist: data.checklist });
    else if (data.errors) {
      setServerErrors(data.errors);
      setShowErrors(true);
      setStatus({ kind: 'editing' });
    } else setStatus({ kind: 'error', message: data.error ?? `HTTP ${code}` });
  };

  const b = answers.business;
  const removed = original.filter((o) => !answers.groups.some((g) => g.previousKey === o.key));

  return (
    <Shell>
      <p className="text-sm font-semibold uppercase tracking-wide text-ink-500">
        First-time setup · Step {step + 1} of {STEPS.length}
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold text-ink-900">{STEPS[step].title}</h1>
      <nav aria-label="Setup steps" className="mt-4 flex flex-wrap gap-1.5">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => i < step && setStep(i)}
            disabled={i > step}
            aria-current={i === step ? 'step' : undefined}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${i === step ? 'bg-black text-white' : i < step ? 'bg-ink-100 text-ink-800 hover:bg-ink-200' : 'bg-ink-50 text-ink-400'}`}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </nav>

      <div className="mt-8 space-y-5">
        {current === 'business' && (
          <>
            <Field label="Business name" error={err('business.businessName')}>
              <TextInput value={b.businessName} onChange={(v) => set('business', { businessName: v })} invalid={Boolean(err('business.businessName'))} />
            </Field>
            <Field label="Tagline" hint="One line under the logo and the fallback page description.">
              <TextInput value={b.tagline} onChange={(v) => set('business', { tagline: v })} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Main phone" hint="Shown as typed. Call links use its digits." error={err('business.phone')}>
                <TextInput type="tel" value={b.phone} onChange={(v) => set('business', { phone: v })} placeholder="(555) 010-0100" invalid={Boolean(err('business.phone'))} />
              </Field>
              <Field label="Email" error={err('business.email')}>
                <TextInput type="email" value={b.email} onChange={(v) => set('business', { email: v })} invalid={Boolean(err('business.email'))} />
              </Field>
            </div>
            <Field label="Address">
              <TextInput value={b.address} onChange={(v) => set('business', { address: v })} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Hours">
                <TextInput value={b.hoursText} onChange={(v) => set('business', { hoursText: v })} />
              </Field>
              <Field label="Service area">
                <TextInput value={b.serviceAreaText} onChange={(v) => set('business', { serviceAreaText: v })} />
              </Field>
            </div>
            <Field label="License or disclaimer line" hint="Optional. Shown in the footer.">
              <TextInput value={b.licenseText} onChange={(v) => set('business', { licenseText: v })} />
            </Field>
            <Field label="Default page title" hint="Used when a page has no title of its own. Blank uses the business name.">
              <TextInput value={b.metaTitle} onChange={(v) => set('business', { metaTitle: v })} />
            </Field>
            <Field label="Default page description" hint="Blank uses the tagline.">
              <textarea rows={2} value={b.metaDescription} onChange={(e) => set('business', { metaDescription: e.target.value })} className={inputClass} />
            </Field>
          </>
        )}

        {current === 'brand' && (
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-5">
              {(['primary', 'accent'] as const).map((k) => (
                <Field key={k} label={k === 'primary' ? 'Primary color' : 'Accent color'} hint={k === 'primary' ? 'Accents and light section backgrounds. Buttons stay black.' : 'Badges, offers and highlights.'} error={err(`brand.${k}`)}>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      aria-label={`${k} color picker`}
                      value={/^#[0-9a-f]{6}$/i.test(answers.brand[k]) ? answers.brand[k] : '#000000'}
                      onChange={(e) => set('brand', { [k]: e.target.value })}
                      className="h-10 w-12 cursor-pointer rounded border border-ink-300"
                    />
                    <TextInput value={answers.brand[k]} onChange={(v) => set('brand', { [k]: v })} invalid={Boolean(err(`brand.${k}`))} />
                  </div>
                </Field>
              ))}
              <Field label="Logo" hint="An uploads path such as /images/uploads/logo.svg. Upload files later in /admin, or drop them in public/images/uploads/." error={err('brand.logoSrc')}>
                <TextInput value={answers.brand.logoSrc} onChange={(v) => set('brand', { logoSrc: v })} invalid={Boolean(err('brand.logoSrc'))} />
              </Field>
              <Field label="Logo alt text" hint="Blank uses the business name.">
                <TextInput value={answers.brand.logoAlt} onChange={(v) => set('brand', { logoAlt: v })} />
              </Field>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink-800">Preview</p>
              <BrandPreview primary={answers.brand.primary} accent={answers.brand.accent} logoSrc={answers.brand.logoSrc} name={b.businessName} />
            </div>
          </div>
        )}

        {current === 'tracking' && (
          <>
            <Field label="Google Tag Manager container ID" hint="Looks like GTM-ABC1234. Leave blank to load no tag manager. Events are listed in docs/gtm.md." error={err('tracking.gtmId')}>
              <TextInput value={answers.tracking.gtmId} onChange={(v) => set('tracking', { gtmId: v.trim().toUpperCase() })} placeholder="GTM-XXXXXXX" invalid={Boolean(err('tracking.gtmId'))} />
            </Field>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={answers.tracking.noindex} onChange={(e) => set('tracking', { noindex: e.target.checked })} className="mt-1 h-4 w-4" />
              <span>
                <span className="block text-sm font-semibold text-ink-800">Hide pages from search engines (noindex)</span>
                <span className="block text-xs text-ink-500">Recommended for paid landing pages, so they don't compete with your main site.</span>
              </span>
            </label>
          </>
        )}

        {current === 'leads' && (
          <>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-ink-800">Where should leads go?</legend>
              <label className="flex items-start gap-3">
                <input type="radio" name="lead-dest" checked={!useWebhook} onChange={() => setUseWebhook(false)} className="mt-1" />
                <span>
                  <span className="block text-sm font-semibold text-ink-800">Netlify Forms</span>
                  <span className="block text-xs text-ink-500">Submissions appear in the Netlify dashboard. Turn on email notifications there.</span>
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input type="radio" name="lead-dest" checked={useWebhook} onChange={() => setUseWebhook(true)} className="mt-1" />
                <span>
                  <span className="block text-sm font-semibold text-ink-800">A webhook</span>
                  <span className="block text-xs text-ink-500">Zapier, Make, n8n or your CRM. Each lead is POSTed as JSON.</span>
                </span>
              </label>
            </fieldset>
            {useWebhook && (
              <Field label="Webhook URL" hint="Saved to .env for netlify dev only. Set LEAD_WEBHOOK_URL in Netlify for the live site." error={err('leads.webhookUrl')}>
                <TextInput type="url" value={answers.leads.webhookUrl} onChange={(v) => set('leads', { webhookUrl: v })} placeholder="https://hooks.example.com/…" invalid={Boolean(err('leads.webhookUrl'))} />
              </Field>
            )}
            <Field label="Consent text" hint="Shown next to the required consent checkbox on every lead form. Have it reviewed for your market." error={err('leads.consentText')}>
              <textarea rows={4} value={answers.leads.consentText} onChange={(e) => set('leads', { consentText: e.target.value })} className={`${inputClass} ${err('leads.consentText') ? 'border-red-600' : ''}`} />
            </Field>
          </>
        )}

        {current === 'groups' && (
          <>
            <p className="text-sm text-ink-600">
              A group is the first part of a URL, such as <code>/austin</code>. Pages under it use the group's name and phone. A new group gets a starter page from the template.
            </p>
            {answers.groups.map((g, i) => (
              <div key={i} className="rounded-xl border border-ink-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-sm font-semibold text-ink-900">
                    /{g.key || '…'}
                    {g.previousKey && g.previousKey !== g.key && <span className="ml-2 font-sans text-xs font-normal text-amber-700">renames /{g.previousKey} and its pages</span>}
                    {!g.previousKey && <span className="ml-2 font-sans text-xs font-normal text-emerald-700">new</span>}
                  </p>
                  <button type="button" onClick={() => setGroups((gs) => gs.filter((_, j) => j !== i))} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" aria-hidden /> Remove
                  </button>
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="URL key" hint="Lowercase letters, numbers and hyphens." error={err(`groups.${i}.key`)}>
                    <TextInput value={g.key} onChange={(v) => setGroups((gs) => gs.map((x, j) => (j === i ? { ...x, key: v.trim().toLowerCase() } : x)))} invalid={Boolean(err(`groups.${i}.key`))} />
                  </Field>
                  <Field label="Display name" hint="Fills {{groupName}}, e.g. Austin." error={err(`groups.${i}.name`)}>
                    <TextInput value={g.name} onChange={(v) => setGroups((gs) => gs.map((x, j) => (j === i ? { ...x, name: v } : x)))} invalid={Boolean(err(`groups.${i}.name`))} />
                  </Field>
                  <Field label="Region name" hint="Fills {{regionName}}. Blank uses the display name.">
                    <TextInput value={g.regionName} onChange={(v) => setGroups((gs) => gs.map((x, j) => (j === i ? { ...x, regionName: v } : x)))} />
                  </Field>
                  <Field label="State abbreviation" hint="Optional. Fills {{stateAbbr}}.">
                    <TextInput value={g.stateAbbr} onChange={(v) => setGroups((gs) => gs.map((x, j) => (j === i ? { ...x, stateAbbr: v } : x)))} />
                  </Field>
                  <Field label="Phone override" hint="Blank uses the main phone." error={err(`groups.${i}.phone`)}>
                    <TextInput type="tel" value={g.phone} onChange={(v) => setGroups((gs) => gs.map((x, j) => (j === i ? { ...x, phone: v } : x)))} invalid={Boolean(err(`groups.${i}.phone`))} />
                  </Field>
                </div>
              </div>
            ))}
            {removed.map((o) => (
              <div key={o.key} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                <span>
                  <span className="font-mono font-semibold">/{o.key}</span> and every page under it will be deleted.
                </span>
                <button type="button" onClick={() => setGroups((gs) => [...gs, o])} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium hover:bg-red-100">
                  <Undo2 className="h-4 w-4" aria-hidden /> Keep it
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setGroups((gs) => [...gs, emptyGroup()])} className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold text-ink-900 ring-1 ring-inset ring-ink-300 hover:bg-ink-50">
              <Plus className="h-4 w-4" aria-hidden /> Add a group
            </button>
          </>
        )}

        {current === 'publishing' && (
          <>
            <Field label="GitHub repository" hint="owner/name. The CMS commits content edits here." error={err('publishing.repo')}>
              <TextInput value={answers.publishing.repo} onChange={(v) => set('publishing', { repo: v.trim() })} placeholder="your-name/your-site" invalid={Boolean(err('publishing.repo'))} />
            </Field>
            <Field label="Site URL" hint="Your Netlify URL for now (https://your-site.netlify.app). Change it when you add a custom domain. Used for share cards and the CMS login." error={err('publishing.siteUrl')}>
              <TextInput type="url" value={answers.publishing.siteUrl} onChange={(v) => set('publishing', { siteUrl: v.trim() })} invalid={Boolean(err('publishing.siteUrl'))} />
            </Field>
          </>
        )}

        {current === 'review' && (
          <>
            {Object.keys(errors).length > 0 && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-semibold">Some answers need fixing:</p>
                <ul className="mt-1 list-disc pl-5">
                  {Object.entries(errors).map(([k, msg]) => (
                    <li key={k}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="font-semibold text-ink-600">Business</dt>
              <dd>
                {b.businessName} · {b.phone}
              </dd>
              <dt className="font-semibold text-ink-600">Colors</dt>
              <dd className="flex items-center gap-2">
                <span className="h-4 w-4 rounded" style={{ background: answers.brand.primary }} /> {answers.brand.primary}
                <span className="ml-2 h-4 w-4 rounded" style={{ background: answers.brand.accent }} /> {answers.brand.accent}
              </dd>
              <dt className="font-semibold text-ink-600">Tag Manager</dt>
              <dd>{answers.tracking.gtmId || 'None'}</dd>
              <dt className="font-semibold text-ink-600">Search engines</dt>
              <dd>{answers.tracking.noindex ? 'Hidden (noindex)' : 'Indexed'}</dd>
              <dt className="font-semibold text-ink-600">Leads</dt>
              <dd className="break-all">{effective.leads.webhookUrl || 'Netlify Forms'}</dd>
              <dt className="font-semibold text-ink-600">Groups</dt>
              <dd>{answers.groups.map((g) => `/${g.key}`).join(', ') || 'None'}</dd>
              <dt className="font-semibold text-ink-600">Publishing</dt>
              <dd className="break-all">
                {answers.publishing.repo} · {answers.publishing.siteUrl}
              </dd>
            </dl>
            <div>
              <h2 className="text-sm font-semibold text-ink-800">Files that will change</h2>
              {!preview ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-ink-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking…
                </p>
              ) : (
                <ul className="mt-2 space-y-1 font-mono text-sm">
                  {preview.changes.length === 0 && <li className="text-ink-500">No changes.</li>}
                  {preview.changes.map((c) => (
                    <li key={c.path} className={c.action === 'delete' ? 'text-red-700' : c.action === 'create' ? 'text-emerald-700' : 'text-ink-700'}>
                      {c.action.padEnd(6, ' ')} {c.path}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {status.kind === 'error' && <p className="mt-6 text-sm font-medium text-red-700">Save failed: {status.message}</p>}
      {showErrors && stepErrors.length > 0 && <p className="mt-6 text-sm font-medium text-red-700">Fix the highlighted fields to continue.</p>}

      <div className="mt-10 flex items-center justify-between gap-3 border-t border-ink-200 pt-6">
        <button
          type="button"
          onClick={() => {
            setShowErrors(false);
            setStep((s) => Math.max(s - 1, 0));
          }}
          disabled={step === 0}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold text-ink-900 ring-1 ring-inset ring-ink-300 hover:bg-ink-50 disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </button>
        {current === 'review' ? (
          <button type="button" onClick={save} disabled={status.kind === 'saving'} className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 font-semibold text-white hover:bg-zinc-800 disabled:opacity-60">
            {status.kind === 'saving' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save setup
          </button>
        ) : (
          <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 font-semibold text-white hover:bg-zinc-800">
            Next <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-50 font-sans text-ink-900 antialiased">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-ink-200 sm:p-10">{children}</div>
      </main>
    </div>
  );
}
