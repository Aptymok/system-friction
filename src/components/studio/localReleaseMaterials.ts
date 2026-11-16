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
