import 'server-only';

import { runLlmTask, type LlmProviderId } from '@/lib/ai/providerRouter';
import type { SfiWorldInterfaceState } from '../worldInterfaceState';

export type SfiWorldInterpretation = {
  text: string;
  provider: LlmProviderId;
  model: string;
  generatedAt: string;
  degraded: boolean;
};

export async function buildWorldInterpretation(
  state: Pick<SfiWorldInterfaceState, 'coreIndicators' | 'domainBreakdown' | 'nodes' | 'generatedAt'>,
): Promise<SfiWorldInterpretation> {
  const { ihg, nti, ldi, wsv } = state.coreIndicators;
  const topNodes = [...state.nodes]
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 5)
    .map((n) => `${n.label}: ${n.state}, ${n.intensity.toFixed(2)}`)
    .join('; ');
  const domains = state.domainBreakdown
    .filter((d) => d.value !== null)
    .map((d) => `${d.domain}=${(d.value as number).toFixed(2)}`)
    .join(', ');

  const prompt = `SFI field data generated_at=${state.generatedAt}\nIHG=${(ihg.value * 100).toFixed(1)}/100\nNTI=${(nti.value * 100).toFixed(1)}/100\nLDI=${(ldi.value * 100).toFixed(1)}/100\nWSV=${wsv.value.toFixed(2)}\nDomains=${domains || 'none'}\nTop nodes=${topNodes || 'none'}\nWrite one short Spanish clinical paragraph interpreting only these model values.`;
  const fallbackResult = 'Lectura no disponible: no hay proveedor de interpretación configurado. Los indicadores del panel siguen siendo datos reales del campo.';
  const result = await runLlmTask({
    task: 'graph_interpretation',
    system: 'Return concise evidence-bound SFI operational analysis using only the provided data.',
    prompt,
    fallbackResult,
    maxTokens: 260,
  });

  return {
    text: result.result,
    provider: result.provider,
    model: result.model,
    generatedAt: new Date().toISOString(),
    degraded: !result.ok,
  };
}
