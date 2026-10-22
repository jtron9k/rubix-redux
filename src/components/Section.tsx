import type { ReactNode } from 'react';

interface Props {
  id?: string;
  tone?: 'white' | 'tint' | 'dark';
  className?: string;
  children: ReactNode;
}

const TONES = {
  white: 'bg-white',
  tint: 'bg-brand-50',
  dark: 'bg-ink-900 text-white',
};

export function Section({ id, tone = 'white', className = '', children }: Props) {
  return (
    <section id={id} className={`${TONES[tone]} px-4 py-16 sm:px-6 md:py-24 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function SectionHeading({ title, intro, center = true, light = false }: { title: string; intro?: string; center?: boolean; light?: boolean }) {
  return (
    <div className={`mb-10 md:mb-14 ${center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}`}>
      <h2 className={`font-display text-3xl font-bold tracking-tight md:text-4xl ${light ? 'text-white' : 'text-ink-900'}`}>{title}</h2>
      {intro && <p className={`mt-4 text-lg ${light ? 'text-white/80' : 'text-ink-600'}`}>{intro}</p>}
    </div>
  );
}
