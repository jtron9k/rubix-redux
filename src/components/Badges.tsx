import type { ImageRef } from '../content/types';
import { Img } from './Img';

export function Badges({ badges }: { badges: ImageRef[] | undefined }) {
  if (!badges?.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      {badges.map((b) => (
        <Img key={b.src} image={b} width={160} className="h-16 w-auto md:h-20" />
      ))}
    </div>
  );
}
