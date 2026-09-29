import {
  SFI_DISCOVERY_CRAWLER_POLICY,
  SFI_PUBLIC_DISCOVERY_API_PATHS,
} from '@/lib/discovery/crawlerPolicy';
import { discoveryExposurePlan } from '@/lib/discovery/exposureProjection';
import { discoveryMachineResources } from '@/lib/discovery/discoveryEmitter';
import { SFI_DISCOVERY_LIFECYCLE } from '@/lib/discovery/institutionalDiscoveryMesh';

const AGENT_RECONSTRUCTION = [
  { id:'IDENTITY', state:'RESOLVABLE', basis:'An external system should resolve one institutional identity, canonical domain and public boundary before interpreting content.' },
  { id:'OBJECTS', state:'ENUMERABLE', basis:'Public canonical objects should be enumerable without scraping presentation-only markup.' },
  { id:'LINEAGE', state:'TRACEABLE', basis:'A machine should be able to distinguish source lineage, representation, epistemic state and publication state.' },
  { id:'AUTHORITY', state:'BOUNDED', basis:'Readability must never be interpreted as permission to mutate, execute, govern or infer private state.' },
  { id:'CITATION', state:'STABLE', basis:'Canonical URLs and object identifiers should survive representation changes and support reliable attribution.' },
] as const;

const CHANNELS = [
  {
    id:'HUMAN',
    state:'PUBLIC SURFACE',
    basis:'Registry and public object hubs are directly readable by people.',
  },
  {
    id:'SEARCH',
    state:SFI_DISCOVERY_CRAWLER_POLICY.searchDiscovery.state,
    basis:'Search retrieval is allowed only for declared public paths. Crawl permission is not proof of indexing or retrieval.',
  },
  {
    id:'LLM',
    state:'ADDRESSABLE',
    basis:'llms.txt, llms-full.txt and ai-index.json expose public machine-readable representations. Addressability is not observed discovery.',
  },
  {
    id:'MCP',
    state:'PUBLIC_READ_ONLY',
    basis:'The public MCP surface exposes canonical public resources under read-only authority.',
  },
  {
    id:'API',
    state:'ALLOWLISTED_ONLY',
    basis:'Only explicitly public discovery APIs are eligible. The rest of /api remains deny-by-default.',
  },
] as const;

export function RegistryDiscoveryMesh(){
  const resources=discoveryMachineResources();
  const exposure=discoveryExposurePlan();
  const ownedTargets=exposure.targets.filter((target)=>target.targetClass==='OWNED_MACHINE_SURFACE');
  const machineLinks=[
    ['AI INDEX',resources.aiIndex],
    ['LLMS',resources.llms],
    ['LLMS FULL',resources.llmsFull],
    ['SITEMAP',resources.sitemap],
    ['JSON FEED',resources.jsonFeed],
    ['MCP',resources.mcp.endpoint],
  ] as const;

  return <section className="registryDiscoveryMesh" aria-labelledby="registry-discovery-title">
    <header className="registryDiscoveryHead">
      <div>
        <span>P6 · DISCOVERY MESH PROJECTION</span>
        <h2 id="registry-discovery-title">Published is addressable. Addressable is not discovered.</h2>
        <p>This projection is designed from the position of an external human, search engine, LLM or agent arriving without prior conversational context. It exposes enough public structure to reconstruct SFI without granting authority or converting addressability into evidence of discovery.</p>
      </div>
      <div className="registryDiscoveryCount">
        <b>{ownedTargets.length}</b>
        <span>OWNED MACHINE SURFACES</span>
      </div>
    </header>

    <div className="registryDiscoveryChannels" aria-label="External agent reconstruction test">
      {AGENT_RECONSTRUCTION.map((item)=><article key={item.id}>
        <small>{item.id}</small>
        <strong>{item.state}</strong>
        <p>{item.basis}</p>
      </article>)}
    </div>

    <div className="registryMachineLinks">
      <div>
        <small>AGENT ENTRY RULE</small>
        <p>Resolve identity first, enumerate public objects second, inspect lineage and epistemic state third, then choose the narrowest eligible interface. Do not infer authority from reachability.</p>
      </div>
      <nav aria-label="Preferred machine entry sequence">
        <a href="/ai-index.json">1 · AI INDEX</a>
        <a href="/llms.txt">2 · LLMS</a>
        <a href="/api/external/v1/manifest">3 · MANIFEST</a>
        <a href="/mcp">4 · MCP</a>
      </nav>
    </div>

    <div className="registryDiscoveryChannels" aria-label="Public discovery channel matrix">
      {CHANNELS.map((channel)=><article key={channel.id}>
        <small>{channel.id}</small>
        <strong>{channel.state}</strong>
        <p>{channel.basis}</p>
      </article>)}
    </div>

    <div className="registryLifecycle" aria-label="Discovery lifecycle">
      {SFI_DISCOVERY_LIFECYCLE.stages.map((stage,index)=>{
        const exposureStage=stage.id==='EXPOSURE';
        return <article key={stage.id} data-state={exposureStage?'AVAILABLE':'NOT_EXPOSED'}>
          <div className="registryLifecycleIndex">{String(index+1).padStart(2,'0')}</div>
          <div>
            <small>{stage.id}</small>
            <b>{exposureStage?'AVAILABLE ON OWNED PUBLIC SURFACES':'NOT EXPOSED IN THIS PUBLIC PROJECTION'}</b>
            <p>{stage.meaning}</p>
          </div>
        </article>;
      })}
    </div>

    <div className="registryMachineLinks">
      <div>
        <small>MACHINE REPRESENTATIONS</small>
        <p>These routes improve reconstructibility and retrieval. Their existence does not prove that any external system retrieved them.</p>
      </div>
      <nav aria-label="Machine-readable SFI resources">
        {machineLinks.map(([label,url])=><a key={label} href={url}>{label}</a>)}
      </nav>
    </div>

    <div className="registryDiscoveryPolicy">
      <span>SEARCH BOTS · {SFI_DISCOVERY_CRAWLER_POLICY.searchDiscovery.bots.join(' · ')}</span>
      <span>TRAINING REUSE · {SFI_DISCOVERY_CRAWLER_POLICY.modelTrainingDataReuse.state}</span>
      <span>PUBLIC API · {SFI_PUBLIC_DISCOVERY_API_PATHS.join(' · ')}</span>
    </div>

    <footer className="registryDiscoveryBoundary">
      <b>BOUNDARY</b>
      <span>PUBLICATION = EXPOSURE</span>
      <span>EXPOSURE ≠ DISCOVERY ≠ RECOGNITION ≠ INTERACTION ≠ RELATION ≠ PROPAGATION ≠ PULL ≠ RETURN</span>
      <span>NOT EXPOSED HERE ≠ ZERO ≠ NOT OBSERVED GLOBALLY</span>
      <span>CRAWLER ACCESS ≠ TRAINING CONSENT</span>
    </footer>
  </section>;
}
