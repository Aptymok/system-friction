import type { WorldVectorReport } from '../types';

export type WorldVectorPublicationDraft = {
  kind: 'linkedin_draft' | 'repository_entry' | 'medium_seed';
  title: string;
  body: string;
  source_report: WorldVectorReport | Record<string, unknown> | null;
  warnings: string[];
  publication: {
    external_publish_performed: false;
    reason: 'manual_approval_required';
  };
};
