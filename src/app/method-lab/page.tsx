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
    <>
      <MethodLabConsole state={state} />
      <DecisionTransferObservatory initial={state.decisionTransfer} />
      <BlindDecisionExperiment />
      <CognitiveLabConsole />
      <style>{`
        .crl-launch{border-color:#425a6d!important;background:#0d1923!important;color:#ddc58d!important;box-shadow:0 12px 35px rgba(0,0,0,.38)!important}
        .crl-launch span{border-color:#425a6d!important}
        .crl-backdrop{background:rgba(4,9,13,.88)!important}
        .crl-panel{background:#09121a!important;border-color:#33495c!important;color:#d7e0e5!important;box-shadow:0 35px 120px rgba(0,0,0,.72)!important}
        .crl-panel>header{background:#0c1822!important;border-bottom-color:#33495c!important}
        .crl-panel>header span,.crl-activate label,.crl-log article span,.crl-contrast h3{color:#c8aa6d!important}
        .crl-panel h2{color:#f2f4f5!important;font-family:Georgia,serif!important}
        .crl-panel header p,.crl-log>p,.crl-manual p,.crl-gate small{color:#91a0ac!important}
        .crl-panel header button{color:#9fb0bc!important}
        .crl-activate input,.crl-activate select,.crl-activate textarea,.crl-chat textarea,.crl-contrast textarea{border-color:#3a5265!important;background:#081119!important;color:#e7ecef!important}
        .crl-activate button,.crl-actions button,.crl-gate button,.crl-contrast button{border-color:#b69759!important;background:#c2a464!important;color:#081119!important}
        .crl-status{border-bottom-color:#2d4354!important}
        .crl-status span{color:#8195a3!important}.crl-status b{color:#a9c5b3!important}.crl-status em{color:#91a0ac!important}
        .crl-log{border-color:#2d4354!important;background:#081119!important}
        .crl-log article{background:#0c1720!important;border-left-color:#c8aa6d!important}.crl-log article[data-role=assistant]{border-left-color:#7d9c87!important}.crl-log article p{color:#cbd5da!important}
        .crl-gate{border-top-color:#2d4354!important;border-bottom-color:#2d4354!important}
        .crl-contrast details,.crl-result{border-color:#2d4354!important;background:#081119!important}.crl-contrast summary,.crl-result summary{color:#c8aa6d!important}.crl-contrast pre,.crl-result pre{color:#c5d0d6!important}
        .crl-error{border-color:rgba(196,111,91,.38)!important;background:#1a1010!important;color:#d7a08f!important}
      `}</style>
    </>
  );
}