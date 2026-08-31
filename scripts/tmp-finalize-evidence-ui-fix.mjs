import fs from 'node:fs';

function patch(path, transform) {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`NO_CHANGE:${path}`);
  fs.writeFileSync(path, after);
}

patch('src/lib/sfi/evidenceRequirementResolver.ts', (s) => {
  const target = `  const claims = claimStrings(context);\n  const blob = [input.question, input.objective, input.declaredFunction, input.systemType, JSON.stringify(context)]`;
  if (!s.includes(target)) throw new Error('RESOLVER_UNUSED_CLAIMS_ANCHOR_MISSING');
  return s.replace(target, `  const blob = [input.question, input.objective, input.declaredFunction, input.systemType, JSON.stringify(context)]`);
});

patch('src/components/sfi/ObservatoryConsole.tsx', (s) => {
  const target = `  const narrative=selected?nodeNarrative(selected,neighbors):nodes.length?\`Se observan ${'${nodes.length}'} eventos georreferenciados. ${'${hypotheses.length}'} hipótesis están vinculadas al campo y ${'${outcomes.length}'} ya tienen contraste. Selecciona un nodo: aparecerán su vecindad, fricción e historia.\`:\`La serie WorldSpect contiene ${'${frames.length}'} cortes históricos. Abre el satélite para la lectura diaria, las diez dimensiones, hipótesis y aprendizaje.\`;`;
  if (!s.includes(target)) throw new Error('OBSERVATORY_NARRATIVE_ANCHOR_MISSING');
  let out = s.replace(target, `  const narrative=selected?nodeNarrative(selected,neighbors,language):nodes.length?ownedText(\`Se observan ${'${nodes.length}'} eventos georreferenciados. ${'${hypotheses.length}'} hipótesis están vinculadas al campo y ${'${outcomes.length}'} ya tienen contraste. Selecciona un nodo: aparecerán su vecindad, fricción e historia.\`,\`There are ${'${nodes.length}'} georeferenced observations. ${'${hypotheses.length}'} hypotheses are linked to the field and ${'${outcomes.length}'} already have contrast. Select a node to inspect its neighborhood, friction and history.\`):ownedText(\`La serie WorldSpect contiene ${'${frames.length}'} cortes históricos. Abre el satélite para la lectura diaria, las diez dimensiones, hipótesis y aprendizaje.\`,\`The WorldSpect series contains ${'${frames.length}'} historical snapshots. Open the satellite for the daily reading, ten dimensions, hypotheses and learning.\`);`);
  out = out.replace(`if(friction!=null)parts.push(\`Systemic friction is ${'${frictionBand(friction)}'} (${'${friction.toFixed(3)}'})`, `if(friction!=null)parts.push(\`Systemic friction is ${'${friction.toFixed(3)}'}`);
  return out;
});

console.log('SFI evidence/UI cleanup applied');
