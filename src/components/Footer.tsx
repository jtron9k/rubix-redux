import { Clock, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { FooterContent, SiteContent } from '../content/types';
import { Img } from './Img';
import { Inline } from './Markdown';
import { PhoneLink } from './PhoneLink';

export function Footer({ content, site }: { content: FooterContent; site: SiteContent }) {
  return (
    <footer className="bg-ink-950 px-4 py-14 text-ink-300 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
        <div>
          <Img image={site.logo} width={160} className="h-9 w-auto brightness-0 invert" />
          <p className="mt-4 text-sm">
            <Inline>{content.blurb}</Inline>
          </p>
        </div>
        <ul className="space-y-3 text-sm">
          <li>
            <PhoneLink site={site} location="footer" className="text-lg font-semibold text-white hover:underline" />
          </li>
          {site.email && (
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" aria-hidden />
              <a href={`mailto:${site.email}`} className="hover:underline">{site.email}</a>
            </li>
          )}
          {site.hoursText && (
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {site.hoursText}
            </li>
          )}
          {site.serviceAreaText && (
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {site.serviceAreaText}
            </li>
          )}
        </ul>
        {content.links && content.links.length > 0 && (
          <ul className="space-y-2 text-sm">
            {content.links.map((l) => (
              <li key={l.label}>
                {l.href?.startsWith('/') ? (
                  <Link to={l.href} className="hover:text-white hover:underline">{l.label}</Link>
                ) : (
                  <a href={l.href} className="hover:text-white hover:underline">{l.label}</a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mx-auto mt-10 max-w-6xl border-t border-white/10 pt-6 text-xs text-ink-500">
        <p>
          © {new Date().getFullYear()} {site.businessName}. {site.address}
        </p>
        {site.licenseText && <p className="mt-1">{site.licenseText}</p>}
      </div>
    </footer>
  );
}
