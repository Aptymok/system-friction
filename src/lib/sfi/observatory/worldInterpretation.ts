import 'server-only';

import { runLlmTask, type LlmProviderId } from '@/lib/ai/providerRouter';
import type { SfiWorldInterfaceState } from '../worldInterfaceState';

export type SfiWorldInterpretation = {
  text: string;
  provider: LlmProviderId;
  model: string;
  generatedAt: string;
  degraded: boolean;
};

type DomainReading = {
  domain: string;
  value: number;
  band: 'URGENCIA' | 'CRITICIDAD_MEDIA' | 'ADECUACION_RELATIVA';
  gapToCore: number;
  gapToOptimum: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function fixed(value: number, digits = 2) {
  return value.toFixed(digits);
}

function domainBand(value: number): DomainReading['band'] {
  if (value < 0.34) return 'URGENCIA';
  if (value < 0.67) return 'CRITICIDAD_MEDIA';
  return 'ADECUACION_RELATIVA';
}

function buildLocalFieldNarrative(args: {
  ihg: number;
  nti: number;
  ldi: number;
  wsv: number;
  strongest: DomainReading | null;
  weakest: DomainReading | null;
  mediumDomains: DomainReading[];
  urgentDomains: DomainReading[];
}) {
  const { ihg, nti, ldi, wsv, strongest, weakest, mediumDomains, urgentDomains } = args;
  const support = strongest ? `${strongest.domain} sostiene la mayor carga relativa del campo` : 'no hay dominio dominante verificable';
  const weak = weakest ? `${weakest.domain} concentra la mayor brecha hacia el óptimo (${fixed(weakest.gapToOptimum)})` : 'no hay debilidad principal verificable';
  const medium = mediumDomains.length ? mediumDomains.map((d) => d.domain).join(', ') : 'sin dominios medios detectables';
  const urgent = urgentDomains.length ? urgentDomains.map((d) => d.domain).join(', ') : 'sin dominios en urgencia detectable';
  const ldiClause = ldi <= 0.05
    ? 'LDI casi nulo no debe leerse como ausencia de desgaste: puede indicar clausura de variabilidad, medición insuficiente o normalización de la fricción.'
    : 'LDI aporta desgaste observable y debe cruzarse con la distribución por dominio.';

  return `La configuración del campo no es homogénea. WSV ${fixed(wsv)} indica persistencia del vector observado, no equilibrio pleno. IHG ${fixed(ihg * 100, 1)}/100 y NTI ${fixed(nti * 100, 1)}/100 colocan al sistema en tensión media: existe continuidad, pero no resolución estructural. ${support}; ${weak}. Dominios en criticidad media: ${medium}. Dominios en urgencia: ${urgent}. ${ldiClause} Eventos culturales de alta carga, incluido fútbol o ciclos masivos de atención, pueden elevar temporalmente la señal cultural y simular equilibrio social; se requiere observación posterior al evento para validar si la persistencia continúa o se desinfla.`;
}

export async function buildWorldInterpretation(
  state: Pick<SfiWorldInterfaceState, 'coreIndicators' | 'domainBreakdown' | 'nodes' | 'generatedAt'>,
): Promise<SfiWorldInterpretation> {
  const { ihg, nti, ldi, wsv } = state.coreIndicators;
  const topNodes = [...state.nodes]
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 5)
    .map((n) => `${n.label}: estado=${n.state}, intensidad=${n.intensity.toFixed(2)}`)
    .join('; ');

  const domainReadings: DomainReading[] = state.domainBreakdown
    .filter((d) => d.value !== null)
    .map((d) => {
      const value = clamp01(d.value as number);
      return {
        domain: d.domain,
        value,
        band: domainBand(value),
        gapToCore: value,
        gapToOptimum: 1 - value,
      };
    })
    .sort((a, b) => b.value - a.value);

  const strongest = domainReadings[0] ?? null;
  const weakest = domainReadings.at(-1) ?? null;
  const urgentDomains = domainReadings.filter((d) => d.band === 'URGENCIA');
  const mediumDomains = domainReadings.filter((d) => d.band === 'CRITICIDAD_MEDIA');
  const adequateDomains = domainReadings.filter((d) => d.band === 'ADECUACION_RELATIVA');
  const domains = domainReadings
    .map((d) => `${d.domain}=valor:${fixed(d.value)} banda:${d.band} brecha_nucleo:${fixed(d.gapToCore)} brecha_optimo:${fixed(d.gapToOptimum)}`)
    .join(', ');

  const localNarrative = buildLocalFieldNarrative({
    ihg: ihg.value,
    nti: nti.value,
    ldi: ldi.value,
    wsv: wsv.value,
    strongest,
    weakest,
    mediumDomains,
    urgentDomains,
  });

  const prompt = `DATOS SFI DEL CAMPO\ngenerated_at=${state.generatedAt}\nIHG=${(ihg.value * 100).toFixed(1)}/100\nNTI=${(nti.value * 100).toFixed(1)}/100\nLDI=${(ldi.value * 100).toFixed(1)}/100\nWSV=${wsv.value.toFixed(2)}\nDominios=${domains || 'none'}\nDominios_adecuacion_relativa=${adequateDomains.map((d) => d.domain).join(', ') || 'none'}\nDominios_criticidad_media=${mediumDomains.map((d) => d.domain).join(', ') || 'none'}\nDominios_urgencia=${urgentDomains.map((d) => d.domain).join(', ') || 'none'}\nNodo_dominante=${strongest ? strongest.domain : 'none'}\nNodo_mas_comprometido=${weakest ? weakest.domain : 'none'}\nTop_nodes=${topNodes || 'none'}\n\nEscribe un solo párrafo clínico en español para la LECTURA DEL DÍA del System Friction Institute. Reglas obligatorias: no digas que el sistema tiene buen desempeño general; no interpretes valores altos como positivos por defecto; no interpretes estabilidad como bienestar; WSV alto o medio significa persistencia del vector, no equilibrio pleno; LDI bajo o cero debe tratarse como posible clausura de variabilidad, medición insuficiente o normalización de fricción, no como ausencia automática de problema; observa brechas al núcleo y al óptimo; identifica tensiones entre dominios; separa dominios que sostienen la forma de dominios que concentran urgencia; si CULTURAL está alto, advierte que eventos masivos como fútbol pueden producir equilibrio aparente temporal y exige observación post-evento; termina con una propuesta operacional concreta de observación, no con tranquilidad.`;

  const result = await runLlmTask({
    task: 'graph_interpretation',
    system: 'Eres el narrador operativo del SFI. Interpretas vectores, brechas, tensiones de dominio, memoria y persistencia. No produces resúmenes optimistas de business intelligence. Devuelve solo análisis ligado a los datos proporcionados.',
    prompt,
    fallbackResult: localNarrative,
    maxTokens: 320,
  });

  return {
    text: result.result,
    provider: result.provider,
    model: result.model,
    generatedAt: new Date().toISOString(),
    degraded: !result.ok,
  };
}
