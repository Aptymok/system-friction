import React from 'react';

export function EidolonUIFull({ state, onTextSubmit, onRetroRun }) {
  const [input, setInput] = React.useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!input.trim()) return;
    onTextSubmit(input);
    setInput('');
  };

  return (
    <div className={`eidolon-shell ${state.retroState ? 'eidolon-retro-skin' : 'eidolon-normal-skin'}`}>
      <section className="panel">
        <h3>MIHM v3.1 · Estado Actual</h3>
        <p>IHG: {state.mihmState.ihg}</p>
        <p>NTI: {state.mihmState.nti}</p>
        <p>IHG 30d: {state.mihmState.ihg30}</p>
        <p>NTI 30d: {state.mihmState.nti30}</p>
        <p>Severidad: {state.mihmState.severity}</p>
      </section>

      <section className="panel">
        <h3>Patrones activados</h3>
        {state.activePatterns.map((pattern) => (
          <div key={pattern.id}>{pattern.id} · {pattern.strength}</div>
        ))}
      </section>

      <section className="panel">
        <h3>Síntesis SF-PERSONA</h3>
        <pre>{state.personaOutput}</pre>
      </section>

      <section className="panel">
        <h3>Entrada semántica</h3>
        <form onSubmit={submit}>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={4} />
          <button type="submit">Analizar</button>
        </form>
      </section>

      <section className="panel">
        <h3>Retrocausalidad</h3>
        <button type="button" onClick={() => onRetroRun(1)}>Ejecutar RetroSim</button>
        {state.retroState?.timesteps?.map((step) => (
          <div key={step.t}>Δt {step.t} · IHG {step.mihm.ihg} · NTI {step.mihm.nti}</div>
        ))}
      </section>
    </div>
  );
}
