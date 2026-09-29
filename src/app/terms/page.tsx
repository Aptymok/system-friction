import type { Metadata } from 'next';

export const metadata:Metadata={
  title:'Terms of Use',
  description:'Terms governing use of public System Friction Institute surfaces, publications and machine-readable interfaces.',
  alternates:{canonical:'/terms'},
};

const sections=[
 ['Public information','SFI public surfaces provide institutional, research and documentary information. Public availability does not create a client relationship, contract, endorsement, authorization or guarantee of a particular outcome.'],
 ['Epistemic boundaries','Observations, evidence, inference, simulation, publication, execution and RETURN remain distinct states. A public representation must not be treated as stronger evidence than its stated epistemic class supports.'],
 ['Publications and attribution','Each publication or public object remains subject to its stated authorship, version, license, citation and evidence conditions. Stable references should use the canonical URL or object identifier where available.'],
 ['Machine-readable interfaces','llms.txt, ai-index.json, public APIs and public MCP resources improve reconstruction and retrieval. Reachability does not grant mutation, governance, execution or access to private state.'],
 ['Acceptable use','Public interfaces may be read and cited in a manner consistent with applicable law, technical limits and published policy. Attempts to bypass authentication, extract protected information, interfere with service operation or misrepresent SFI authority are not authorized.'],
 ['No implied validation','Publication, indexing, model retrieval, citation or interaction does not by itself constitute external validation, recognition, partnership, institutional adoption, PULL or RETURN.'],
 ['Changes','SFI may revise these terms when public capabilities or institutional boundaries change. The current canonical version is the version published on this page.'],
] as const;

export default function TermsPage(){
 return <main className="sfiPolicyPage"><article><span>SYSTEM FRICTION INSTITUTE · PUBLIC POLICY</span><h1>Terms of Use</h1><p className="sfiPolicyLead">Terms for public human and machine-readable SFI surfaces.</p>{sections.map(([title,body],i)=><section key={title}><h2>{String(i+1).padStart(2,'0')} · {title}</h2><p>{body}</p></section>)}<footer>Last updated: September 29, 2026 · Canonical: https://systemfriction.org/terms</footer></article></main>;
}
