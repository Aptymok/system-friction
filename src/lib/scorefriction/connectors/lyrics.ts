function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function analyzeLyrics(lyrics: string) {
  const normalized = lyrics.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = normalized.split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  const unique = new Set(words);
  const hits = (terms: string[]) => words.filter((word) => terms.includes(word)).length;

  return {
    semantic_density: clamp01(words.length / 280),
    lexical_diversity: clamp01(unique.size / Math.max(1, words.length)),
    repetition_load: clamp01(1 - unique.size / Math.max(1, words.length)),
    agency_axis: clamp01(hits(['hago', 'voy', 'puedo', 'construyo', 'salgo']) / 12),
    desire_axis: clamp01(hits(['quiero', 'deseo', 'busco', 'necesito']) / 10),
    status_axis: clamp01(hits(['oro', 'marca', 'poder', 'lujo', 'nivel']) / 10),
    violence_axis: clamp01(hits(['arma', 'matar', 'golpe', 'sangre', 'guerra']) / 10),
    cooperation_axis: clamp01(hits(['juntos', 'banda', 'familia', 'equipo', 'nosotros']) / 10),
    future_axis: clamp01(hits(['futuro', 'manana', 'luego', 'destino', 'camino']) / 10),
    territory_axis: clamp01(hits(['barrio', 'calle', 'ciudad', 'mexico', 'norte', 'sur']) / 10),
  };
}
