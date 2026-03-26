export default function Dashboard({ mihmState, scoreFriction }) {
  return (
    <section>
      <h2>Dashboard</h2>
      <ul>
        <li>IHG: {mihmState.ihg}</li>
        <li>NTI: {mihmState.nti}</li>
        <li>Prob. colapso: {(Math.abs(mihmState.ihg) * 0.7).toFixed(3)}</li>
        <li>Score friction: {scoreFriction.toFixed(3)}</li>
      </ul>
    </section>
  );
}
