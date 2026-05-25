type CommunicationIntent =
  | 'direct'
  | 'structured'
  | 'trace'
  | 'explanation'
  | 'overload'
  | 'disagreement'
  | 'action'
  | 'system_status';

type AmvVisibleFormatterInput = {
  rawReading?: unknown;
  communicationIntent?: CommunicationIntent;
  userCommand?: string;
  activatedPattern?: { palabra?: string; oracion_visible?: string; accion_sugerida?: string } | null;
  activatedSurface?: string | null;
  sourceTrace?: Record<string, unknown> | null;
  cognitiveTwinUxState?: Record<string, unknown> | null;
};

type AmvVisibleResponse = {
  primaryText: string;
  secondaryText?: string;
  traceText?: string;
  actionLabel?: string;
};

function textFrom(input: unknown) {
  if (typeof input === 'string') return input;
  if (!input || typeof input !== 'object') return '';
  const record = input as Record<string, unknown>;
  return String(record.message || record.visibleReading || record.primaryText || record.summary || record.meaning || '');
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCommand(command = '') {
  return command
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function detectIntent(command = '', fallback: CommunicationIntent = 'direct'): CommunicationIntent {
  const normalized = normalizeCommand(command);
  if (/(desglosa|estructura|trazabilidad|por partes|origen)/.test(normalized)) return 'trace';
  if (/(no entiendo|por que|porque dices|explica)/.test(normalized)) return 'explanation';
  if (/(duele la cabeza|demasiado|no entiendo nada|mucho ruido|confuso)/.test(normalized)) return 'overload';
  if (/(no estoy de acuerdo|no queria|no buscaba|eso no)/.test(normalized)) return 'disagreement';
  if (/(que hago|subo|subir|archivo|siguiente paso)/.test(normalized)) return 'action';
  if (/(que esta conectado|estado|conectado|supabase|realtime)/.test(normalized)) return 'system_status';
  return fallback;
}

export function compressVisibleText(text: string, mode: 'direct' | 'structured' | 'trace' = 'direct') {
  const maxSentences = mode === 'trace' ? 8 : mode === 'structured' ? 4 : 2;
  let clean = text
    .replace(/\bVeo:\s*/gi, '')
    .replace(/\bSignifica:\s*/gi, '')
    .replace(/\bSigue:\s*/gi, '')
    .replace(/No falta informaci[oó]n\.?\s*Falta traducci[oó]n\.?/gi, '')
    .replace(/Te lo digo en una frase:?\s*/gi, '')
    .replace(/La se[nñ]al quiere salir al campo p[uú]blico\.?/gi, 'La accion requiere salida publica.')
    .replace(/campo p[uú]blico/gi, 'publicacion')
    .replace(/\s+/g, ' ')
    .trim();

  const localNotice = 'Lectura local. Fuente externa no conectada.';
  if (mode !== 'trace') {
    clean = clean.replaceAll(localNotice, '').trim();
  } else {
    const firstLocalNotice = clean.indexOf(localNotice);
    if (firstLocalNotice >= 0) {
    clean = clean.slice(0, firstLocalNotice + localNotice.length)
      + clean.slice(firstLocalNotice + localNotice.length).replaceAll(localNotice, '');
    }
  }

  const seen = new Set<string>();
  const sentences = splitSentences(clean).filter((sentence) => {
    const key = sentence.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return sentences.slice(0, maxSentences).join(' ').trim();
}

export function formatAmvVisibleResponse(input: AmvVisibleFormatterInput): AmvVisibleResponse {
  const intent = detectIntent(input.userCommand, input.communicationIntent || 'direct');
  const rawText = textFrom(input.rawReading);
  const pattern = input.activatedPattern;
  const surface = input.activatedSurface || 'campo';
  const sourceState = String(input.sourceTrace?.sourceState || '');

  if (intent === 'trace') {
    return {
      primaryText: compressVisibleText(rawText || pattern?.oracion_visible || 'Origen disponible en trazabilidad.', 'trace'),
      traceText: sourceState ? `Fuente: ${sourceState}` : undefined,
      actionLabel: 'Ver origen',
    };
  }

  if (intent === 'explanation') {
    return {
      primaryText: "Mencionaste 'subir' o 'publicar una pieza'. Por eso active salida publica.",
      secondaryText: 'Si no querias publicarla, la trato como auditoria.',
      actionLabel: 'Tratar como auditoria',
    };
  }

  if (intent === 'overload') {
    return {
      primaryText: 'Reduzco la lectura. Ahora solo muestro estado, archivo y siguiente paso.',
      actionLabel: 'Reducir lectura',
    };
  }

  if (intent === 'disagreement') {
    const activator = pattern?.palabra || surface || 'la senal';
    return {
      primaryText: `Retiro la inferencia como conclusion. El activador fue ${activator}.`,
      secondaryText: 'Si no buscabas publicar, lo trato como auditoria.',
      actionLabel: 'Corregir ruta',
    };
  }

  if (intent === 'action') {
    return {
      primaryText: 'Sube el archivo. Despues lo reviso sin publicar nada.',
      actionLabel: 'Subir archivo',
    };
  }

  if (intent === 'system_status') {
    return {
      primaryText: 'El campo guarda eventos en Supabase. Realtime no esta habilitado. Social tiene retorno manual; read-only requiere token.',
      actionLabel: 'Ver estado',
    };
  }

  const primaryText = compressVisibleText(
    rawText || pattern?.oracion_visible || pattern?.accion_sugerida || 'Campo activo.',
    input.communicationIntent === 'structured' ? 'structured' : 'direct',
  );

  return {
    primaryText,
    actionLabel: pattern?.accion_sugerida,
  };
}
