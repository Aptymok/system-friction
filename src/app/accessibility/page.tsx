import type { Metadata } from 'next';

export const metadata:Metadata={
  title:'Accessibility',
  description:'Accessibility statement for System Friction Institute public digital surfaces.',
  alternates:{canonical:'/accessibility'},
};

export default function AccessibilityPage(){
 return <main className="sfiPolicyPage"><article><span>SYSTEM FRICTION INSTITUTE · ACCESSIBILITY</span><h1>Accessibility</h1><p className="sfiPolicyLead">SFI aims to keep its public institutional information perceivable, navigable and understandable across common devices and assistive technologies.</p>
 <section><h2>01 · Interface</h2><p>Public navigation uses semantic links and headings, keyboard-accessible controls and responsive layouts. Motion-sensitive experiences should respect reduced-motion preferences where implemented.</p></section>
 <section><h2>02 · Meaning</h2><p>Visual structure does not replace textual meaning. Epistemic state, authority and evidence boundaries should remain available as text rather than being encoded only through color, position or animation.</p></section>
 <section><h2>03 · Alternative access</h2><p>Machine-readable resources such as llms.txt, ai-index.json and structured public records provide additional non-visual paths to public institutional information.</p></section>
 <section><h2>04 · Reporting a barrier</h2><p>Accessibility barriers may be reported through the SFI public Contact surface. The report should identify the affected page, device or assistive technology and the blocked task where possible.</p></section>
 <footer>Last updated: September 29, 2026 · Canonical: https://systemfriction.org/accessibility</footer></article></main>;
}
