/** Constructs an editorial source-review narration from user topic and indexed
 * source metadata. This is not autonomous investigative reporting and never
 * converts an index headline into a verified factual claim.
 */
export type IndexedStudioSource = {
  title: string;
  url: string;
  publisher: string | null;
  publishedAt: string | null;
  retrievedAt: string;
  evidenceStatus: string;
};
function human(value:string,max=180):string {
  return value.trim().replace(/\s+/g,' ').slice(0,max);
}
export function buildSourceReviewScript(topic: string, sources: IndexedStudioSource[]) {
  const subject=human(topic,180);
  if (subject.length<3) throw new Error('El tema debe contener al menos tres caracteres.');
  const selected=sources.slice(0,5).filter(source => {
    try { const uri=new URL(source.url);return uri.protocol==='https:'; }
    catch {return false;}
  });
  const segments=[
    'Hoy dedicamos este episodio a una pregunta: ¿qué sabemos realmente sobre '+subject+'?',
    'Para investigarla, conviene separar los datos comprobables, las interpretaciones y lo que todavía desconocemos.',
    'Nuestro primer paso es identificar referencias públicas. Un titular puede ayudarnos a localizar un asunto, pero no sustituye la lectura ni la verificación de la fuente.',
  ];
  if (selected.length) {
    segments.push('Entre los materiales indexados para revisar encontramos los siguientes títulos:');
    for (const [index,source] of selected.entries()) {
      const publisher=human(source.publisher||'un medio no identificado',95);
      const title=human(source.title,210);
      segments.push('Referencia '+(index+1)+'. '+publisher+' registra un material titulado: '+title+'.');
    }
    segments.push('Estos títulos son pistas de investigación. Aún necesitamos leer los artículos originales, comprobar su fecha, identificar sus fuentes primarias y contrastar las afirmaciones relevantes.');
  } else {
    segments.push('La consulta pública no devolvió referencias elegibles para este borrador. Eso no demuestra que el tema carezca de fuentes ni de importancia.');
  }
  segments.push(
    'Las preguntas que guiarán una segunda revisión son tres. Primera: ¿qué evidencia primaria sostiene las afirmaciones centrales? Segunda: ¿qué información las contradice o limita? Tercera: ¿qué conclusión resistiría una comprobación independiente?',
    'Hasta realizar esa revisión, ninguna conclusión queda certificada. Este episodio es un expediente de exploración, no un dictamen científico ni una afirmación sobre personas o públicos.',
    'Al cerrar, conservamos las preguntas abiertas y las referencias. El siguiente avance tendrá valor cuando podamos sustituir las conjeturas por observaciones verificables.'
  );
  const references=selected.map(source =>
    human(source.publisher||'Fuente no identificada',100)+' · '+
    human(source.title,220)+' · '+source.url+
    (source.publishedAt?' · '+source.publishedAt:'')
  );
  return {
    body:segments.join('\n\n'),
    sourceLines:references.join('\n'),
    status:'EDITORIAL_DRAFT_SOURCE_INDEX_ONLY' as const,
    sourcesUsed:selected.length,
    verifiedClaims:0,
    articlesRead:0,
  };
}
