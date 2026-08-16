import { requireRootObserverPage } from '@/lib/root/server';
import { readMethodLabState } from '@/lib/method-lab/readModel';
import { MethodLabConsole } from '@/components/root/method-lab/MethodLabConsole';
import { DecisionTransferObservatory } from '@/components/root/method-lab/DecisionTransferObservatory';
import { BlindDecisionExperiment } from '@/components/root/method-lab/BlindDecisionExperiment';
import { CognitiveLabConsole } from '@/components/root/cognitive-lab/CognitiveLabConsole';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function MethodLabPage() {
  await requireRootObserverPage('/method-lab');
  const state = await readMethodLabState();
  return (
    <main className="min-h-screen bg-transparent">
      <div data-sfi-field-anchor="method-protocols"><MethodLabConsole state={state} /></div>
      <div data-sfi-field-anchor="decision-transfer"><DecisionTransferObservatory initial={state.decisionTransfer} /></div>
      <div data-sfi-field-anchor="blind-decision"><BlindDecisionExperiment /></div>
      <div data-sfi-field-anchor="cognitive-lab"><CognitiveLabConsole /></div>
      <style>{`
        .crl-launch{border-color:rgba(200,167,100,.34)!important;background:#090a08e8!important;color:#f0d397!important;box-shadow:0 12px 35px rgba(0,0,0,.38)!important}
        .crl-launch span{border-color:rgba(200,167,100,.28)!important}
        .crl-backdrop{background:rgba(4,5,4,.90)!important}
        .crl-panel{background:#080907!important;border-color:rgba(232,226,213,.16)!important;color:#e8e2d5!important;box-shadow:0 35px 120px rgba(0,0,0,.72)!important}
        .crl-panel>header{background:#0b0d0a!important;border-bottom-color:rgba(232,226,213,.14)!important}
        .crl-panel>header span,.crl-activate label,.crl-log article span,.crl-contrast h3{color:#c8a764!important}
        .crl-panel h2{color:#f5f0e6!important;font-family:Georgia,serif!important}
        .crl-panel header p,.crl-log>p,.crl-manual p,.crl-gate small{color:#aaa69c!important}
        .crl-panel header button{color:#aaa69c!important}
        .crl-activate input,.crl-activate select,.crl-activate textarea,.crl-chat textarea,.crl-contrast textarea{border-color:rgba(200,167,100,.22)!important;background:#070806!important;color:#e8e2d5!important}
        .crl-activate button,.crl-actions button,.crl-gate button,.crl-contrast button{border-color:#c8a764!important;background:#c8a764!important;color:#070806!important}
        .crl-status{border-bottom-color:rgba(232,226,213,.12)!important}
        .crl-status span{color:#8f897e!important}.crl-status b{color:#a9c5b3!important}.crl-status em{color:#aaa69c!important}
        .crl-log{border-color:rgba(232,226,213,.12)!important;background:#070806!important}
        .crl-log article{background:#0b0d0a!important;border-left-color:#c8a764!important}.crl-log article[data-role=assistant]{border-left-color:#69a5a4!important}.crl-log article p{color:#d8d2c5!important}
        .crl-gate{border-top-color:rgba(232,226,213,.12)!important;border-bottom-color:rgba(232,226,213,.12)!important}
        .crl-contrast details,.crl-result{border-color:rgba(232,226,213,.12)!important;background:#070806!important}.crl-contrast summary,.crl-result summary{color:#c8a764!important}.crl-contrast pre,.crl-result pre{color:#d8d2c5!important}
        .crl-error{border-color:rgba(169,76,59,.38)!important;background:#1a1010!important;color:#d7a08f!important}
      `}</style>
    </main>
  );
}
