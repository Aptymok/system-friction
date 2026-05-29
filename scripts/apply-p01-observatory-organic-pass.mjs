import fs from 'node:fs';
import path from 'node:path';

const target = path.join(process.cwd(), 'src/observatory/components/os/SfiObservatoryOS.tsx');
let source = fs.readFileSync(target, 'utf8');

function replaceOnce(label, from, to) {
  if (!source.includes(from)) {
    throw new Error(`P-01 patch failed: missing block ${label}`);
  }
  source = source.replace(from, to);
}

replaceOnce(
  'edgeStyle widths',
  `function edgeStyle(edge: GraphEdge) {
  const relation = stringValue(edge.relation, stringValue(edge.attributes?.canvasKind, 'inferred'));
  if (relation.includes('causal_verified')) return { stroke: '#ef4444', width: 2.2, dash: '' };
  if (relation.includes('correlational_observed') || relation.includes('resonance')) return { stroke: '#f59e0b', width: 1.3, dash: '4 4' };
  if (relation.includes('structural') || relation.includes('structural_inferred')) return { stroke: '#2dd4bf', width: 1.1, dash: '' };
  return { stroke: '#71717a', width: 0.8, dash: '2 6' };
}
`,
  `function edgeStyle(edge: GraphEdge) {
  const relation = stringValue(edge.relation, stringValue(edge.attributes?.canvasKind, 'inferred'));
  if (relation.includes('causal_verified')) return { stroke: '#ef4444', width: 0.9, dash: '' };
  if (relation.includes('correlational_observed') || relation.includes('resonance')) return { stroke: '#f59e0b', width: 0.55, dash: '4 4' };
  if (relation.includes('structural') || relation.includes('structural_inferred')) return { stroke: '#2dd4bf', width: 0.45, dash: '' };
  return { stroke: '#71717a', width: 0.35, dash: '2 6' };
}
`
);

replaceOnce(
  'commands constant',
  `const COMMANDS = ['/observe', '/propose', '/project', '/simulate', '/mutate', '/inhibit', '/visualize', '/calendar', '/explain'];
`,
  `const COMMANDS = ['/observe', '/propose', '/project', '/simulate', '/mutate', '/inhibit', '/visualize', '/calendar', '/explain'];
const REGIME_CHIPS = ['Observación', 'Contradicción', 'Energía', 'Validación', 'Temporalidad', 'Gobernanza'];
`
);

replaceOnce(
  'public field reading helper insertion',
  `function computeIntegrity(data: ObservatoryState | null) {
  if (!data) return { value: null, label: 'missing' };
  const graphObserved = data.graph?.sourceState === 'observed' ? 1 : 0;
  const governanceActive = data.governance?.blindMode ? 0 : data.governance?.status === 'active' ? 1 : 0.35;
  const kernelAvailable = data.kernel ? 1 : 0;
  const confidence = numberValue(data.kernel?.confidence ?? data.worldspect?.confidence) ?? 0;
  const degradedPenalty = Math.min((data.warnings?.length ?? 0) * 0.08, 0.32);
  const value = Math.max(0, Math.min(1, confidence * 0.34 + graphObserved * 0.24 + governanceActive * 0.24 + kernelAvailable * 0.18 - degradedPenalty));
  return { value, label: 'derived' };
}
`,
  `function computeIntegrity(data: ObservatoryState | null) {
  if (!data) return { value: null, label: 'missing' };
  const graphObserved = data.graph?.sourceState === 'observed' ? 1 : 0;
  const governanceActive = data.governance?.blindMode ? 0 : data.governance?.status === 'active' ? 1 : 0.35;
  const kernelAvailable = data.kernel ? 1 : 0;
  const confidence = numberValue(data.kernel?.confidence ?? data.worldspect?.confidence) ?? 0;
  const degradedPenalty = Math.min((data.warnings?.length ?? 0) * 0.08, 0.32);
  const value = Math.max(0, Math.min(1, confidence * 0.34 + graphObserved * 0.24 + governanceActive * 0.24 + kernelAvailable * 0.18 - degradedPenalty));
  return { value, label: 'derived' };
}

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

replaceOnce(
  'command initial message',
  `const [commandState, setCommandState] = useState<CommandState>({ status: 'idle', message: 'FIELD LINK WAITING' });`,
  `const [commandState, setCommandState] = useState<CommandState>({ status: 'idle', message: 'El campo está listo para observación' });`
);

replaceOnce(
  'field link established message',
  `setCommandState((prev) => prev.status === 'running' ? { status: 'done', message: 'FIELD LINK ESTABLISHED' } : prev);`,
  `setCommandState((prev) => prev.status === 'running' ? { status: 'done', message: 'El campo está listo para observación' } : prev);`
);

replaceOnce(
  'organic command messages',
  `setCommandState({ status: 'error', message: 'LOCKED BY GOVERNANCE' });`,
  `setCommandState({ status: 'error', message: 'Gobernanza bloquea esta acción' });`
);
replaceOnce(
  'auth required message',
  `setCommandState({ status: 'error', message: 'CONSTITUTIONAL ACCESS REQUIRED' });`,
  `setCommandState({ status: 'error', message: 'Autenticación requerida para modificar el campo' });`
);
replaceOnce(
  'command running message',
  `setCommandState({ status: 'running', message: 'COMMAND UNDER POLICY' });`,
  `setCommandState({ status: 'running', message: 'Procesando observación bajo política' });`
);
replaceOnce(
  'unknown command message',
  `throw new Error('UNKNOWN CONSTITUTIONAL COMMAND');`,
  `throw new Error('Comando no reconocido por el observatorio');`
);
replaceOnce(
  'proposal recorded message',
  `setCommandState({ status: 'done', message: 'PROPOSAL RECORDED UNDER POLICY' });`,
  `setCommandState({ status: 'done', message: 'Observación registrada en el campo' });`
);

replaceOnce(
  'CognitiveField call public reading',
  `            onNode={(node) => setDrawer({ title: \`${'${node.label}'} · ${'${nodeType(node)}'}\`, payload: { node, provenance: node.provenance ?? 'graph_nodes' }, lineage: node.lineage ?? [] })}
          />`,
  `            publicReading={publicFieldReading(observatory)}
            onNode={(node) => setDrawer({ title: \`${'${node.label}'} · ${'${nodeType(node)}'}\`, payload: { node, provenance: node.provenance ?? 'graph_nodes' }, lineage: node.lineage ?? [] })}
          />`
);

replaceOnce(
  'TopBar MIHM latent',
  `<StatusPill label="MIHM" value={percent(props.mihmCapacity)} state={props.mihmCapacity ? 'observed' : 'missing'} />`,
  `<StatusPill label="MIHM" value={props.mihmCapacity ? percent(props.mihmCapacity) : 'latente'} state={props.mihmCapacity ? 'observed' : 'latent'} />`
);

replaceOnce(
  'MIHM runtime labels latent',
  `        ['regime', mihm.regime ?? 'missing'],
        ['capacity', percent(mihm.operationalCapacity ?? mihm.capacity)],
        ['degradation', mihm.degradation ?? 'missing'],
        ['vector', isRecord(mihm.homeostatic_vector) ? Object.keys(mihm.homeostatic_vector).join(', ') || 'empty' : 'missing'],`,
  `        ['regime', mihm.regime ?? 'latente'],
        ['capacity', percent(mihm.operationalCapacity ?? mihm.capacity)],
        ['degradation', mihm.degradation ?? 'latente'],
        ['vector', isRecord(mihm.homeostatic_vector) ? Object.keys(mihm.homeostatic_vector).join(', ') || 'empty' : 'latente'],`
);

replaceOnce(
  'CognitiveField props public reading type',
  `  sandboxCount: number;
  highlight: string[];
  onNode: (node: GraphNode) => void;`,
  `  sandboxCount: number;
  highlight: string[];
  publicReading: string[];
  onNode: (node: GraphNode) => void;`
);

replaceOnce(
  'layer marks block',
  `        <LayerMark label="OBSERVATION RING" active={props.state === 'observed'} />
        <LayerMark label="SIMULATION SHADOW" active={props.sandboxCount > 0} />
        <LayerMark label="MUTATION VECTOR" active={props.approvedMutations > 0} />
        <LayerMark label="PERCEPTUAL LAYER" active={props.multimediaCount > 0} />`,
  `        {REGIME_CHIPS.map((chip) => <LayerMark key={chip} label={chip} active={chip === 'Observación' ? props.state === 'observed' : false} />)}`
);

replaceOnce(
  'public reading overlay before svg',
  `      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">`,
  `      <div className="absolute left-4 top-20 z-10 max-w-sm border border-white/10 bg-black/45 p-3 backdrop-blur">
        <p className="font-mono text-[9px] uppercase text-teal-100">Public Field Reading</p>
        <ul className="mt-2 space-y-1 font-mono text-[10px] leading-relaxed text-zinc-300">
          {props.publicReading.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">`
);

replaceOnce(
  'constitutional input label placeholder button',
  `          <span>{props.blindMode ? 'LOCKED BY GOVERNANCE' : 'INPUT CONSTITUTIONAL'}</span>`,
  `          <span>{props.blindMode ? 'Gobernanza bloqueada' : 'Observación del campo'}</span>`
);
replaceOnce(
  'input aria label',
  `          aria-label="constitutional command"`,
  `          aria-label="observación narrativa del campo"
          placeholder="Describe qué quieres observar del campo…"`
);
replaceOnce(
  'execute button',
  `          <Play className="h-3 w-3" /> Execute`,
  `          <Play className="h-3 w-3" /> Observar`
);
replaceOnce(
  'read mode auth text',
  `{props.authenticated ? props.state.message : 'READ MODE · AUTH REQUIRED FOR MUTATION'}`,
  `{props.authenticated ? props.state.message : 'Modo lectura · autentica para modificar el campo'}`
);

fs.writeFileSync(target, source);
console.log('P-01 Observatory Organic Interaction Pass applied to SfiObservatoryOS.tsx');
