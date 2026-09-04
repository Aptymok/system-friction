type Row = Record<string, any>;

function arr(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item && typeof item === 'object')) : [];
}

function proposalActionability(item: Row): Row {
  const status = String(item.status ?? '').toLowerCase();
  const id = typeof item.id === 'string' ? item.id : null;
  if (!id) return { actionable: false, kind: 'UNKNOWN', href: null, allowed: [] as string[] };

  if (status === 'proposed') {
    return {
      actionable: true,
      kind: 'PROPOSAL_DECISION',
      href: `/root?decisionKind=proposal&decision=${encodeURIComponent(id)}`,
      allowed: ['accept', 'request_evidence', 'deny'],
      question: '¿Apruebas el diseño, solicitas más evidencia o rechazas esta propuesta?',
      consequences: {
        accept: 'Aprueba únicamente el diseño y lo mueve a design_approved. No ejecuta, publica ni canoniza.',
        request_evidence: 'Retiene la decisión y mueve/permanece en waiting_evidence. SFI queda como dueño de adquirir o reconciliar evidencia.',
        deny: 'Rechaza la propuesta preservando su historia y lineage.',
      },
    };
  }

  if (status === 'waiting_evidence') {
    return {
      actionable: true,
      kind: 'EVIDENCE_OR_PROPOSAL_REVIEW',
      href: `/root?decisionKind=proposal&decision=${encodeURIComponent(id)}`,
      allowed: ['review_evidence', 'deny'],
      question: 'La propuesta está retenida por evidencia. Revisa candidatos disponibles o rechaza la propuesta.',
      consequences: {
        review_evidence: 'Aceptar una fuente la persiste como evidencia gobernada; no verifica automáticamente todas sus afirmaciones ni aprueba la propuesta.',
        deny: 'Rechaza la propuesta preservando la evidencia y la historia ya registradas.',
      },
    };
  }

  return {
    actionable: false,
    kind: 'REVIEW_AVAILABLE_NOT_HUMAN_OBLIGATION',
    href: `/root?decisionKind=proposal&decision=${encodeURIComponent(id)}`,
    allowed: [] as string[],
    question: 'Existe revisión institucional posible, pero esta superficie no dispone de una transición humana contractual ejecutable para este estado.',
  };
}

function reportActionability(item: Row): Row {
  const id = typeof item.id === 'string' ? item.id : null;
  const approvalStatus = String(item.approvalStatus ?? '').toLowerCase();
  if (!id) return { actionable: false, kind: 'UNKNOWN_REPORT', href: null, allowed: [] as string[] };

  if (approvalStatus === 'queued_for_approval') {
    return {
      actionable: true,
      kind: 'REPORT_HUMAN_USE_DECISION',
      href: `/root?decisionKind=report&decision=${encodeURIComponent(id)}`,
      allowed: ['accept', 'deny'],
      question: '¿Apruebas este reporte para uso humano o lo rechazas?',
      consequences: {
        accept: 'Lo marca approved_for_human_use. No publica, contacta, ejecuta, establece verdad, cierra un ciclo ni promueve canon.',
        deny: 'Lo marca rejected y preserva el reporte, sus limitaciones y el recibo de la decisión.',
      },
    };
  }

  return {
    actionable: false,
    kind: 'REPORT_REVIEW_AVAILABLE_NOT_HUMAN_OBLIGATION',
    href: `/root?decisionKind=report&decision=${encodeURIComponent(id)}`,
    allowed: [] as string[],
    question: approvalStatus === 'waiting_evidence'
      ? 'El reporte está retenido por evidencia. El writer actual no asigna una adquisición verificable, por lo que no se presenta como una obligación ROOT repetible.'
      : 'El reporte puede inspeccionarse, pero no existe una transición humana pendiente.',
  };
}

function cycleActionability(item: Row): Row {
  const cycleId = typeof item.cycleId === 'string' ? item.cycleId : null;
  const state = String(item.state ?? '').toUpperCase();
  const actionable = Boolean(cycleId && item.rootActionRequired === true && ['AWAITING_USER_CLOSE', 'HUMAN_INPUT_REQUIRED'].includes(state));
  return {
    ...item,
    rootActionRequired: actionable,
    actionability: {
      actionable,
      kind: state === 'AWAITING_USER_CLOSE' ? 'CYCLE_CLOSE_DECISION' : state === 'HUMAN_INPUT_REQUIRED' ? 'CYCLE_HUMAN_INPUT' : 'CYCLE_REVIEW',
      href: actionable && cycleId ? `/cases?cycle=${encodeURIComponent(cycleId)}` : null,
      allowed: state === 'AWAITING_USER_CLOSE' ? ['accept_close', 'deny_close'] : state === 'HUMAN_INPUT_REQUIRED' ? ['supply_required_input'] : [],
      question: state === 'AWAITING_USER_CLOSE'
        ? 'Revisa el expediente, RETURN y CONTRAST antes de decidir el cierre.'
        : state === 'HUMAN_INPUT_REQUIRED'
          ? 'El expediente indica exactamente qué fuente o autorización requiere SFI.'
          : null,
    },
  };
}

export function projectActionableHumanQueue(value: Row) {
  const rawItems = arr(value.items);
  const rawReports = arr(value.reports);
  const rawCycles = arr(value.cycles);

  const items: Row[] = rawItems.map((item): Row => {
    const actionability = proposalActionability(item);
    const wasRequired = item.rootActionRequired === true;
    const rootActionRequired = wasRequired && actionability.actionable === true;
    return {
      ...item,
      rootActionRequired,
      reviewAvailable: wasRequired && !rootActionRequired,
      actionability,
      actionLabel: rootActionRequired
        ? item.actionLabel
        : wasRequired
          ? 'Revisión disponible · no cuenta como obligación hasta existir una acción contractual ejecutable'
          : item.actionLabel,
    };
  });

  const reports: Row[] = rawReports.map((item): Row => {
    const actionability = reportActionability(item);
    const wasRequired = item.rootActionRequired === true;
    const rootActionRequired = wasRequired && actionability.actionable === true;
    return {
      ...item,
      rootActionRequired,
      reviewAvailable: item.reviewAvailable === true || (wasRequired && !rootActionRequired),
      actionability,
    };
  });

  const cycles: Row[] = rawCycles.map((item): Row => cycleActionability(item));

  const rootRequired = items.filter((item) => item.rootActionRequired === true);
  const rootRequiredReports = reports.filter((item) => item.rootActionRequired === true);
  const rootRequiredCycles = cycles.filter((item) => item.rootActionRequired === true);
  const blocked = items.filter((item) => Boolean(item.blocker));

  return {
    ...value,
    contract: 'SFI-ACTIONABLE-HUMAN-QUEUE-1.1',
    sourceContract: value.contract ?? null,
    items,
    reports,
    cycles,
    summary: {
      ...(value.summary ?? {}),
      rootActionRequired: rootRequired.length + rootRequiredReports.length + rootRequiredCycles.length,
      actionableProposalDecisions: rootRequired.length,
      actionableReportDecisions: rootRequiredReports.length,
      actionableCycleDecisions: rootRequiredCycles.length,
      reviewAvailableNotRequired: items.filter((item) => item.reviewAvailable === true).length + reports.filter((item) => item.reviewAvailable === true).length,
      blocked: blocked.length + reports.filter((item) => Boolean(item.blocker)).length + cycles.filter((item) => Boolean(item.blocker)).length,
    },
    invariant: 'HUMAN_ACTION_REQUIRED implies ACTIONABLE_DOSSIER_REQUIRED. Objects without a currently executable human transition are reviewable but are not counted as human obligations.',
  };
}
