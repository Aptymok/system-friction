export default function CampoCognitivo({ phi = {}, patterns = [] }) {
  const nodes = Object.entries(phi).slice(0, 12);

  return (
    <section>
      <h2>Campo cognitivo</h2>
      <svg width="520" height="220" role="img" aria-label="campo cognitivo">
        {nodes.map(([id, value], idx) => (
          <g key={id}>
            <circle cx={30 + idx * 40} cy={90} r={8 + Math.abs(value) * 12} fill="#c8a96e" />
            <text x={20 + idx * 40} y={140} fontSize="10" fill="#ddd8c9">{id}</text>
          </g>
        ))}
      </svg>
      <p>Patrones activos: {patterns.length}</p>
    </section>
  );
}
