import type { Metadata } from 'next';
import Link from 'next/link';
import { CanonicalCognitiveFieldPublic } from '@/components/sfi/CanonicalCognitiveFieldPublic';

export const metadata:Metadata={
  title:'Laboratory',
  description:'Public explanation of the System Friction Institute laboratory boundary, methods and experimental apparatus.',
};

export default function LaboratoryPage(){
  return <main className="sfiLaboratoryPage">
    <section className="sfiLaboratoryHero">
      <span>PUBLIC LABORATORY / METHOD BOUNDARY</span>
      <h1>Experiments remain experiments until reality answers.</h1>
      <p>System Friction Institute uses the Laboratory to test methods, models and bounded hypotheses without converting simulation, replay or model output into observed reality. Public material explains the apparatus and its epistemic limits; governed execution remains inside the authenticated Method Lab.</p>
      <div className="sfiLaboratoryActions"><Link href="/publications">READ THE REGISTRY</Link><Link href="/login?next=%2Fmethod-lab">SIGN IN TO METHOD LAB</Link></div>
    </section>
    <CanonicalCognitiveFieldPublic/>
  </main>;
}
