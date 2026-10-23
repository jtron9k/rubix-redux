import { describe, expect, it } from 'vitest';
import { rewrite } from '../edge-functions/og-meta';

const html = `<head>
<title>Default</title>
<meta name="description" content="Default description" />
<meta property="og:title" content="Default" />
<meta property="og:description" content="Default description" />
<meta property="og:image" content="https://default.test/og.png" />
<meta property="og:url" content="https://default.test" />
<meta name="twitter:title" content="Default" />
<meta name="twitter:description" content="Default description" />
<meta name="twitter:image" content="https://default.test/og.png" />
</head>`;

describe('og-meta rewrite', () => {
  it('replaces every share tag using the request origin', () => {
    const out = rewrite(html, { title: 'Summer "Care" & More', description: 'Kids <3 camp', image: '/images/uploads/summer.png' }, 'https://my.site', '/austin/summer');
    expect(out).toContain('<title>Summer &quot;Care&quot; &amp; More</title>');
    expect(out).toContain('<meta name="description" content="Kids &lt;3 camp" />');
    expect(out).toContain('<meta property="og:title" content="Summer &quot;Care&quot; &amp; More" />');
    expect(out).toContain('<meta property="og:url" content="https://my.site/austin/summer" />');
    expect(out).toContain('<meta property="og:image" content="https://my.site/images/uploads/summer.png" />');
    expect(out).toContain('<meta name="twitter:image" content="https://my.site/images/uploads/summer.png" />');
    expect(out).not.toContain('Default');
  });

  it('keeps absolute images and leaves the default image when the card has none', () => {
    expect(rewrite(html, { title: 't', description: 'd', image: 'https://cdn.test/a.jpg' }, 'https://my.site', '/')).toContain('content="https://cdn.test/a.jpg"');
    expect(rewrite(html, { title: 't', description: 'd', image: '' }, 'https://my.site', '/')).toContain('content="https://default.test/og.png"');
  });
});
