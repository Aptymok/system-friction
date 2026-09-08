type Row = Record<string, any>;

const ROOT_DECISION_CLASSES = new Set(['INSTITUTIONAL_CHANGE', 'CAPABILITY_IMPLEMENTATION', 'LEARNING_PROMOTION']);

function arr(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item && typeof item === 'object')) : [];
}

function sovereignDecision(item: Row) {
  return ROOT_DECISION_CLASSES.has(String(item.decisionClass ?? item.rootDecisionClass ?? '').toUpperCase());
}

function proposalActionability(item: Row): Row {
  const status = String(item.status ?? '').toLowerCase();
  const id = typeof item.id === 'string' ? item.id : null;
  const decisionClass = String(item.decisionClass ?? item.rootDecisionClass ?? '').toUpperCase();
  if (!id || !sovereignDecision(item)) {
    return {
      actionable: false,
      kind: 'OPERATIONAL_WORK',
      href: null,
      allowed: [] as string[],
      question: 'SFI continúa este trabajo dentro de la autoridad existente. Puedes observarlo, pero no requiere tu permiso.',
    };
  }

  const plainQuestion = decisionClass === 'LEARNING_PROMOTION'
    ? '¿Quieres que este aprendizaje demostrado se incorpore al conocimiento institucional de SFI?'
    : decisionClass === 'CAPABILITY_IMPLEMENTATION'
      ? '¿Quieres que SFI incorpore o cambie esta capacidad institucional?'
      : '¿Quieres autorizar este cambio institucional?';

  if (status === 'proposed' || status === 'conflicted') {
    return {
      actionable: true,
      kind: decisionClass,
      href: `/root?decisionKind=proposal&decision=${encodeURIComponent(id)}`,
      allowed: ['accept', 'deny'],
      question: plainQuestion,
      consequences: {
        accept: 'Autoriza únicamente el cambio institucional descrito en el expediente. No convierte inferencias en verdad ni amplía otras autoridades.',
        deny: 'Rechaza el cambio preservando su historia, evidencia y motivo.',
      },
    };
  }

  if (status === 'waiting_evidence') {
    return {
      actionable: false,
      kind: decisionClass,
      href: `/root?decisionKind=proposal&decision=${encodeURIComponent(id)}`,
      allowed: [] as string[],
      question: 'Esta decisión institucional está esperando evidencia. SFI debe conseguirla o declarar que no está disponible; no tienes que aprobar la evidencia para que el trabajo continúe.',
    };
  }

  return {
    actionable: false,
    kind: decisionClass,
    href: `/root?decisionKind=proposal&decision=${encodeURIComponent(id)}`,
    allowed: [] as string[],
    question: 'El expediente sigue siendo visible, pero no existe una decisión soberana pendiente en este estado.',
  };
}

function cycleActionability(item: Row): Row {
  const cycleId = typeof item.cycleId === 'string' ? item.cycleId : null;
  return {
    ...item,
    rootActionRequired: false,
    reviewAvailable: true,
    actionability: {
      actionable: false,
      kind: 'OPERATIONAL_CYCLE',
      href: cycleId ? `/cases?cycle=${encodeURIComponent(cycleId)}` : null,
      allowed: [] as string[],
      question: 'Este ciclo se observa, continúa y cierra operativamente. No requiere una decisión ROOT rutinaria.',
    },
  };
}

export function projectActionableHumanQueue(value: Row) {
  const rawItems = arr(value.items);
  const rawCycles = arr(value.cycles);

  const items: Row[] = rawItems.map((item): Row => {
    const actionability = proposalActionability(item);
    const rootActionRequired = item.rootActionRequired === true && actionability.actionable === true && sovereignDecision(item);
    return {
      ...item,
      rootActionRequired,
      reviewAvailable: !rootActionRequired,
      actionability,
      actionLabel: rootActionRequired
        ? item.actionLabel
        : sovereignDecision(item)
          ? 'Esperando estado/evidencia · no requiere clic ahora'
          : 'SFI continúa · observable, no aprobable',
    };
  });

  const reports: Row[] = [];
  const cycles: Row[] = rawCycles.map((item): Row => cycleActionability(item));
  const rootRequired = items.filter((item) => item.rootActionRequired === true);
  const blocked = items.filter((item) => Boolean(item.blocker));

  return {
    ...value,
    contract: 'SFI-ACTIONABLE-HUMAN-QUEUE-2.1',
    sourceContract: value.contract ?? null,
    items,
    reports,
    cycles,
    summary: {
      ...(value.summary ?? {}),
      rootActionRequired: rootRequired.length,
      actionableProposalDecisions: rootRequired.length,
      actionableReportDecisions: 0,
      actionableCycleDecisions: 0,
      reviewAvailableNotRequired: items.filter((item) => item.reviewAvailable === true).length + cycles.length,
      blocked: blocked.length + cycles.filter((item) => Boolean(item.blocker)).length,
    },
    invariant: 'ROOT only accepts or denies institutional change, material capability implementation/change, or learning promotion. Evidence work is SFI-owned; reports, authorized execution, RETURN and routine closure remain observable operational state, never approval middleware.',
  };
}
