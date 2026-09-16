import type { Metadata } from 'next';
import Link from 'next/link';
import './discovery-note.css';

const CANONICAL = 'https://systemfriction.org/publications/discovery-mesh-publicar-no-es-ser-encontrado';
const COVER = '/images/editorial/discovery-mesh-observation.svg';

export const metadata: Metadata = {
  title: 'Discovery Mesh: publicar no es ser encontrado · System Friction Institute',
  description: 'Nota de Laboratorio sobre auto-observación institucional, encontrabilidad, propuestas gobernadas y la distancia entre EXPOSURE, DISCOVERY, PULL y RETURN.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: 'article',
    url: CANONICAL,
    siteName: 'System Friction Institute',
    title: 'Discovery Mesh: publicar no es ser encontrado',
    description: 'Cómo SFI observa su propia encontrabilidad sin convertir exposición en reconocimiento.',
    images: [{ url: COVER }],
  },
  other: {
    'sfi-canonical-id': 'SFI-PUB-OBS-014',
    'sfi-epistemic-class': 'METHOD_NOTE',
    'sfi-publication-state': 'PUBLISHED_BY_FOUNDER_AUTHORIZATION',
    'sfi-boundary': 'EXPOSURE_NE_DISCOVERY_NE_PULL_NE_RETURN',
  },
};

export default function DiscoveryMeshMethodNote() {
  return <main className="meshNote">
    <header className="meshTop"><Link href="/">SYSTEM FRICTION INSTITUTE</Link><div>NOTAS DE LABORATORIO · SFI-PUB-OBS-014 · 16 SEP 2026</div><Link href="/publications">PUBLICATIONS</Link></header>

    <section className="meshHero">
      <div className="meshHeroCopy"><span className="meshKicker">DISCOVERY MESH · METHOD NOTE</span><h1>Publicar no es ser encontrado.</h1><p className="meshLead">Una institución puede exponer una superficie, aparecer en una búsqueda y aun así no haber sido reconocida, utilizada ni requerida. Discovery Mesh existe para conservar esas distancias en lugar de rellenarlas con narrativa.</p></div>
      <figure className="meshFigure"><img src={COVER} alt="Discovery Mesh: trayectoria desde EXPOSURE hasta RETURN"/><figcaption>SFI · DISCOVERY MESH · representación metodológica. La gráfica describe estados posibles; no afirma que todos hayan sido observados.</figcaption></figure>
    </section>

    <aside className="meshBoundary"><b>FRONTERA</b><p>PUBLICACIÓN = EXPOSURE. DISCOVERY, RECOGNITION, INTERACTION, RELATION, PROPAGATION, PULL y RETURN requieren observaciones distintas. Un estado ausente permanece ausente. NULL no se convierte en cero.</p></aside>

    <article className="meshBody">
      <section className="meshSection"><span>01 / EXPOSURE</span><div><h2>Publicar sólo abre la trayectoria.</h2><p>Una página pública, un feed, un objeto canónico o una representación legible para máquinas demuestran que SFI colocó algo en una superficie accesible. No demuestran que alguien lo encontró. Mucho menos que lo reconoció como útil, modificó una decisión con él o regresó con un resultado.</p><p>La diferencia parece semántica hasta que una institución empieza a tomar decisiones a partir de ella. Si publicación y descubrimiento se mezclan, el sistema puede celebrar actividad propia como si fuera evidencia externa.</p></div></section>

      <section className="meshSection"><span>02 / SELF-OBSERVATION</span><div><h2>La institución puede observar su propia encontrabilidad.</h2><p>Discovery Mesh ejecuta observaciones acotadas sobre búsquedas y recuperaciones elegibles. Conserva consulta, intención, proveedor, fuente, timestamp, identidad atribuida, URL canónica citada, referencias independientes y colisiones cuando esas variables existen.</p><p>La auto-observación no convierte al instituto en juez de su propia legitimidad. Su función es más estrecha: detectar dónde la representación pública puede ser reconstruida y dónde todavía faltan observaciones.</p></div></section>

      <section className="meshSection"><span>03 / INSTRUMENTS</span><div><h2>Siete familias de medición, ninguna métrica de prestigio.</h2><div className="meshMetrics"><div><b>UDR</b><small>Recuperación no marcada.</small></div><div><b>EIC</b><small>Coherencia de identidad externa.</small></div><div><b>IRD</b><small>Densidad de referencias independientes.</small></div><div><b>ACR</b><small>Recuperación, atribución y cita por IA.</small></div><div><b>ECR</b><small>Colisiones de nombre, dominio, método y entidad.</small></div><div><b>MPD</b><small>Profundidad observada de propagación.</small></div><div><b>ERR</b><small>Reconstrucción de la entidad.</small></div></div><p>Ninguna de estas familias autoriza por sí sola una conclusión sobre reconocimiento institucional. Su utilidad está en volver falsables afirmaciones que de otro modo serían impresiones: “somos encontrables”, “nos reconstruyen correctamente”, “la pieza circuló”, “una IA nos cita”.</p></div></section>

      <section className="meshSection"><span>04 / MISSING</span><div><h2>Lo no observado no se rellena.</h2><p>Una consulta sin muestra elegible no produce cero. Una publicación sin referencia independiente no produce fracaso. Una mención no se convierte en relación. Una relación no se convierte en PULL. Y una solicitud no se convierte en RETURN mientras no exista un resultado observable ligado a ella.</p><p>Esta disciplina hace al sistema menos espectacular y más útil: permite saber qué falta medir antes de decidir qué cambiar.</p></div></section>

      <section className="meshSection"><span>05 / DEVELOPMENT</span><div><h2>La observación puede producir propuestas de desarrollo.</h2><p>Cuando el Mesh encuentra una dimensión no observada o una medición suficientemente degradada, puede formular una modificación reversible: ampliar consultas no marcadas, mejorar proyecciones semánticas, reparar identidad, aumentar citabilidad canónica o instrumentar una fuente faltante.</p><p>La propuesta conserva el run que la originó, la métrica observada, la condición deseada y el cambio sugerido. Pero permanece propuesta. Discovery Mesh no puede aprobar su propio desarrollo, ejecutar cambios materiales, alterar canon ni convertir una mejora esperada en evidencia.</p></div></section>

      <section className="meshSection"><span>06 / FOUNDER-AWAY</span><div><h2>Encontrar no debe depender de que el Fundador persiga.</h2><p>La función institucional del Mesh no es fabricar una lista de personas para que Juan salga a vender SFI. Es reducir esa dependencia: emitir objetos reconstruibles, observar cómo aparecen —o no aparecen— ante problemas y consultas, detectar fricción de identidad y llevar propuestas gobernadas a ROOT.</p><p>El Fundador interviene donde existe una decisión reservada. La rutina de observar, registrar, proponer y volver a medir puede continuar sin convertir su atención en middleware del instituto.</p></div></section>

      <section className="meshSection"><span>07 / RETURN</span><div><h2>El siguiente ciclo empieza cuando el campo responde.</h2><p>Una mejora de Discovery sólo queda demostrada cuando una observación posterior cambia de manera trazable: una consulta recupera lo que antes no recuperaba, una identidad se reconstruye correctamente, aparece una referencia independiente o una trayectoria externa alcanza un estado que antes no podía observarse.</p><p>El objetivo no es que todas las métricas suban. Es que SFI pueda explicar qué cambió, por qué esperaba que cambiara y qué ocurrió después. RETURN conserva también la posibilidad de que la intervención no funcionara.</p></div></section>
    </article>

    <footer className="meshFooter"><span>SFI · NOTAS DE LABORATORIO</span><span>OBSERVED / DERIVED / INFERRED / PROJECTED permanecen separados</span><span><Link href="/root/discovery">ROOT / DISCOVERY →</Link></span></footer>
  </main>;
}
