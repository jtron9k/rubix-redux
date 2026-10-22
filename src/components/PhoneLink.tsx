import type { ReactNode } from 'react';
import { telHref } from '../../shared/content-core.mjs';
import type { SiteContent } from '../content/types';
import { pushEvent } from '../lib/analytics';

interface Props {
  site: SiteContent;
  /** Where on the page the link sits, reported as cta_location. */
  location: string;
  className?: string;
  children?: ReactNode;
}

/** The only place tel: links are built. Pushes phone_click with the page and group. */
export function PhoneLink({ site, location, className = '', children }: Props) {
  const href = telHref(site.phone);
  if (!href) return null;
  return (
    <a
      href={href}
      className={className}
      onClick={() =>
        pushEvent('phone_click', {
          phone: site.phone,
          cta_location: location,
          page_path: window.location.pathname,
          page_group: site.groupSlug,
        })
      }
    >
      {children ?? site.phone}
    </a>
  );
}
