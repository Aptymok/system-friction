import fs from 'node:fs';
import path from 'node:path';

const target = path.join(process.cwd(), 'src/observatory/components/os/SfiObservatoryOS.tsx');
let source = fs.readFileSync(target, 'utf8');

function mustFind(label, pattern) {
  if (!pattern.test(source)) {
    throw new Error(`P-01 patch failed: missing pattern ${label}`);
  }
}

function replaceAll(label, pattern, replacement) {
  mustFind(label, pattern);
  source = source.replace(pattern, replacement);
}

// Edge thickness, tolerant to spacing.
replaceAll(
  'causal edge width',
  /relation\.includes\('causal_verified'\)\) return \{ stroke: '#ef4444', width: [0-9.]+, dash: '' \};/,
  "relation.includes('causal_verified')) return { stroke: '#ef4444', width: 0.9, dash: '' };"
);

replaceAll(
  'correlational edge width',
  /relation\.includes\('correlational_observed'\) \|\| relation\.includes\('resonance'\)\) return \{ stroke: '#f59e0b', width: [0-9.]+, dash: '4 4' \};/,
  "relation.includes('correlational_observed') || relation.includes('resonance')) return { stroke: '#f59e0b', width: 0.55, dash: '4 4' };"
);

replaceAll(
  'structural edge width',
  /relation\.includes\('structural'\) \|\| relation\.includes\('structural_inferred'\)\) return \{ stroke: '#2dd4bf', width: [0-9.]+, dash: '' \};/,
  "relation.includes('structural') || relation.includes('structural_inferred')) return { stroke: '#2dd4bf', width: 0.45, dash: '' };"
);

replaceAll(
  'fallback edge width',
  /return \{ stroke: '#71717a', width: [0-9.]+, dash: '2 6' \};/,
  "return { stroke: '#71717a', width: 0.35, dash: '2 6' };"
);

// Add regime chips constant if missing.
if (!source.includes('const REGIME_CHIPS')) {
  source = source.replace(
    "const COMMANDS = ['/observe', '/propose', '/project', '/simulate', '/mutate', '/inhibit', '/visualize', '/calendar', '/explain'];",
    "const COMMANDS = ['/observe', '/propose', '/project', '/simulate', '/mutate', '/inhibit', '/visualize', '/calendar', '/explain'];\nconst REGIME_CHIPS = ['Observación', 'Contradicción', 'Energía', 'Validación', 'Temporalidad', 'Gobernanza'];"
  );
}

// Add publicFieldReading helper if missing.
if (!source.includes('function publicFieldReading')) {
  source = source.replace(
    /function computeIntegrity\(data: ObservatoryState \| null\) \{[\s\S]*?return \{ value, label: 'derived' \};\n\}\n/,
    (match) => `${match}
function publicFieldReading(data: ObservatoryState | null) {
  if (!data) return ['El campo está listo para observación.'];
  const nodeCount = data.graph?.nodes?.length ?? 0;
  const edgeCount = data.graph?.edges?.length ?? 0;
  const warnings = data.warnings ?? [];
  const mihmLatest = records(data.mihm)[0] ?? {};
  const vector = isRecord(mihmLatest.homeostatic_vector) ? mihmLatest.homeostatic_vector : {};
  return [
    \`El campo está listo para observación con \${nodeCount} nodos y \${edgeCount} enlaces visibles.\`,
    warnings.length > 0 ? \`Hay \${warnings.length} advertencia(s) activas; trátalas como señales de atención, no como fallo total.\` : 'No hay advertencias críticas activas en esta lectura.',
    \`MIHM se encuentra \${records(data.mihm).length > 0 ? 'observado' : 'latente'}; la lectura puede continuar sin declarar ausencia.\`,
    Object.keys(vector).length > 0 ? \`Vector homeostático disponible: \${Object.keys(vector).join(', ')}.\` : 'El vector homeostático permanece en espera de nueva medición.',
    'La observación debe iniciar con una pregunta concreta sobre contradicción, energía, validación, temporalidad o gobernanza.',
  ].slice(0, 5);
}
`
  );
}

// Messages.
source = source.replaceAll('FIELD LINK WAITING', 'El campo está listo para observación');
source = source.replaceAll('FIELD LINK ESTABLISHED', 'El campo está listo para observación');
source = source.replaceAll('LOCKED BY GOVERNANCE', 'Gobernanza bloquea esta acción');
source = source.replaceAll('CONSTITUTIONAL ACCESS REQUIRED', 'Autenticación requerida para modificar el campo');
source = source.replaceAll('COMMAND UNDER POLICY', 'Procesando observación bajo política');
source = source.replaceAll('UNKNOWN CONSTITUTIONAL COMMAND', 'Comando no reconocido por el observatorio');
source = source.replaceAll('PROPOSAL RECORDED UNDER POLICY', 'Observación registrada en el campo');
source = source.replaceAll('INPUT CONSTITUTIONAL', 'Observación del campo');
source = source.replaceAll('READ MODE · AUTH REQUIRED FOR MUTATION', 'Modo lectura · autentica para modificar el campo');

// CognitiveField prop.
if (!source.includes('publicReading={publicFieldReading(observatory)}')) {
  source = source.replace(
    /(\s+)onNode=\{\(node\) => setDrawer\(\{ title: `\$\{node\.label\} · \$\{nodeType\(node\)\}`, payload: \{ node, provenance: node\.provenance \?\? 'graph_nodes' \}, lineage: node\.lineage \?\? \[\] \}\)\}/,
    `$1publicReading={publicFieldReading(observatory)}$1onNode={(node) => setDrawer({ title: \`\${node.label} · \${nodeType(node)}\`, payload: { node, provenance: node.provenance ?? 'graph_nodes' }, lineage: node.lineage ?? [] })}`
  );
}

// TopBar MIHM latent.
source = source.replace(
  `<StatusPill label="MIHM" value={percent(props.mihmCapacity)} state={props.mihmCapacity ? 'observed' : 'missing'} />`,
  `<StatusPill label="MIHM" value={props.mihmCapacity ? percent(props.mihmCapacity) : 'latente'} state={props.mihmCapacity ? 'observed' : 'latent'} />`
);

// MIHM rows latent.
source = source.replaceAll("mihm.regime ?? 'missing'", "mihm.regime ?? 'latente'");
source = source.replaceAll("mihm.degradation ?? 'missing'", "mihm.degradation ?? 'latente'");
source = source.replace(
  "isRecord(mihm.homeostatic_vector) ? Object.keys(mihm.homeostatic_vector).join(', ') || 'empty' : 'missing'",
  "isRecord(mihm.homeostatic_vector) ? Object.keys(mihm.homeostatic_vector).join(', ') || 'empty' : 'latente'"
);

// CognitiveField type.
if (!source.includes('publicReading: string[];')) {
  source = source.replace(
    `  sandboxCount: number;
  highlight: string[];
  onNode: (node: GraphNode) => void;`,
    `  sandboxCount: number;
  highlight: string[];
  publicReading: string[];
  onNode: (node: GraphNode) => void;`
  );
}

// Regime chips.
source = source.replace(
  `<LayerMark label="OBSERVATION RING" active={props.state === 'observed'} />
        <LayerMark label="SIMULATION SHADOW" active={props.sandboxCount > 0} />
        <LayerMark label="MUTATION VECTOR" active={props.approvedMutations > 0} />
        <LayerMark label="PERCEPTUAL LAYER" active={props.multimediaCount > 0} />`,
  `{REGIME_CHIPS.map((chip) => <LayerMark key={chip} label={chip} active={chip === 'Observación' ? props.state === 'observed' : false} />)}`
);

// Public Field Reading block.
if (!source.includes('Public Field Reading')) {
  source = source.replace(
    `<svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">`,
    `<div className="absolute left-4 top-20 z-10 max-w-sm border border-white/10 bg-black/45 p-3 backdrop-blur">
        <p className="font-mono text-[9px] uppercase text-teal-100">Public Field Reading</p>
        <ul className="mt-2 space-y-1 font-mono text-[10px] leading-relaxed text-zinc-300">
          {props.publicReading.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">`
  );
}

// Input placeholder + labels.
if (!source.includes('placeholder="Describe qué quieres observar del campo…"')) {
  source = source.replace(
    `aria-label="constitutional command"`,
    `aria-label="observación narrativa del campo"
          placeholder="Describe qué quieres observar del campo…"`
  );
}

source = source.replace(`<Play className="h-3 w-3" /> Execute`, `<Play className="h-3 w-3" /> Observar`);

fs.writeFileSync(target, source);
console.log('P-01 Observatory Organic Interaction Pass applied.');
