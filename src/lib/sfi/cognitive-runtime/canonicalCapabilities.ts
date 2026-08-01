export const SFI_CANONICAL_CAPABILITIES = [
  {
    id: "meta_orchestrator",
    name: "MetaOrchestratorAgent",
    question: "¿Qué pregunta debe resolver el sistema?",
    status: "partial"
  },

  {
    id: "field_observer",
    name: "FieldObserverAgent",
    question: "¿Qué está ocurriendo realmente?",
    status: "missing"
  },

  {
    id: "evidence_hunter",
    name: "EvidenceHunterAgent",
    question: "¿Qué evidencia sostiene la afirmación?",
    status: "partial"
  },

  {
    id: "contradiction_agent",
    name: "ContradictionAgent",
    question: "¿Qué evidencia destruye esta hipótesis?",
    status: "partial"
  },

  {
    id: "missing_evidence",
    name: "MissingEvidenceAgent",
    question: "¿Qué falta conocer?",
    status: "partial"
  },

  {
    id: "phenotype_resolver",
    name: "PhenotypeResolverAgent",
    question: "¿Qué estructura equivalente existe?",
    status: "partial"
  },

  {
    id: "historical_context_scout",
    name: "HistoricalContextScoutAgent",
    question: "¿Qué condiciones permitieron esto?",
    status: "missing"
  },

  {
    id: "archaeologist",
    name: "ArchaeologistAgent",
    question: "¿Dónde apareció antes?",
    status: "missing"
  },

  {
    id: "cognitive_twin",
    name: "CognitiveTwinAgent",
    question: "¿Cómo evoluciona el modelo interno?",
    status: "implemented"
  },

  {
    id: "risk",
    name: "RiskAgent",
    question: "¿Qué puede fallar?",
    status: "partial"
  },

  {
    id: "opportunity",
    name: "OpportunityDiscoveryAgent",
    question: "¿Qué ventana emerge?",
    status: "missing"
  },

  {
    id: "entropy",
    name: "EntropyRedistributionAgent",
    question: "¿Dónde se acumula fricción?",
    status: "missing"
  },

  {
    id: "governance",
    name: "MultiStakeholderBootstrapAgent",
    question: "¿Debe ejecutarse?",
    status: "partial"
  },

  {
    id: "reality_calibration",
    name: "RealityCalibrationAgent",
    question: "¿Aprendimos?",
    status: "partial"
  }
];