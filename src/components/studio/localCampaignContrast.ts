import type { ReleaseDirection } from './localReleaseMaterials';

export type CampaignVariant = {
  id: 'A' | 'B';
  hypothesis: string;
  caption: string;
  primaryMetric: 'save_rate' | 'meaningful_interaction_rate';
  requiredEvidence: string[];
};
export type CampaignObserved = {
  variant: 'A' | 'B';
  url: string;
  observedAt: string;
  impressions: number;
  saves: number;
  meaningfulInteractions: number;
  source: 'MANUAL_PLATFORM_READBACK';
};
export type CampaignComparison = {
  status: 'NOT_OBSERVED' | 'INCOMPLETE' | 'CONTRASTABLE';
  reason: string;
  observations: CampaignObserved[];
  rates: Array<{ variant: 'A' | 'B'; saveRate: number; meaningfulInteractionRate: number }>;
  relativeOutcome: 'A_HIGHER_OBSERVED' | 'B_HIGHER_OBSERVED' | 'TIED_OBSERVED' | 'NOT_ASSESSABLE';
  winnerCertified: false;
};

export function proposeCampaignVariants(direction: ReleaseDirection): CampaignVariant[] {
  const title = direction.title.trim() || 'Obra sin título';
  const artist = direction.artist.trim() || 'Artista';
  const concept = direction.concept.trim();
  return [
    {
      id: 'A',
      hypothesis: 'Una presentación centrada en la identidad y el concepto de la obra genera mayor interés verificable.',
      caption: [title + ' — ' + artist, concept || 'Nueva obra musical.', 'Escucha la obra cuando esté disponible.'].join('\n'),
      primaryMetric: 'save_rate',
      requiredEvidence: ['ID o URL del post real', 'Fecha de lectura', 'Impresiones observadas', 'Guardados observados'],
    },
    {
      id: 'B',
      hypothesis: 'Una presentación centrada en las características de escucha genera mayor interés verificable.',
      caption: [title + ' — ' + artist, 'Escucha el fragmento y descubre su construcción sonora.', 'Disponible cuando se confirme el lanzamiento.'].join('\n'),
      primaryMetric: 'save_rate',
      requiredEvidence: ['ID o URL del post real', 'Fecha de lectura', 'Impresiones observadas', 'Guardados observados'],
    },
  ];
}
function validRecord(input: CampaignObserved): boolean {
  if (!/^https:\/\/[^\s]+$/i.test(input.url) || !Number.isFinite(Date.parse(input.observedAt))) return false;
  if (input.source !== 'MANUAL_PLATFORM_READBACK') return false;
  const fields = [input.impressions,input.saves,input.meaningfulInteractions];
  if (!fields.every(n => Number.isSafeInteger(n) && n >= 0)) return false;
  return input.impressions > 0 && input.saves <= input.impressions &&
    input.meaningfulInteractions <= input.impressions;
}
export function contrastCampaignObservations(observations: CampaignObserved[]): CampaignComparison {
  const relevant = observations.filter(validRecord);
  const base: CampaignComparison = {
    status: 'NOT_OBSERVED',
    reason: 'La evaluación requiere métricas reales de publicaciones verificables.',
    observations: relevant,
    rates: [],
    relativeOutcome: 'NOT_ASSESSABLE',
    winnerCertified: false,
  };
  if (!observations.length) return base;
  if (relevant.length !== observations.length) return {...base,status:'INCOMPLETE',reason:'Hay lecturas incompletas, inválidas o sin URL de publicación.'};
  if (relevant.length !== 2 || relevant[0].variant === relevant[1].variant) return {
    ...base,status:'INCOMPLETE',reason:'Se requiere una lectura por cada una de las variantes A y B.',
  };
  if (relevant[0].url === relevant[1].url) return {
    ...base,status:'INCOMPLETE',reason:'Las variantes deben corresponder a publicaciones distintas.',
  };
  const dates = relevant.map(row=>Date.parse(row.observedAt));
  if (Math.abs(dates[0]-dates[1]) > 24*60*60*1000) return {
    ...base,status:'INCOMPLETE',reason:'Las observaciones se tomaron con más de 24 horas de diferencia; ajustar la ventana de lectura.',
  };
  const rates = relevant.map(row=>({
    variant:row.variant,
    saveRate:Number((row.saves/row.impressions).toFixed(6)),
    meaningfulInteractionRate:Number((row.meaningfulInteractions/row.impressions).toFixed(6)),
  }));
  const a=rates.find(row=>row.variant==='A')!;
  const b=rates.find(row=>row.variant==='B')!;
  return {
    status:'CONTRASTABLE',
    reason:'Comparación descriptiva de tasas observadas, sin corrección por composición de audiencias, aleatorización ni causalidad.',
    observations:relevant,
    rates,
    relativeOutcome:a.saveRate>b.saveRate?'A_HIGHER_OBSERVED':b.saveRate>a.saveRate?'B_HIGHER_OBSERVED':'TIED_OBSERVED',
    winnerCertified:false,
  };
}
