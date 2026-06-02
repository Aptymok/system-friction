import { ScoreFrictionPanel, ScoreFrictionShell } from '@/scorefriction/components/ScoreFrictionShell';

export default function ScoreFrictionPage() {
  return (
    <ScoreFrictionShell
      title="Observatorio"
      subtitle="Observa fuentes culturales imperfectas, declara su friccion, normaliza senal y verifica si un protoatractor cultural adquiere forma."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <ScoreFrictionPanel title="Que observa">
          Musica, escenas emergentes, letras, comentarios, gestos sociales, recepcion publica, waveform, metadata y evidencia manual ligada a case studies.
        </ScoreFrictionPanel>
        <ScoreFrictionPanel title="Que no observa">
          No observa identidad privada, no hace scraping agresivo, no convierte metricas en certeza y no depende de APIs perfectas para registrar evidencia.
        </ScoreFrictionPanel>
        <ScoreFrictionPanel title="Entradas Fase 0">
          youtubeUrl, spotifyUrl, soundcloudUrl, tiktokUrl, lyrics, comments, audioMetadata, territory y caseStudy.
        </ScoreFrictionPanel>
        <ScoreFrictionPanel title="Salidas">
          Observaciones trazables, vectores acusticos, semanticos, memeticos, de plataforma, MIHM-Cultural, prototipos y verificaciones longitudinales.
        </ScoreFrictionPanel>
      </div>
    </ScoreFrictionShell>
  );
}
