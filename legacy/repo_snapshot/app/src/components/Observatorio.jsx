import docs from '@/data/docs.json';
import patterns from '@/data/patterns.json';

export default function Observatorio() {
  const docsList = docs.documents || docs.docs || [];
  const patternList = patterns.patterns || [];

  return (
    <section>
      <h2>Observatorio</h2>
      <h3>Documentos</h3>
      <ul>{docsList.slice(0, 8).map((d, i) => <li key={d.id || i}>{d.title || d.name || JSON.stringify(d).slice(0, 50)}</li>)}</ul>
      <h3>Patrones</h3>
      <ul>{patternList.slice(0, 8).map((p, i) => <li key={p.id || i}>{p.name || p.id}</li>)}</ul>
    </section>
  );
}
