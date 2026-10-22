// Brand color scales: 600 is the chosen color, lighter shades mix toward white, darker toward black.

const MIX = {
  50: ['w', 0.95],
  100: ['w', 0.9],
  200: ['w', 0.75],
  300: ['w', 0.6],
  400: ['w', 0.4],
  500: ['w', 0.2],
  600: ['w', 0],
  700: ['b', 0.2],
  800: ['b', 0.4],
  900: ['b', 0.6],
};

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** { 50: 'r g b', ..., 900: 'r g b' } for use as `rgb(var(--x-600) / <alpha>)`. */
export function colorScale(hex, fallback = '#2563eb') {
  const rgb = hexToRgb(hex) ?? hexToRgb(fallback);
  const out = {};
  for (const [shade, [toward, amt]] of Object.entries(MIX)) {
    const target = toward === 'w' ? 255 : 0;
    out[shade] = rgb.map((c) => Math.round(c + (target - c) * amt)).join(' ');
  }
  return out;
}

export function themeCss(brand) {
  const lines = [];
  for (const [name, hex] of [['brand', brand?.primary], ['accent', brand?.accent]]) {
    for (const [shade, rgb] of Object.entries(colorScale(hex, name === 'brand' ? '#2563eb' : '#f59e0b'))) {
      lines.push(`--${name}-${shade}: ${rgb};`);
    }
  }
  return `:root{${lines.join('')}}`;
}
