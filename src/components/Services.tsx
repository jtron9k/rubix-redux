import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ServicesContent } from '../content/types';
import { resolveIcon } from '../content/iconMap';
import { Img } from './Img';
import { Inline } from './Markdown';
import { Section, SectionHeading } from './Section';

export function Services({ content, tone = 'white' }: { content: ServicesContent; tone?: 'white' | 'tint' }) {
  if (!content?.items?.length) return null;
  return (
    <Section id="services" tone={tone}>
      <SectionHeading title={content.heading} intro={content.intro} />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {content.items.map((item) => {
          const Icon = resolveIcon(item.icon);
          const body = (
            <>
              {item.image && <Img image={item.image} width={600} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="aspect-[4/3] w-full object-cover" />}
              <div className="p-6">
                <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand-700">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="text-lg font-semibold text-ink-900">{item.title}</h3>
                <p className="mt-2 text-ink-600">
                  <Inline>{item.body}</Inline>
                </p>
                {item.href && (
                  <span className="mt-4 inline-flex items-center gap-1 font-semibold text-brand-700">
                    Learn more <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                )}
              </div>
            </>
          );
          const cls = 'block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-100 transition';
          return item.href ? (
            <Link key={item.title} to={item.href} className={`${cls} hover:-translate-y-0.5 hover:shadow-md`}>
              {body}
            </Link>
          ) : (
            <div key={item.title} className={cls}>
              {body}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
