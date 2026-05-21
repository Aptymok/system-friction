export type SourceKind = 'webhook' | 'oauth' | 'manual' | 'cron' | 'fixture' | 'public-api';

export type SourceAdapterDescriptor = {
  sourceId: string;
  kind: SourceKind;
  displayName: string;
  readOnly: boolean;
  requiresSignature: boolean;
};

