import { useCallback, useEffect, useMemo, useState } from 'react';
import { EidolonMIHMReal, EidolonPatternsFull, EidolonPersonaFull, EidolonRetroFull, EidolonSemanticFull } from '@/lib/eidolon';
import patternsCatalog from '@/data/patterns_v3.json';
import profiles from '@/data/aptymok_profiles.json';
import cognitiveProcess from '@/data/cognitiveProcess.json';
import sfNodes from '@/data/SF_nodes.json';
import stateData from '@/data/state.json';
import { calculateIHG, calculateNTI, updatePhi } from '@/lib/mihmEngine';

const sharedState = {
  S: { phi: {} },
  N: { mihm_v3_engine: { variables: sfNodes } },
};

export function useEidolon() {
  const [mihmState, setMihmState] = useState({ ihg: 0, nti: 0, ihg30: 0, nti30: 0, deltaIHG: 0, deltaNTI: 0, severity: 'Operativo' });
  const [activePatterns, setActivePatterns] = useState([]);
  const [personaOutput, setPersonaOutput] = useState('');
  const [retroState, setRetroState] = useState(null);
  const [semanticFingerprint, setSemanticFingerprint] = useState(null);

  const modules = useMemo(() => {
    const mihm = new EidolonMIHMReal(sharedState);
    const patterns = new EidolonPatternsFull(sharedState);
    patterns.loadPatterns(patternsCatalog);

    const semantic = new EidolonSemanticFull(sharedState);
    semantic.loadCognitiveProcess(cognitiveProcess);

    const persona = new EidolonPersonaFull(sharedState);
    persona.loadProfiles(profiles, cognitiveProcess);

    const retro = new EidolonRetroFull(sharedState);
    return { mihm, patterns, semantic, persona, retro };
  }, []);

  const refreshMIHM = useCallback(async () => {
    let next;
    try {
      next = await modules.mihm.pipelineGetState();
    } catch {
      const vectors = Object.fromEntries((stateData.nodes || []).map((n, idx) => [
        `N${idx + 1}`,
        { C: n.C, E: n.E, L: n.L, M: n.M },
      ]));
      const ihg = calculateIHG({ vectors });
      const nti = calculateNTI({ LDI_n: 1, ICC_n: 0.32, CSR: 0, IRCI_n: 0.935, IIM: 0.5 });
      next = { ihg: Number(ihg.toFixed(3)), nti: Number(nti.toFixed(3)), ihg30: Number((ihg + 0.1).toFixed(3)), nti30: Number((nti + 0.1).toFixed(3)), deltaIHG: 0.1, deltaNTI: 0.1, severity: 'Inestable' };
      sharedState.S.phi = updatePhi({ mihm: next, phi: sharedState.S.phi });
    }

    setMihmState(next);
    return next;
  }, [modules]);

  const updateWithText = useCallback(async (inputText) => {
    const currentMihm = await refreshMIHM();
    const semanticOut = modules.semantic.process(inputText);
    setSemanticFingerprint(semanticOut);

    const patterns = modules.patterns.detectPatterns({
      text: inputText,
      embeddings: semanticOut.embedding,
      tokens: semanticOut.tokens,
      mihm: { ...modules.mihm.projectToMIHMVariables(), ihg: currentMihm.ihg, nti: currentMihm.nti },
    });

    setActivePatterns(patterns.slice(0, 8));

    const agentOutputs = [
      { agent: 'REI', text: 'estructura técnica con foco en umbrales operativos' },
      { agent: 'SHINJI', text: 'impacto humano con degradación de coordinación percibida' },
      { agent: 'KAWORU', text: 'trayectoria de riesgo en aumento por fricción acumulada' },
      { agent: 'SHADOW', text: 'auditoría detecta desalineación entre señal y métrica' },
    ];

    const synthesis = modules.persona.synthesize({
      text: inputText,
      embeddings: semanticOut.embedding,
      agentOutputs,
      patternsDetected: patterns.map((p) => p.id),
      mihm: currentMihm,
    });

    setPersonaOutput(synthesis);
  }, [modules, refreshMIHM]);

  const runRetroSimulation = useCallback(async () => {
    const currentMihm = await refreshMIHM();
    const retro = modules.retro.runRetroSimulation({
      text: personaOutput || 'estado sistémico sin input explícito',
      embeddings: semanticFingerprint?.embedding || [],
      patternsDetected: activePatterns.map((p) => p.id),
      cognitiveProcess,
      mihm: currentMihm,
    });

    modules.retro.retroVisualSwitch();
    setRetroState(retro);
    return retro;
  }, [modules, refreshMIHM, personaOutput, semanticFingerprint, activePatterns]);

  useEffect(() => {
    refreshMIHM();
  }, [refreshMIHM]);

  return {
    mihmState,
    activePatterns,
    personaOutput,
    retroState,
    semanticFingerprint,
    updateWithText,
    runRetroSimulation,
    refreshMIHM,
  };
}
