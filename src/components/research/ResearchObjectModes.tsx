'use client';

import { useMemo, useState } from 'react';
import type { SfiPublicResearchLanding } from '@/lib/research/publicResearchLanding';
import styles from './ResearchObjectModes.module.css';

type Mode = 'HUMAN' | 'RECONSTRUCT' | 'MACHINE';

function status(value: unknown) {
  if (Array.isArray(value)) return value.length ? 'OBSERVED' : 'NOT_EXPOSED';
  if (typeof value === 'string') return value.trim() ? 'OBSERVED' : 'NOT_EXPOSED';
  return value == null ? 'NOT_EXPOSED' : 'OBSERVED';
}

export function ResearchObjectModes({ landing }: { landing: SfiPublicResearchLanding }) {
  const [mode,setMode] = useState<Mode>('HUMAN');
  const { node, citation } = landing;

  const reconstruct = useMemo(()=>[
    { key:'IDENTITY', state:'OBSERVED', value:node.canonicalObjectId, note:'Canonical public object identity.' },
    { key:'SOURCES', state:status(node.sourceRefs), value:node.sourceRefs.length ? node.sourceRefs.join(' · ') : 'NOT EXPOSED', note:'Public source lineage only.' },
    { key:'METHOD', state:status(node.methods), value:node.methods.length ? node.methods.join(' · ') : 'NOT EXPOSED', note:'Method relation is shown only when asserted by canon.' },
    { key:'RELATIONS', state:status(node.relatedCanonicalObjectIds), value:node.relatedCanonicalObjectIds.length ? node.relatedCanonicalObjectIds.join(' · ') : 'NOT EXPOSED', note:'Canonical RELATED_OBJECT projection; no causal semantics inferred.' },
    { key:'EPISTEMIC STATE', state:'OBSERVED', value:node.epistemicState, note:'State declared by the canonical public projection.' },
    { key:'EVIDENCE ADMISSION', state:'NOT_EXPOSED', value:'NOT ASSERTED BY THIS PUBLIC PROJECTION', note:'Visibility of a publication does not admit evidence.' },
    { key:'AUTHORITY', state:'NOT_EXPOSED', value:'NOT ASSERTED BY THIS PUBLIC PROJECTION', note:'Publication does not create authority.' },
    { key:'RETURN', state:'NOT_EXPOSED', value:'NOT ASSERTED BY THIS PUBLIC PROJECTION', note:'Publication/exposure is not RETURN.' },
  ] as const,[node]);

  const machine = useMemo(()=>({
    contract: landing.contract,
    namespace: landing.namespace,
    canonicalNamespace: landing.canonicalNamespace,
    canonicalUrl: landing.canonicalUrl,
    canonicalObjectId: node.canonicalObjectId,
    objectType: node.objectType,
    title: node.title,
    version: node.version,
    language: node.language,
    epistemicState: node.epistemicState,
    publicationState: node.publicationState,
    publicState: node.publicState,
    authors: node.authors,
    methods: node.methods,
    sourceRefs: node.sourceRefs,
    rightsState: node.rightsState,
    license: node.license,
    relatedCanonicalObjectIds: node.relatedCanonicalObjectIds,
    limitations: node.limitations,
    missing: node.missing,
    citation,
    boundary: landing.boundary,
  }),[landing,node,citation]);

  return <section className={styles.shell} aria-labelledby="object-modes-title">
    <header className={styles.header}>
      <div>
        <span>SFI OBJECT MODES · READ-ONLY</span>
        <h2 id="object-modes-title">Same object. Different resolution.</h2>
      </div>
      <div className={styles.tabs} role="tablist" aria-label="Object representation">
        {(['HUMAN','RECONSTRUCT','MACHINE'] as const).map((item)=><button
          key={item}
          type="button"
          role="tab"
          aria-selected={mode===item}
          data-active={mode===item?'true':undefined}
          onClick={()=>setMode(item)}
        >{item}</button>)}
      </div>
    </header>

    {mode==='HUMAN'?<div className={styles.human}>
      <div className={styles.identity}>
        <small>{node.objectType} · {node.epistemicState}</small>
        <strong>{node.title}</strong>
        <p>{node.summary}</p>
      </div>
      <div className={styles.boundary}>
        <b>BOUNDARY</b>
        <p>Human view is presentation. It does not create evidence, authority, Discovery, PULL or RETURN.</p>
      </div>
    </div>:null}

    {mode==='RECONSTRUCT'?<div className={styles.reconstruct}>
      <div className={styles.chain} aria-label="Reconstructible object layers">
        {reconstruct.map((item,index)=><article key={item.key} data-state={item.state}>
          <div className={styles.index}>{String(index+1).padStart(2,'0')}</div>
          <div>
            <small>{item.key}</small>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
          </div>
        </article>)}
      </div>
      {node.missing.length?<div className={styles.missing}>
        <b>EXPLICIT MISSING</b>
        {node.missing.map((item)=><p key={`${item.field}:${item.sourceRef}`}><span>{item.field}</span>{item.reason}</p>)}
      </div>:null}
    </div>:null}

    {mode==='MACHINE'?<div className={styles.machine}>
      <div className={styles.machineLabel}><span>MACHINE-READABLE PROJECTION</span><b>{node.canonicalObjectId}</b></div>
      <pre>{JSON.stringify(machine,null,2)}</pre>
    </div>:null}

    <footer className={styles.footer}>
      <span>{landing.contract}</span>
      <span>RECONSTRUCT ≠ INFER</span>
      <span>PUBLICATION ≠ RETURN</span>
    </footer>
  </section>;
}
