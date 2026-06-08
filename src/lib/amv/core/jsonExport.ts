export type AmvJsonExport = {
  ok: true
  exportedAt: string
  writesDatabase: false
  visibleState: Record<string, unknown>
  permittedEvidence: unknown[]
}

export function exportVisibleAmvJson(visibleState: Record<string, unknown>, permittedEvidence: unknown[] = []): AmvJsonExport {
  return {
    ok: true,
    exportedAt: new Date().toISOString(),
    writesDatabase: false,
    visibleState,
    permittedEvidence,
  }
}
