import type { Metadata } from 'next';
import { requireRootObserverPage } from '@/lib/root/server';
import { readRootSovereignState } from '@/lib/root/sovereign/rootSovereignAdapter';
import { reconcilePredictionAttractors } from '@/lib/prediction/reconcilePredictionAttractors';
import { PredictionCasesConsole } from '@/components/root/predictions/PredictionCasesConsole';
import NewPredictionForm from '@/components/root/predictions/NewPredictionForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Prediction Cases · SFI ROOT', robots: { index: false, follow: false, nocache: true } };

export default async function RootPredictionsPage() {
  await requireRootObserverPage('/root/predictions');
  await reconcilePredictionAttractors();
  const state = await readRootSovereignState();
  return <>
    <section id="new-prediction" style={{background:'#050504',color:'#c8c0ad',padding:'26px 26px 0',fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace'}}>
      <details style={{border:'1px solid rgba(200,169,81,.15)',background:'#080807'}}>
        <summary style={{cursor:'pointer',padding:'13px 15px',fontSize:9,letterSpacing:'.12em',color:'#bba462'}}>REGISTER PREDICTION · BEFORE PERTURBATION</summary>
        <div style={{padding:16,borderTop:'1px solid rgba(200,169,81,.1)'}}><NewPredictionForm /></div>
      </details>
    </section>
    <PredictionCasesConsole
      runs={state.predictions.data.runs}
      legacy={state.predictions.data.legacyEntries}
      outcomes={state.predictions.data.outcomes}
      attractors={state.amv.data.attractors}
    />
  </>;
}
