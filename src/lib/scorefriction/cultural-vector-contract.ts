export type CulturalRegime =
  | 'Latente'
  | 'Proto-crítico'
  | 'Cristalizando'
  | 'Saturado';

export type CulturalVector = {
  cvphi: number;
  regime: CulturalRegime;
  NTI_C: number;
  IHG_C: number;
  ICE_C: number;
  CRM_C: number;
  FS_C: number;
  LCP: number;
  PAC: number;
  VFE: number;
  SCR: number;
};

export type PlatformVector = {
  youtube: number;
  tiktok: number;
  soundcloud: number;
  spotify: number;
  lyrics: number;
  appleMusic?: number;
  reddit?: number;
  shazam?: number;
};

export type CulturalInterpretation = {
  phenomenon: string;
  friction: string;
  proposal: string;
  producerBrief?: string;
};

export type CulturalVectorResponse = {
  case_id: string;
  case_name: string;
  cultural_vector: CulturalVector;
  sources: PlatformVector;
  interpretation: CulturalInterpretation;
  evidence?: {
    latest_hash?: string;
    observation_count?: number;
    last_observed_at?: string;
    warning?: string;
  };
};

export type CulturalWaveCase = {
  case_id: string;
  name: string;
  phenomenon: string;
  friction: string;
  hypothesis: string;
  seedVector: Omit<CulturalVector, 'cvphi' | 'regime'>;
  sources: PlatformVector;
  prototypeHint: {
    bpm: string;
    rhythm: string;
    instruments: string[];
    lyricsAxis: string[];
    platformTargets: string[];
  };
};
