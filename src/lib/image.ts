// Raster images go through the Netlify Image CDN in production. SVGs and dev builds use the
// original file. `vite preview` has no image CDN, so production builds served locally show
// broken rasters; use `netlify dev` or a deploy preview instead.

export function imageUrl(src: string | undefined, width?: number): string {
  if (!src) return '';
  if (import.meta.env.DEV || /\.svg(\?|$)/i.test(src) || src.startsWith('data:')) return src;
  const params = new URLSearchParams({ url: src });
  if (width) params.set('w', String(width));
  return `/.netlify/images?${params.toString()}`;
}

export function imageSrcSet(src: string | undefined, widths: number[]): string | undefined {
  if (!src || import.meta.env.DEV || /\.svg(\?|$)/i.test(src)) return undefined;
  return widths.map((w) => `${imageUrl(src, w)} ${w}w`).join(', ');
}
