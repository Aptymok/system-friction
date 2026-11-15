/** Local Studio release materials. This module never uploads, stores or publishes files. */
export type ReleaseMetrics = {
  durationSeconds: number | null;
  loudnessLufs: number | null;
  loudnessRangeLu: number | null;
  tempoBpm: number | null;
  tempoAmbiguous: boolean;
  keyEstimate: string | null;
};
export type ReleaseDiscoveryEvidence = {
  status: string;
  provider: string;
  query: string;
  sources: Array<{title: string; url: string; publisher: string | null}>;
};
export type ReleaseDirection = {
  title: string;
  artist: string;
  sector: string;
  concept: string;
  palette: 'nocturnal' | 'paper' | 'signal';
};
function usable(value: number | null): string { return value === null ? 'NO_OBSERVADO' : String(Number(value.toFixed(3))); }
function safeName(value: string) {
  return (value.normalize('NFKD').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 65) || 'studio-release');
}
export function makeReleaseBrief(direction: ReleaseDirection, metrics: ReleaseMetrics, discovery: ReleaseDiscoveryEvidence | null = null): string {
  const title = direction.title.trim() || 'Sin título';
  const artist = direction.artist.trim() || 'Artista no especificado';
  const sector = direction.sector.trim();
  const concept = direction.concept.trim();
  return [
    'SFI STUDIO · EXPEDIENTE DE LANZAMIENTO · BORRADOR',
    'Producción local. Sin publicación ni investigación social automática.',
    '',
    'OBRA: ' + title,
    'ARTISTA: ' + artist,
    'CONCEPTO EDITORIAL APORTADO: ' + (concept || 'NO DEFINIDO'),
    '',
    'OBSERVACIONES ACÚSTICAS',
    'Duración (s): ' + usable(metrics.durationSeconds),
    'LUFS integrado: ' + usable(metrics.loudnessLufs),
    'Rango de sonoridad (LU): ' + usable(metrics.loudnessRangeLu),
    'Tempo estimado (BPM): ' + usable(metrics.tempoBpm),
    'Interpretación del tempo: ' + (metrics.tempoAmbiguous ? 'AMBIGUO, NO USAR COMO BPM CONFIRMADO' : 'HIPÓTESIS, COMPROBAR CON PRODUCCIÓN'),
    'Tonalidad estimada: ' + (metrics.keyEstimate || 'NO OBSERVADA'),
    '',
    'PÚBLICO / SECTOR',
    'Hipótesis propuesta por el usuario: ' + (sector || 'NO DEFINIDO'),
    discovery ? 'DESCUBRIMIENTO PÚBLICO: FUENTES INDEXADAS RECUPERADAS, NO AUDIENCIA VALIDADA.' : 'OBSERVACIÓN EXTERNA: NO REALIZADA. No se atribuyen tamaños, preferencias, alcance ni conversiones.',
    'Prueba recomendada: publicar variantes autorizadas y medir retención, comentarios pertinentes, guardados y contactos reales.',
    '',
    'RUTA CREATIVA PROPUESTA',
    'A. Portada editorial coherente con el concepto de la obra.',
    'B. Pieza vertical de presentación, sólo cuando exista material audiovisual real.',
    'C. Texto editorial breve que describa la obra sin afirmar resultados comerciales.',
    'D. Comparar dos mensajes mediante métricas registradas, sin inventar público ni eficacia.',
    '',
    'COPIA EDITORIAL · BORRADOR',
    title + ' — ' + artist,
    concept ? concept : 'Una obra por descubrir. Escucha el lanzamiento cuando esté disponible.',
    'Enlace de escucha: PENDIENTE. Fecha de lanzamiento: PENDIENTE.',
    '',
    'CONTROLES DE PUBLICACIÓN',
    'Mastering: NO VERIFICADO. El WAV técnico opcional no constituye mastering.',
    'FAD: NO OBSERVADO. MIHM: NO OBSERVADO. RAV: NO CALCULADO.',
    discovery ? 'Investigación: descubrimiento de fuentes realizado, audiencia NO OBSERVADA. Publicación: NO AUTORIZADA.' : 'Investigación de mercado: NO EJECUTADA. Publicación: NO AUTORIZADA.',
    'Proveniencia: mediciones calculadas en navegador; público y concepto provienen de la entrada del usuario.',
    'El original de audio no se transfiere ni persiste durante esta operación.',
    '',
    'DESCUBRIMIENTO PÚBLICO · SOLO SI FUE SOLICITADO',
    discovery ? 'Proveedor: ' + discovery.provider : 'NO EJECUTADO',
    discovery ? 'Consulta: ' + discovery.query : 'NO EJECUTADA',
    discovery ? 'Estado: ' + discovery.status : 'NO OBSERVADO',
    ...((discovery?.sources ?? []).map((source, index) =>
      String(index + 1) + '. ' + source.title + ' · ' + source.url + ' · ' + (source.publisher ?? 'origen desconocido')
    )),
    'Las fuentes indexadas no prueban audiencia, afinidad, intención de escucha ni conversión.',
  ].join('\n');
}
export function downloadTextFile(content: string, filename: string, mime = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeName(filename.split('.')[0]) + (filename.endsWith('.txt') ? '.txt' : '.json');
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function createReleaseCoverBlob(direction: ReleaseDirection, metrics: ReleaseMetrics): Promise<Blob> {
  const title = (direction.title.trim() || 'UNTITLED').slice(0, 90);
  const artist = (direction.artist.trim() || 'STUDIO').slice(0, 80);
  const canvas = document.createElement('canvas');
  canvas.width = 3000;
  canvas.height = 3000;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('CANVAS_CONTEXT_UNAVAILABLE');
  const palettes = {
    nocturnal: { bg: '#0c1325', fg: '#e9eaf2', accent: '#90b8d6' },
    paper: { bg: '#eae4d9', fg: '#19222d', accent: '#88704f' },
    signal: { bg: '#0a1917', fg: '#e5faed', accent: '#66c9a9' },
  };
  const palette = palettes[direction.palette];
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, 3000, 3000);
  const seed = [...(title + artist)].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 2166136261);
  const motion = metrics.loudnessRangeLu === null ? 0.45 : Math.max(0.1, Math.min(1, metrics.loudnessRangeLu / 20));
  const repetitions = 28 + (seed % 21);
  const offset = (seed % 360) * Math.PI / 180;
  ctx.save();
  ctx.translate(1500, 1310);
  ctx.rotate(offset);
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 4;
  for (let ring = 0; ring < repetitions; ring++) {
    const angle = 2 * Math.PI * ring / repetitions;
    const radius = 260 + 11 * ring;
    ctx.globalAlpha = Math.max(0.12, 0.65 - 0.48 * ring / repetitions);
    ctx.beginPath();
    ctx.ellipse(Math.cos(angle * 1.7) * radius * 0.1, Math.sin(angle) * radius * 0.08,
      380 + radius * motion, 150 + radius * 0.5, angle, 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.fillStyle = palette.fg;
  ctx.textAlign = 'center';
  ctx.font = '500 45px sans-serif';
  ctx.fillText(artist.toUpperCase(), 1500, 290);
  const words = title.toUpperCase().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const proposed = current ? current + ' ' + word : word;
    if (proposed.length > 18 && current) { lines.push(current); current = word; } else current = proposed;
  }
  if (current) lines.push(current);
  const visibleLines = lines.slice(0, 4);
  const longest = Math.max(...visibleLines.map(line => line.length), 1);
  const fontSize = Math.max(68, Math.min(166, 2200 / Math.max(8, longest) * 1.1));
  ctx.font = '600 ' + Math.round(fontSize) + 'px sans-serif';
  visibleLines.forEach((line, index) => ctx.fillText(line, 1500, 2320 + index * (fontSize + 27), 2500));
  ctx.font = '32px monospace';
  ctx.fillText('SFI STUDIO  /  VISUAL PROPOSAL', 1500, 2860);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('COVER_ENCODING_FAILED')), 'image/png');
  });
}
export async function downloadReleaseCover(direction: ReleaseDirection, metrics: ReleaseMetrics): Promise<void> {
  const blob = await createReleaseCoverBlob(direction, metrics);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeName(direction.title.trim() || 'UNTITLED') + '-cover-proposal-3000.png';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
