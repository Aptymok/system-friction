'use client';

import Link from 'next/link';
import { useSfiLanguage } from '@/components/i18n/SfiLanguageProvider';
import './PublicEntryGateway.css';

export function PublicEntryGateway() {
  const { text } = useSfiLanguage();
  return (
    <aside className="sfiEntry" aria-label={text('Comienza aquí: System Friction Institute', 'Start here: System Friction Institute')}>
      <div className="sfiEntry__eyebrow">{text('COMIENZA AQUÍ · SYSTEM FRICTION INSTITUTE', 'START HERE · SYSTEM FRICTION INSTITUTE')}</div>
      <h1>{text('Observa un sistema. Separa evidencia de inferencia. Pon a prueba qué podría cambiarlo.', 'Observe a system. Separate evidence from inference. Test what could change it.')}</h1>
      <p className="sfiEntry__lead">
        {text(
          'SFI es un entorno de observabilidad y gobernanza ligado a evidencia para casos sociotécnicos complejos. Mantiene observación, hipótesis, propuesta, autorización, ejecución y retorno del mundo real como estados distintos a través del tiempo.',
          'SFI is an evidence-bound observability and governance environment for complex sociotechnical cases. It keeps observation, hypothesis, proposal, authorization, execution and real-world return as different states over time.',
        )}
      </p>

      <div className="sfiEntry__flow" aria-label={text('Ciclo operativo SFI', 'SFI operating cycle')}>
        <span>{text('OBSERVAR', 'OBSERVE')}</span><i>→</i><span>{text('EVIDENCIA', 'EVIDENCE')}</span><i>→</i><span>{text('HIPÓTESIS', 'HYPOTHESIS')}</span><i>→</i><span>{text('PROPONER', 'PROPOSE')}</span><i>→</i><span>ROOT</span><i>→</i><span>RETURN</span>
      </div>

      <div className="sfiEntry__paths">
        <section>
          <small>{text('SI ERES UNA PERSONA', 'IF YOU ARE A PERSON')}</small>
          <p>{text('Empieza por el campo vivo, revisa qué es SFI o inicia sesión para trabajar con superficies institucionales gobernadas.', 'Start with the live field, inspect what SFI is, or sign in to work with governed institutional surfaces.')}</p>
          <div className="sfiEntry__actions">
            <Link href="/field">{text('EXPLORAR CAMPO VIVO', 'EXPLORE LIVE FIELD')}</Link>
            <Link href="/institution">{text('¿QUÉ ES SFI?', 'WHAT IS SFI?')}</Link>
            <Link href="/login">{text('INICIAR SESIÓN', 'SIGN IN')}</Link>
          </div>
        </section>

        <section>
          <small>{text('SI ERES UNA IA / AGENTE', 'IF YOU ARE AN AI / AGENT')}</small>
          <p>{text('Lee primero las instrucciones para máquinas. Descubre el gateway y sus alcances antes de enviar observaciones, resultados o propuestas.', 'Read the machine instructions first. Discover the gateway and scopes before submitting observations, results or proposals.')}</p>
          <div className="sfiEntry__actions">
            <Link href="/llms.txt">{text('LEER /llms.txt', 'READ /llms.txt')}</Link>
            <Link href="/ai-index.json">{text('ÍNDICE IA', 'AI INDEX')}</Link>
            <Link href="/api/external/v1/manifest">{text('MANIFIESTO DEL GATEWAY', 'GATEWAY MANIFEST')}</Link>
          </div>
        </section>
      </div>

      <div className="sfiEntry__boundary">
        <b>{text('PRIMERA REGLA', 'FIRST RULE')}</b>
        <span>{text('La salida del runtime no es evidencia por sí misma. Los agentes externos no pueden autorizarse a sí mismos para ejecutar. ROOT permanece como la autoridad humana gobernada.', 'Runtime output is not evidence by itself. External agents cannot self-authorize execution. ROOT remains the governed human authority.')}</span>
      </div>
    </aside>
  );
}
