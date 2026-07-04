import { Menu } from 'lucide-react';
import type { StudioGoldState } from '@/lib/studio/gold/studioGoldState';
import { StudioCulturalWaveRenderer } from './visual/StudioCulturalWaveRenderer';

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function dec(value: number) {
  return value.toFixed(2);
}

export function StudioMobileConsole({ state }: { state: StudioGoldState }) {
  const signals = state.persistentSignals.slice(0, 3);
  const tracks = state.longitudinalTracking.slice(0, 3);

  return (
    <div className="sfi-studio-gold__mobile-console">
      <div className="sfi-studio-gold__mobile-status">
        <span>{new Date(state.generatedAt).toISOString().slice(11, 16)}</span>
        <span>{state.systemState.toUpperCase()}</span>
      </div>
      <header className="sfi-studio-gold__mobile-header">
        <div>
          <span>SFI / STUDIO</span>
          <strong>STUDIO</strong>
        </div>
        <Menu size={20} strokeWidth={1.5} />
      </header>

      <section className="sfi-studio-gold__mobile-panel">
        <div className="sfi-studio-gold__mobile-panel-title">CASO ACTIVO</div>
        <h2>{state.activeCase.title}</h2>
        <p>{state.activeCase.id ?? 'SIN ID'} · {state.activeCase.phase}</p>
        <div className="sfi-studio-gold__mobile-triplet">
          <span>PROGRESO <strong>{pct(state.activeCase.progress)}</strong></span>
          <span>SENALES <strong>{state.activeCase.signals}</strong></span>
          <span>DIAS <strong>{state.activeCase.activeDays}</strong></span>
        </div>
      </section>

      <section className="sfi-studio-gold__mobile-panel">
        <div className="sfi-studio-gold__mobile-panel-title">CULTURAL WAVE / RESUMEN</div>
        <div className="sfi-studio-gold__mobile-wave">
          <StudioCulturalWaveRenderer wave={state.culturalWave} />
        </div>
        <div className="sfi-studio-gold__mobile-triplet">
          <span>COHERENCIA <strong>{dec(state.culturalWave.coherenceGlobal)}</strong></span>
          <span>ENTROPIA <strong>{dec(state.culturalWave.culturalEntropy)}</strong></span>
          <span>DENSIDAD <strong>{dec(state.culturalWave.symbolicDensity)}</strong></span>
        </div>
      </section>

      <section className="sfi-studio-gold__mobile-pair">
        <div className="sfi-studio-gold__mobile-panel">
          <div className="sfi-studio-gold__mobile-panel-title">WSV / LENTE</div>
          <strong>{dec(state.wsvLens.global)}</strong>
          <p>World Systems Vector</p>
        </div>
        <div className="sfi-studio-gold__mobile-panel">
          <div className="sfi-studio-gold__mobile-panel-title">MIHM / MODELO</div>
          <strong>{dec(state.mihmModel.systemic)}</strong>
          <p>Marco Integrado Holonico</p>
        </div>
      </section>

      <section className="sfi-studio-gold__mobile-panel">
        <div className="sfi-studio-gold__mobile-panel-title">SENALES PERSISTENTES · ACTIVAS: {state.persistentSignals.length}</div>
        {signals.length ? signals.map((signal) => (
          <div className="sfi-studio-gold__mobile-row" key={signal.id}>
            <span>{signal.id}</span>
            <em>{signal.label}</em>
            <strong>{signal.intensity.toUpperCase()}</strong>
          </div>
        )) : <p className="sfi-studio-gold__empty">Sin senales persistentes.</p>}
      </section>

      <section className="sfi-studio-gold__mobile-panel">
        <div className="sfi-studio-gold__mobile-panel-title">SEGUIMIENTO LONGITUDINAL · HORIZONTE: 90 DIAS</div>
        {tracks.length ? tracks.map((track) => (
          <div className="sfi-studio-gold__mobile-row" key={track.id}>
            <span>{track.id}</span>
            <em>{track.label}</em>
            <strong>{dec(track.value)}</strong>
          </div>
        )) : <p className="sfi-studio-gold__empty">Sin trayectoria longitudinal.</p>}
      </section>

      <section className="sfi-studio-gold__mobile-panel">
        <div className="sfi-studio-gold__mobile-panel-title">PROTOCOLO DE ANALISIS</div>
        <h2>{state.pmv.state === 'blocked' ? '03 SEGUIMIENTO' : '04 PMV'}</h2>
        <p>{state.synthesis.nextAction}</p>
        <div className="sfi-studio-gold__mobile-progress"><span style={{ width: pct(state.synthesis.confidence) }} /></div>
      </section>

      <nav className="sfi-studio-gold__bottom-nav" aria-label="Studio mobile modes">
        {['OBSERVAR', 'MODELAR', 'SIMULAR', 'GOBERNAR', 'EJECUTAR'].map((item) => <span key={item}>{item}</span>)}
      </nav>
    </div>
  );
}
