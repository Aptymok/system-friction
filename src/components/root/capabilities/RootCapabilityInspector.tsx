import type { StudioCapabilityReadModel } from '@/lib/studio/capabilities/studioCapabilityInventory';
import { RootCapabilityStatus } from './RootCapabilityStatus';

export function RootCapabilityInspector({ capability }: { capability: StudioCapabilityReadModel | null }) {
  if (!capability) {
    return (
      <aside className="root-capability-inspector">
        <span>CAPABILITY INSPECTOR</span>
        <p>Seleccione una capacidad para inspeccionar motor, version, limitaciones y trace.</p>
      </aside>
    );
  }
  return (
    <aside className="root-capability-inspector">
      <span>CAPABILITY INSPECTOR</span>
      <h3>{capability.label}</h3>
      <p>{capability.capability}</p>
      <RootCapabilityStatus status={capability.status} />
      <dl>
        <div><dt>Area</dt><dd>{capability.area}</dd></div>
        <div><dt>Engine</dt><dd>{capability.engine ?? 'NO_ENGINE'}</dd></div>
        <div><dt>Version</dt><dd>{capability.implementationVersion}</dd></div>
        <div><dt>Last execution</dt><dd>{capability.lastExecution ?? 'NO_EXECUTION_RECORDED'}</dd></div>
        <div><dt>Calibration</dt><dd>{capability.lastCalibration}</dd></div>
        <div><dt>Confidence</dt><dd>{capability.confidence === null ? 'NO_CONFIDENCE' : capability.confidence.toFixed(3)}</dd></div>
        <div><dt>Trace</dt><dd>{capability.trace ?? 'NO_TRACE'}</dd></div>
        <div><dt>Routes</dt><dd>{capability.affectedRoutes.join(', ')}</dd></div>
      </dl>
      <section>
        <strong>Dependencies</strong>
        {capability.dependencies.length ? <ul>{capability.dependencies.map((item) => <li key={item}>{item}</li>)}</ul> : <p>NO_DEPENDENCIES</p>}
      </section>
      <section>
        <strong>Outputs</strong>
        <p>{capability.outputKeys.join(', ')}</p>
      </section>
      {capability.limitations.length ? <ul>{capability.limitations.map((item) => <li key={item}>{item}</li>)}</ul> : <p>NO_LIMITATIONS</p>}
      {capability.nextAction ? <p>{capability.nextAction}</p> : null}
    </aside>
  );
}
