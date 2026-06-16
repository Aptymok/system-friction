import type { SfiLabAnalysis, SfiReport } from './types';

function section(title: string, lines: string[]) {
  return [`## ${title}`, '', ...(lines.length ? lines : ['Sin evidencia suficiente en esta ventana.']), ''].join('\n');
}

export function buildSfiLabReport(analysis: SfiLabAnalysis): SfiReport {
  const executiveSummary = analysis.nodes.length
    ? `Se detectaron ${analysis.nodes.length} nodo(s) SFI con identidad suficiente para seguimiento operativo.`
    : `Se detectaron ${analysis.signals.length} señal(es) y ${analysis.reappearances.length} reaparición(es); la lectura permanece limitada por datos longitudinales.`;

  const weakSignals = analysis.signals.filter((signal) => signal.status === 'weak_signal' || signal.status === 'insufficient_longitudinal_data');
  const persistentSignals = analysis.signals.filter((signal) => signal.status === 'persistent_signal' || signal.status === 'emergent_node');

  const markdown = [
    `# SFI-PSI Operational Report`,
    '',
    `analysis_id: ${analysis.analysisId}`,
    `data_mode: ${analysis.dataMode}`,
    `source: ${analysis.source}`,
    '',
    section('Executive Summary', [executiveSummary]),
    section('Detected Reappearances', analysis.reappearances.map((item) => `- ${item.pattern}: recurrencia ${item.recurrence}, similitud ${item.similarity.toFixed(2)}`)),
    section('Weak Signals', weakSignals.map((item) => `- ${item.name}: ${item.summary}`)),
    section('Persistent Signals', persistentSignals.map((item) => `- ${item.name}: recurrencia ${item.recurrence}, coherencia ${item.coherence.toFixed(2)}`)),
    section('SFI Nodes', analysis.nodes.map((item) => `- ${item.name}: estado ${item.status}, identidad ${item.identityScore.toFixed(2)}, persistencia ${item.persistence.toFixed(2)}`)),
    section('Hypotheses', analysis.hypotheses.map((item) => `- ${item.title}: ${item.statement}`)),
    section('Recommendations', analysis.recommendations.map((item) => `- ${item}`)),
    section('Campaign Proposal', [
      `- ${analysis.campaign.title}`,
      `- Público probable: ${analysis.campaign.audience}`,
      `- Formato recomendado: ${analysis.campaign.recommendedFormat}`,
    ]),
    section('Media Plan', [
      ...analysis.mediaPlan.imagePrompts.map((prompt) => `- image: ${prompt}`),
      ...analysis.mediaPlan.videoPrompts.map((prompt) => `- video: ${prompt}`),
    ]),
    section('Limitations', analysis.limitations.map((item) => `- ${item}`)),
    section('Next Observation Window', [analysis.nextObservationWindow]),
  ].join('\n');

  return {
    analysisId: analysis.analysisId,
    markdown,
    json: {
      executiveSummary,
      detectedReappearances: analysis.reappearances,
      weakSignals,
      persistentSignals,
      nodes: analysis.nodes,
      hypotheses: analysis.hypotheses,
      recommendations: analysis.recommendations,
      campaign: analysis.campaign,
      mediaPlan: analysis.mediaPlan,
      limitations: analysis.limitations,
      nextObservationWindow: analysis.nextObservationWindow,
    },
  };
}
