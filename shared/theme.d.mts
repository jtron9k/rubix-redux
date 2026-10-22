export function hexToRgb(hex: string | null | undefined): [number, number, number] | null;
export function colorScale(hex: string | null | undefined, fallback?: string): Record<string, string>;
export function themeCss(brand: { primary?: string; accent?: string } | undefined): string;
