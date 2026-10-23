import type { PageContent, SiteContent } from '../content/types';
import type { ExperimentTag } from '../components/LeadForm';

export interface LayoutProps {
  page: PageContent;
  site: SiteContent;
  /** Passed to the lead form so submissions carry the arm. */
  experiment: ExperimentTag;
}
