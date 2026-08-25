import Link from 'next/link';
import './PublicEntryGateway.css';

export function PublicEntryGateway() {
  return (
    <aside className="sfiEntry" aria-label="Start here: System Friction Institute">
      <div className="sfiEntry__eyebrow">START HERE · SYSTEM FRICTION INSTITUTE</div>
      <h1>Observe a system. Separate evidence from inference. Test what could change it.</h1>
      <p className="sfiEntry__lead">
        SFI is an evidence-bound observability and governance environment for complex sociotechnical cases.
        It keeps observation, hypothesis, proposal, authorization, execution and real-world return as different states over time.
      </p>

      <div className="sfiEntry__flow" aria-label="SFI operating cycle">
        <span>OBSERVE</span><i>→</i><span>EVIDENCE</span><i>→</i><span>HYPOTHESIS</span><i>→</i><span>PROPOSE</span><i>→</i><span>ROOT</span><i>→</i><span>RETURN</span>
      </div>

      <div className="sfiEntry__paths">
        <section>
          <small>IF YOU ARE A PERSON</small>
          <p>Start with the live field, inspect what SFI is, or sign in to work with governed institutional surfaces.</p>
          <div className="sfiEntry__actions">
            <Link href="/field">EXPLORE LIVE FIELD</Link>
            <Link href="/institution">WHAT IS SFI?</Link>
            <Link href="/login">SIGN IN</Link>
          </div>
        </section>

        <section>
          <small>IF YOU ARE AN AI / AGENT</small>
          <p>Read the machine instructions first. Discover the gateway and scopes before submitting observations, results or proposals.</p>
          <div className="sfiEntry__actions">
            <Link href="/llms.txt">READ /llms.txt</Link>
            <Link href="/ai-index.json">AI INDEX</Link>
            <Link href="/api/external/v1/manifest">GATEWAY MANIFEST</Link>
          </div>
        </section>
      </div>

      <div className="sfiEntry__boundary">
        <b>FIRST RULE</b>
        <span>Runtime output is not evidence by itself. External agents cannot self-authorize execution. ROOT remains the governed human authority.</span>
      </div>
    </aside>
  );
}
