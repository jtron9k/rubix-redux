import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Phone } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import type { FormConfig, FormField, SiteContent } from '../content/types';
import { pushEvent } from '../lib/analytics';
import { buildPayload, type FormValues, submitLead, validateField, validateFields } from '../lib/lead';
import { readTrackingParams } from '../lib/tracking';
import { Inline, Prose } from './Markdown';
import { PhoneLink } from './PhoneLink';

export interface ExperimentTag {
  experimentId?: string | null;
  experimentArm?: string | null;
}

interface Props extends ExperimentTag {
  form: FormConfig;
  site: SiteContent;
  className?: string;
}

const INPUT =
  'mt-1 block w-full rounded-xl border-0 bg-white px-4 py-3 text-base text-ink-900 shadow-sm ring-1 ring-inset ring-ink-300 placeholder:text-ink-400 focus:ring-2 focus:ring-inset focus:ring-brand-600';

const INPUT_TYPE: Record<FormField['type'], string> = {
  text: 'text',
  tel: 'tel',
  email: 'email',
  zip: 'text',
  date: 'date',
  select: 'text',
  textarea: 'text',
  number: 'number',
};

const AUTOCOMPLETE: Record<string, string> = { name: 'name', phone: 'tel', email: 'email', zip: 'postal-code' };

function FieldInput({ field, value, error, onChange }: { field: FormField; value: string; error?: string; onChange: (v: string) => void }) {
  const id = `lead-${field.name}`;
  const common = {
    id,
    name: field.name,
    value,
    required: field.required,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : undefined,
    className: `${INPUT} ${error ? 'ring-red-500' : ''}`,
  };
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink-800">
        {field.label}
        {!field.required && <span className="font-normal text-ink-500"> (optional)</span>}
      </label>
      {field.type === 'select' ? (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
          <option value="">{field.placeholder || 'Choose one'}</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea {...common} rows={3} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          {...common}
          type={INPUT_TYPE[field.type]}
          inputMode={field.type === 'zip' ? 'numeric' : field.type === 'tel' ? 'tel' : undefined}
          autoComplete={AUTOCOMPLETE[field.type === 'tel' ? 'phone' : field.type === 'zip' ? 'zip' : field.name] ?? 'off'}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Config-driven lead form. Multi-step mode shows one field per step plus a review step.
 * Posts JSON to /api/lead with the tracking params, page, group and experiment arm.
 */
export function LeadForm({ form, site, experimentId, experimentArm, className = '' }: Props) {
  const fields = form.fields ?? [];
  const steps = form.multiStep ? fields.length + 1 : 1;
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const isReview = form.multiStep && step === fields.length;
  const visible = form.multiStep ? (isReview ? [] : [fields[step]]) : fields;

  const set = (name: string, v: string) => {
    setValues((prev) => ({ ...prev, [name]: v }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const next = () => {
    const field = fields[step];
    const err = validateField(field, values[field.name]);
    if (err) {
      setErrors((prev) => ({ ...prev, [field.name]: err }));
      return;
    }
    pushEvent('form_step', { form_id: form.id, step: step + 1, step_name: field.name, page_path: window.location.pathname, page_group: site.groupSlug });
    setStep(step + 1);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.multiStep && !isReview) return next();
    const all = validateFields(fields, values);
    if (Object.keys(all).length) {
      setErrors(all);
      if (form.multiStep) setStep(fields.findIndex((f) => all[f.name]));
      return;
    }
    if (!consent) {
      setConsentError(true);
      return;
    }
    setStatus('sending');
    const body = buildPayload(form, values, consent, honeypot, {
      page: window.location.pathname,
      group: site.groupSlug,
      experimentId,
      experimentArm,
      tracking: readTrackingParams(window.location.search),
    });
    const ok = await submitLead(body);
    if (!ok) {
      setStatus('error');
      return;
    }
    pushEvent('generate_lead', {
      form_id: form.id,
      page_path: window.location.pathname,
      page_group: site.groupSlug,
      experiment_id: experimentId ?? '',
      experiment_arm: experimentArm ?? '',
    });
    setStatus('done');
  };

  const card = `relative rounded-3xl bg-white p-6 shadow-xl ring-1 ring-ink-100 md:p-8 ${className}`;

  if (status === 'done') {
    return (
      <div className={card} role="status">
        <CheckCircle2 className="h-12 w-12 text-brand-600" aria-hidden />
        <h2 className="mt-4 font-display text-2xl font-bold text-ink-900">
          <Inline>{form.successTitle}</Inline>
        </h2>
        <Prose className="mt-3 text-ink-600">{form.successBody}</Prose>
        <PhoneLink site={site} location="form_success" className="mt-6 inline-flex items-center gap-2 font-semibold text-brand-700 hover:underline">
          <Phone className="h-4 w-4" aria-hidden /> {site.phone}
        </PhoneLink>
      </div>
    );
  }

  return (
    <form className={card} onSubmit={submit} noValidate data-form-id={form.id}>
      <h2 className="font-display text-2xl font-bold text-ink-900">
        <Inline>{form.title}</Inline>
      </h2>
      {form.intro && (
        <p className="mt-2 text-ink-600">
          <Inline>{form.intro}</Inline>
        </p>
      )}
      {form.multiStep && (
        <div className="mt-5">
          <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-ink-500">
            <span>{isReview ? 'Review' : `Step ${step + 1} of ${steps}`}</span>
            <span>{Math.round((step / (steps - 1)) * 100)}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${(step / (steps - 1)) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {visible.map((f) => (
          <FieldInput key={f.name} field={f} value={values[f.name] ?? ''} error={errors[f.name] || undefined} onChange={(v) => set(f.name, v)} />
        ))}
        {isReview && (
          <dl className="divide-y divide-ink-100 rounded-xl bg-ink-50 px-4 text-sm">
            {fields.map((f, i) => (
              <div key={f.name} className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-ink-500">{f.label}</dt>
                <dd className="text-right font-medium text-ink-900">
                  {values[f.name] || '—'}{' '}
                  <button type="button" onClick={() => setStep(i)} className="ml-2 text-brand-700 underline underline-offset-2">
                    Edit
                  </button>
                </dd>
              </div>
            ))}
          </dl>
        )}

        {/* Honeypot: hidden from people, filled by bots. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Company
            <input type="text" name="company" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </label>
        </div>

        {(!form.multiStep || isReview) && (
          <div>
            <label className="flex items-start gap-3 text-xs leading-relaxed text-ink-600">
              <input
                type="checkbox"
                name="consent"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  setConsentError(false);
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-600"
              />
              <span>{site.consentText}</span>
            </label>
            {consentError && <p className="mt-1 text-sm text-red-600">Please check the box to continue.</p>}
          </div>
        )}
      </div>

      {status === 'error' && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
          Something went wrong sending your request. Please call us at{' '}
          <PhoneLink site={site} location="form_error" className="font-semibold underline" /> instead.
        </p>
      )}

      <div className="mt-6 flex gap-3">
        {form.multiStep && step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1 rounded-full px-4 py-3.5 font-semibold text-ink-700 ring-1 ring-inset ring-ink-300 hover:bg-ink-50">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </button>
        )}
        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-black px-6 py-3.5 text-base font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {status === 'sending' ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : form.multiStep && !isReview ? (
            <>
              Continue <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          ) : (
            form.submitLabel || 'Submit'
          )}
        </button>
      </div>
    </form>
  );
}
