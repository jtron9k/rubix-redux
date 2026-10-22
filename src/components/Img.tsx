import type { ImageRef } from '../content/types';
import { imageSrcSet, imageUrl } from '../lib/image';

interface Props {
  image: ImageRef | undefined;
  width: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export function Img({ image, width, className = '', sizes, priority = false }: Props) {
  if (!image?.src) return null;
  return (
    <img
      src={imageUrl(image.src, width)}
      srcSet={imageSrcSet(image.src, [Math.round(width / 2), width, width * 2])}
      sizes={sizes}
      alt={image.alt ?? ''}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
    />
  );
}
