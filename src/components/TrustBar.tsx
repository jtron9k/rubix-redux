import type { TrustItem } from '../content/types';
import { resolveIcon } from '../content/iconMap';

export function TrustBar({ items }: { items: TrustItem[] }) {
  if (!items?.length) return null;
  return (
    <div className="border-y border-ink-100 bg-white px-4 py-6 sm:px-6">
      <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((item) => {
          const Icon = resolveIcon(item.icon);
          return (
            <li key={item.label} className="flex items-center gap-3 text-sm font-semibold text-ink-800 md:text-base">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              {item.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
