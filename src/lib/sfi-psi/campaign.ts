import type { SfiCampaignProposal, SfiLabAnalysis, SfiMediaPlan } from './types';

function primaryLabel(analysis: Pick<SfiLabAnalysis, 'nodes' | 'signals' | 'reappearances'>) {
  return analysis.nodes[0]?.name || analysis.signals[0]?.name || analysis.reappearances[0]?.pattern || 'señal persistente en observación';
}

export function buildCampaignProposal(analysis: Pick<SfiLabAnalysis, 'analysisId' | 'nodes' | 'signals' | 'reappearances' | 'sfiVector'>): SfiCampaignProposal {
  const label = primaryLabel(analysis);
  const persistence = Math.round(analysis.sfiVector.P * 100);
  const isNode = analysis.nodes.length > 0;

  return {
    id: `campaign-${analysis.analysisId}`,
    title: isNode ? `Hipótesis de campaña para nodo emergente: ${label}` : `Hipótesis de campaña para señal débil: ${label}`,
    audience: 'lectores institucionales, operadores culturales, aliados de investigación y público con interés en señales persistentes',
    recommendedFormat: isNode ? 'serie breve de publicación + pieza visual sobria + video corto' : 'publicación de observación + carrusel explicativo + seguimiento longitudinal',
    hypothesis: `La campaña debe observar la probabilidad de persistencia de "${label}" sin prometer viralidad. Estado actual: ${persistence}% de persistencia relativa en esta ventana.`,
    posts: [
      `Una señal débil no se confirma por intensidad; se confirma por retorno. "${label}" entra en ventana de observación.`,
      `SFI registra un patrón con probabilidad de persistencia ${persistence}%. La hipótesis no es cierre: es seguimiento.`,
      `Nodo emergente o ruido recurrente: la diferencia se decide por reaparición, utilidad y tolerancia al paso del tiempo.`,
    ],
    captions: [
      `Ventana de observación abierta para "${label}". Persistencia antes que volumen.`,
      `Señal débil detectada. Próximo criterio: retorno bajo baja coherencia.`,
      `Hipótesis de campaña: hacer visible la trayectoria sin sobreactuar la evidencia.`,
    ],
    visualPrompts: [
      `Campo negro SFI, trazos blancos finos, un foco dorado mínimo, patrón "${label}" reapareciendo como línea longitudinal, sobrio institucional.`,
      `Mapa de nodos emergentes, baja saturación, tipografía editorial, señal débil convertida en trayectoria observacional.`,
      `Sistema de reapariciones sobre fondo negro, tres marcas temporales, dorado mínimo, sin estética SaaS, sin promesa viral.`,
    ],
    shortVideoScript: `Plano 1: campo negro con una reaparición mínima. Plano 2: tres retornos forman una señal débil. Plano 3: la señal conserva identidad y abre una hipótesis de campaña. Cierre: "Persistencia antes que ruido. SFI."`,
    publicationProposal: `Medium/LinkedIn: "De señal débil a nodo emergente: una lectura SFI de ${label}". Estructura: entrada observable, reapariciones detectadas, variables SFI, límites de evidencia y próxima ventana de observación.`,
    hashtags: ['#SystemFrictionInstitute', '#SFILab', '#SeñalDébil', '#NodoEmergente', '#ObservaciónLongitudinal'],
  };
}

export function buildMediaPlan(analysis: Pick<SfiLabAnalysis, 'analysisId' | 'nodes' | 'signals' | 'reappearances' | 'campaign'>): SfiMediaPlan {
  const label = primaryLabel(analysis);
  const hasHf = Boolean(process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY);
  const hasGoogle = Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);

  return {
    id: `media-${analysis.analysisId}`,
    imagePrompts: analysis.campaign.visualPrompts,
    videoPrompts: [
      `Video vertical SFI de 12 segundos: "${label}" pasa de evento a reaparición, señal y nodo emergente; negro, blanco, dorado mínimo, institucional.`,
      `Storyboard sobrio: archivo o señal inicial, normalización, reaparición, hipótesis de campaña, próxima ventana de observación.`,
    ],
    audioDirection: [
      'pulso bajo, textura mínima, sin dramatización',
      'silencio operativo con tono grave recurrente',
      'cierre seco, institucional, sin promesa de viralidad',
    ],
    shotList: [
      'Entrada: archivo/señal en campo negro',
      'Normalización: tokens y repeticiones se ordenan en líneas finas',
      'Reaparición: tres marcas temporales sostienen el patrón',
      'Nodo SFI: foco dorado mínimo sobre identidad conservada',
      'Salida: hipótesis y ventana de observación',
    ],
    publishPlan: [
      'Día 1: publicar hipótesis de campaña y primer visual',
      'Día 3: publicar seguimiento de señal débil con limitaciones',
      'Día 7: revisar recurrencia y decidir si escala a nodo operativo',
    ],
    providerPriority: ['huggingface', 'google', 'local deterministic fallback'],
    providerStatus: {
      huggingface: hasHf ? 'configured' : 'missing_key',
      google: hasGoogle ? 'configured' : 'missing_key',
      fallback: 'available',
    },
    renderEndpoint: '/api/sfi/media/render',
    placeholders: [
      `placeholder:image:${label}`,
      `placeholder:video-storyboard:${label}`,
    ],
  };
}
