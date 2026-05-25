'use client';

type Step = 'Auditoria' | 'Simulacion' | 'Resultado' | 'Accion';

const steps: Step[] = ['Auditoria', 'Simulacion', 'Resultado', 'Accion'];

export function AtlasProcessRail({ activeStep }: { activeStep: Step }) {
  const activeIndex = steps.indexOf(activeStep);
  return (
    <div className="atlas-process-rail" aria-label="Flujo del laboratorio">
      {steps.map((step, index) => (
        <span key={step} className={index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'available'}>
          {step}
        </span>
      ))}
      <style jsx>{`
        .atlas-process-rail {
          position: fixed;
          left: 50%;
          bottom: calc(4.8rem + env(safe-area-inset-bottom, 0px));
          z-index: 24;
          display: flex;
          transform: translateX(-50%);
          gap: 0.45rem;
          align-items: center;
          font-family: "JetBrains Mono", monospace;
          font-size: 0.52rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          pointer-events: none;
        }
        span {
          color: rgba(216, 212, 200, 0.35);
          border-top: 1px solid rgba(200, 169, 81, 0.14);
          padding: 0.34rem 0.5rem 0;
          white-space: nowrap;
        }
        .active {
          color: #C8A951;
          border-color: rgba(200, 169, 81, 0.58);
        }
        .done {
          color: rgba(110, 200, 138, 0.62);
          border-color: rgba(110, 200, 138, 0.32);
        }
        @media (max-width: 760px) {
          .atlas-process-rail {
            left: 0.8rem;
            right: 0.8rem;
            transform: none;
            overflow: hidden;
            justify-content: center;
            bottom: calc(5.4rem + env(safe-area-inset-bottom, 0px));
            font-size: 0.46rem;
            gap: 0.18rem;
          }
          span {
            padding-left: 0.28rem;
            padding-right: 0.28rem;
          }
        }
      `}</style>
    </div>
  );
}
