'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { attractors, mihmVariables, publicEvidenceStates, regimeJumpReadiness, regimeLabel, traceArtifacts } from '@/observatory/publicSurface/content';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = 'latente') {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function pct(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function SfiFinalPublicSurface() {
  const [field, setField] = useState<JsonRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/observatory/state', { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (active && res.ok && isRecord(body) && isRecord(body.data)) setField(body.data);
      })
      .catch(() => null)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const graph = isRecord(field?.graph) ? field.graph : {};
  const worldspect = isRecord(field?.worldspect) ? field.worldspect : {};
  const kernel = isRecord(field?.kernel) ? field.kernel : {};
  const governance = isRecord(field?.governance) ? field.governance : {};
  const warnings = Array.isArray(field?.warnings) ? field.warnings.filter((item): item is string => typeof item === 'string') : [];
  const nodes = Array.isArray(graph.nodes) ? graph.nodes.length : 0;
  const edges = Array.isArray(graph.edges) ? graph.edges.length : 0;
  const sourceState = stringValue(worldspect.sourceState ?? graph.sourceState, loaded ? 'latente' : 'cargando');
  const confidence = numberValue(kernel.confidence ?? worldspect.confidence) ?? 0.42;
  const metrics = useMemo(() => {
    const authorityDensity = governance.blindMode ? 0.32 : 0.62;
    const evidenceCoherence = Math.min(0.82, 0.42 + publicEvidenceStates.length * 0.06);
    const fieldPersistence = field ? 0.64 : 0.38;
    const publicObservability = nodes > 0 && edges > 0 ? 0.72 : 0.46;
    const canonStability = 0.74;
    const attractorAlignment = 0.68;
    const invitationProbability = 0.44;
    const readiness = regimeJumpReadiness({ authorityDensity, evidenceCoherence, fieldPersistence, publicObservability, canonStability, attractorAlignment, invitationProbability });
    return { authorityDensity, evidenceCoherence, fieldPersistence, publicObservability, canonStability, attractorAlignment, invitationProbability, readiness };
  }, [edges, field, governance.blindMode, nodes]);

  const liveReading = warnings.length > 0
    ? 'El campo publico registra degradacion parcial de fuente. La ausencia de resolucion no se oculta: se observa como limite del campo.'
    : 'El campo publico registra saturacion narrativa y presion de validacion sostenida. La lectura disponible es colectiva; no corresponde a identidad individual.';

  return (
    <main className="min-h-screen bg-[#060605] text-[#ccc8bc]">
      <nav className="sticky top-0 z-30 border-b border-[#242017] bg-[#060605]/95 px-5 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#C8A951]">SYSTEM FRICTION INSTITUTE</Link>
          <div className="flex flex-wrap gap-4 font-mono text-[9px] uppercase tracking-[0.14em] text-[#7a7568]">
            <a href="#core">SFI-CORE.v2</a>
            <a href="#mihm">MIHM</a>
            <a href="#evidencia">Evidencia</a>
            <Link href="/campo?read=1" className="text-[#C8A951]">Ver campo publico</Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-20 md:px-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#8a7035]">SFI no se presenta como promesa. SFI se presenta como evidencia organizada.</p>
          <h1 className="mt-8 font-serif text-5xl leading-[0.95] text-[#f4f0e7] md:text-7xl">
            SYSTEM FRICTION INSTITUTE
          </h1>
          <p className="mt-8 max-w-2xl font-serif text-2xl leading-snug text-[#C8A951]">
            La friccion no es el problema. Es la informacion que el sistema todavia no puede leer.
          </p>
          <p className="mt-8 max-w-2xl font-mono text-[13px] leading-7 text-[#aaa497]">
            SFI desarrolla infraestructura para observar la distancia entre lo que una persona, organizacion o institucion declara ser y lo que su comportamiento revela bajo presion.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/campo?read=1" className="border border-[#C8A951]/60 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#C8A951]">Ver campo publico</Link>
            <Link href="/sfi-core-v2" className="border border-[#3a3220] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#ccc8bc]">Leer SFI-CORE.v2</Link>
            <a href="mailto:aptymok@gmail.com?subject=Lectura institucional SFI" className="border border-[#3a3220] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#ccc8bc]">Solicitar diagnostico institucional</a>
          </div>
        </div>

        <LiveFieldCard liveReading={liveReading} sourceState={sourceState} kernelStatus={stringValue(kernel.status)} confidence={confidence} nodes={nodes} edges={edges} readiness={metrics.readiness} warnings={warnings} />
      </section>

      <section className="border-y border-[#242017] bg-[#0a0a09] px-5 py-12 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionKicker number="01" title="Que es SFI" />
          <div className="grid gap-8 md:grid-cols-2">
            <TextBlock title="Un instituto de observacion, no de diagnostico.">
              System Friction Institute es infraestructura para observacion longitudinal de friccion humana, organizacional e institucional. No mide fallas; mide incoherencias sostenidas. No diagnostica personas; observa campos, relaciones, patrones y regimenes de friccion.
            </TextBlock>
            <div className="grid gap-4">
              <ListBlock title="No es" items={['dashboard analitico', 'IA de bienestar', 'app de productividad', 'red social', 'psicometria', 'terapia', 'consultoria convencional', 'culto']} />
              <ListBlock title="Si produce" items={['observacion topologica', 'memoria longitudinal', 'regimenes de friccion', 'trazabilidad causal', 'patrones emergentes', 'perturbacion minima', 'coherencia operacional', 'evidencia publica']} />
            </div>
          </div>
        </div>
      </section>

      <section id="core" className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:px-10 lg:grid-cols-[0.85fr_1.15fr]">
        <SectionKicker number="02" title="Canon / SFI-CORE.v2" />
        <div className="border border-[#242017] bg-[#0e0d0b] p-6">
          <h2 className="font-serif text-3xl text-[#C8A951]">Kernel operativo de arquitectura perceptual</h2>
          <p className="mt-5 max-w-3xl font-mono text-[13px] leading-7 text-[#aaa497]">
            SFI-CORE.v2 regula como el sistema observa: desaceleracion antes que velocidad, presencia antes que estimulacion, observacion antes que persuasion, estructura antes que estetica.
          </p>
          <div className="my-8 border-y border-[#3a3220] py-6 font-mono text-xl text-[#f4f0e7]">(+1) Observacion + (0) Estructura - (1) Vacio = 0</div>
          <div className="grid gap-2 md:grid-cols-2">
            {['Regulacion perceptual', 'Presencia sostenida', 'Seguridad psicologica', 'Claridad estructural', 'Exactitud funcional', 'Velocidad', 'Estetica'].map((item, index) => (
              <div key={item} className="flex gap-3 border border-[#242017] p-3 font-mono text-[11px] uppercase text-[#ccc8bc]">
                <span className="text-[#8a7035]">{index + 1}</span>{item}
              </div>
            ))}
          </div>
          <Link href="/sfi-core-v2" className="mt-6 inline-block border border-[#C8A951]/50 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#C8A951]">Leer canon completo</Link>
        </div>
      </section>

      <section id="mihm" className="border-y border-[#242017] bg-[#0a0a09] px-5 py-16 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionKicker number="03" title="Marco matematico / MIHM" />
          <div>
            <h2 className="font-serif text-3xl text-[#f4f0e7]">La friccion sistemica no es metafora. Es distancia computable.</h2>
            <p className="mt-5 font-mono text-[13px] leading-7 text-[#aaa497]">MIHM formaliza la friccion como relacion entre coherencia, tension, latencia, umbral y flujo. No pregunta si un sistema funciona; observa cuanto gasta para sostener la apariencia de funcionamiento.</p>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {mihmVariables.map(([id, title, text]) => <VariableCard key={id} id={id} title={title} text={text} />)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:px-10 lg:grid-cols-[0.85fr_1.15fr]">
        <SectionKicker number="04" title="Observatorio" />
        <div>
          <h2 className="font-serif text-3xl text-[#f4f0e7]">El campo no se explica. Se observa.</h2>
          <p className="mt-5 font-mono text-[13px] leading-7 text-[#aaa497]">El Observatorio es la superficie operativa del Instituto. No presenta indicadores aislados; presenta relaciones. No entrega respuestas automaticas; reorganiza el campo para que el patron sea visible.</p>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {['Campo publico', 'Campo personal emergente', 'Campo operacional completo'].map((item, index) => <ProcessCard key={item} index={index} title={item} />)}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/campo?read=1" className="border border-[#C8A951]/60 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#C8A951]">Entrar al campo publico</Link>
            <Link href="/campo" className="border border-[#3a3220] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#ccc8bc]">Formar campo propio</Link>
          </div>
        </div>
      </section>

      <section className="border-y border-[#242017] bg-[#0a0a09] px-5 py-16 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionKicker number="05" title="Artefactos de trazabilidad" />
          <div>
            <p className="font-serif text-3xl text-[#f4f0e7]">El Instituto no nace solo en pantalla. Se organiza por materia, lectura, canon y campo.</p>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {traceArtifacts.map((artifact) => <ArtifactCard key={artifact.name} {...artifact} />)}
            </div>
          </div>
        </div>
      </section>

      <section id="evidencia" className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:px-10 lg:grid-cols-[0.85fr_1.15fr]">
        <SectionKicker number="06" title="Evidencia" />
        <div>
          <h2 className="font-serif text-3xl text-[#f4f0e7]">Evidencia con estado. No promesa.</h2>
          <div className="mt-8 grid gap-3">
            {publicEvidenceStates.map((item) => <EvidenceCard key={item.title} {...item} />)}
          </div>
        </div>
      </section>

      <section className="border-y border-[#242017] bg-[#0a0a09] px-5 py-16 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionKicker number="07" title="Organizaciones" />
          <div>
            <h2 className="font-serif text-3xl text-[#f4f0e7]">Toda organizacion aprende a ocultar su friccion. SFI la vuelve legible.</h2>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {['Auditoria de friccion', 'Observatorio organizacional', 'Preservacion de conocimiento', 'Investigacion'].map((title) => <TextBlock key={title} title={title}>Salida: mapa de incoherencia, nodos de tension, recurrencia, trazabilidad y perturbacion minima.</TextBlock>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:px-10 lg:grid-cols-[0.85fr_1.15fr]">
        <SectionKicker number="08" title="Field Briefs" />
        <div>
          <h2 className="font-serif text-3xl text-[#f4f0e7]">Observaciones publicas del campo</h2>
          <p className="mt-5 font-mono text-[13px] leading-7 text-[#aaa497]">Un Field Brief no es articulo, post u opinion. Es una lectura breve, trazable y limitada de un regimen de friccion.</p>
          <div className="mt-8 border border-[#242017] bg-[#0e0d0b] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C8A951]">SFI FIELD BRIEF 001</p>
            <h3 className="mt-3 font-serif text-2xl text-[#f4f0e7]">Saturacion de validacion publica</h3>
            <p className="mt-4 font-mono text-[12px] leading-6 text-[#aaa497]">Lectura colectiva. No diagnostico individual. La perturbacion minima es publicar una observacion verificable, no una explicacion completa.</p>
            <Link href="/field/brief/latest" className="mt-5 inline-block border border-[#C8A951]/50 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#C8A951]">Leer ultimo Field Brief</Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[#242017] px-5 py-12 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C8A951]">SYSTEM FRICTION INSTITUTE</p>
            <p className="mt-3 font-mono text-[11px] leading-6 text-[#7a7568]">Aguascalientes · Mexico. Observacion longitudinal de friccion sistemica.</p>
          </div>
          <div className="font-mono text-[10px] uppercase leading-6 text-[#7a7568]">SFI-CORE.v2 · MIHM · AMV Governance · Field Briefs · Artefactos de trazabilidad</div>
          <div className="font-mono text-[10px] uppercase leading-6 text-[#7a7568]">Canonical hub: systemfriction.org<br />Legacy surfaces: archivo historico, no autoridad vigente.</div>
        </div>
      </section>
    </main>
  );
}

function LiveFieldCard({ liveReading, sourceState, kernelStatus, confidence, nodes, edges, readiness, warnings }: { liveReading: string; sourceState: string; kernelStatus: string; confidence: number; nodes: number; edges: number; readiness: number; warnings: string[] }) {
  return (
    <div className="border border-[#242017] bg-[#0e0d0b] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C8A951]">Lectura de campo · colectivo · en vivo</p>
      <p className="mt-5 font-mono text-[13px] leading-7 text-[#ccc8bc]">{liveReading}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Metric label="sourceState" value={sourceState} />
        <Metric label="kernel" value={kernelStatus} />
        <Metric label="confidence" value={pct(confidence)} />
        <Metric label="grafo" value={`${nodes} / ${edges}`} />
      </div>
      <div className="mt-6 border-t border-[#242017] pt-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7a7568]">Regime Jump Readiness · derived</p>
        <div className="mt-3 h-1 bg-[#242017]"><div className="h-full bg-[#C8A951]" style={{ width: pct(readiness) }} /></div>
        <p className="mt-3 font-mono text-[11px] uppercase text-[#C8A951]">{pct(readiness)} · {regimeLabel(readiness)}</p>
      </div>
      {warnings.length > 0 && <p className="mt-5 border border-[#6a5a20] bg-[#2a250e] p-3 font-mono text-[10px] uppercase text-[#C8A951]">Campo con limites observados: {warnings.slice(0, 3).join(' · ')}</p>}
    </div>
  );
}

function SectionKicker({ number, title }: { number: string; title: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8a7035]">{number}</p>
      <h2 className="mt-2 font-serif text-2xl text-[#C8A951]">{title}</h2>
    </div>
  );
}

function TextBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="border border-[#242017] bg-[#0e0d0b] p-5"><h3 className="font-serif text-xl text-[#f4f0e7]">{title}</h3><p className="mt-4 font-mono text-[12px] leading-6 text-[#aaa497]">{children}</p></div>;
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return <div className="border border-[#242017] p-4"><h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#C8A951]">{title}</h3><div className="mt-3 grid grid-cols-2 gap-2">{items.map((item) => <span key={item} className="font-mono text-[10px] uppercase text-[#7a7568]">{item}</span>)}</div></div>;
}

function VariableCard({ id, title, text }: { id: string; title: string; text: string }) {
  return <div className="border border-[#242017] bg-[#0e0d0b] p-4"><p className="font-mono text-[11px] text-[#C8A951]">{id}</p><h3 className="mt-2 font-serif text-xl text-[#f4f0e7]">{title}</h3><p className="mt-3 font-mono text-[11px] leading-6 text-[#aaa497]">{text}</p></div>;
}

function ProcessCard({ index, title }: { index: number; title: string }) {
  const text = ['Lectura colectiva sin cuenta. Presion cultural, saturacion narrativa y atencion colectiva.', 'Con cuenta. El usuario no crea perfil; genera campo.', 'Con licencia. Memoria longitudinal, twin constitucional, mutaciones propuestas y MIHM runtime.'][index];
  return <div className="border border-[#242017] p-4"><p className="font-mono text-[10px] text-[#8a7035]">{index}</p><h3 className="mt-2 font-serif text-xl text-[#f4f0e7]">{title}</h3><p className="mt-3 font-mono text-[11px] leading-6 text-[#aaa497]">{text}</p></div>;
}

function ArtifactCard({ name, role, function: fn }: { name: string; role: string; function: string }) {
  return <div className="border border-[#242017] p-5"><h3 className="font-serif text-2xl text-[#C8A951]">{name}</h3><p className="mt-3 font-mono text-[11px] uppercase text-[#7a7568]">{role}</p><p className="mt-4 font-mono text-[12px] leading-6 text-[#aaa497]">{fn}</p></div>;
}

function EvidenceCard({ title, state, description, limit }: { title: string; state: string; description: string; limit: string }) {
  return <div className="grid gap-3 border border-[#242017] bg-[#0e0d0b] p-5 md:grid-cols-[220px_1fr]"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#C8A951]">{state}</p><h3 className="mt-3 font-serif text-xl text-[#f4f0e7]">{title}</h3></div><div><p className="font-mono text-[12px] leading-6 text-[#aaa497]">{description}</p><p className="mt-3 font-mono text-[10px] uppercase text-[#7a7568]">Limite: {limit}</p></div></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="border border-[#242017] p-3"><p className="font-mono text-[9px] uppercase text-[#7a7568]">{label}</p><p className="mt-2 font-mono text-[11px] uppercase text-[#f4f0e7]">{value}</p></div>;
}
