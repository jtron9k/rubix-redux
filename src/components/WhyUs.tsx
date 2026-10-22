import type { WhyUsContent } from '../content/types';
import { resolveIcon } from '../content/iconMap';
import { Img } from './Img';
import { Inline } from './Markdown';
import { Section, SectionHeading } from './Section';

export function WhyUs({ content, tone = 'tint' }: { content: WhyUsContent; tone?: 'white' | 'tint' }) {
  if (!content?.points?.length) return null;
  return (
    <Section tone={tone}>
      <div className={`grid items-center gap-12 ${content.image ? 'lg:grid-cols-2' : ''}`}>
        <div>
          <SectionHeading title={content.heading} intro={content.intro} center={!content.image} />
          <div className={`grid gap-6 ${content.image ? '' : 'md:grid-cols-3'}`}>
            {content.points.map((p) => {
              const Icon = resolveIcon(p.icon);
              return (
                <div key={p.title} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-100 text-accent-700">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink-900">{p.title}</h3>
                    <p className="mt-1 text-ink-600">
                      <Inline>{p.body}</Inline>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {content.image && <Img image={content.image} width={700} sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lg" />}
      </div>
    </Section>
  );
}
