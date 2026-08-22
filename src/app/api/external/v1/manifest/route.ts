import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: 'SFI External Agent Gateway',
    version: '1.2',
    auth: 'Bearer token',
    base: '/api/external/v1',
    discovery: {
      openapi: '/openapi.json',
      llms: '/llms.txt',
      llmsFull: '/llms-full.txt',
      aiIndex: '/ai-index.json',
      fieldSchema: '/field-schema.json',
    },
    operations: [
      { id: 'observe', method: 'POST', path: '/observe', scope: 'observe', description: 'Read governed SFI state through an allowlisted surface.' },
      { id: 'propose', method: 'POST', path: '/propose', scope: 'propose', description: 'Submit a governed action proposal. ROOT approval remains mandatory.' },
      { id: 'execute', method: 'POST', path: '/execute', scope: 'execute', description: 'Realize an already queued proposal inside SFI. It cannot approve its own proposal or perform an ungoverned external action.' },
      { id: 'lab-state', method: 'POST', path: '/lab', scope: 'lab:read', body: { operation: 'state' }, description: 'Read current Method Lab state.' },
      { id: 'lab-report', method: 'POST', path: '/lab', scope: 'lab:read', body: { operation: 'report' }, description: 'Read persisted Method Lab analyses and Cognitive Twin evaluations.' },
      { id: 'lab-persist', method: 'POST', path: '/lab', scope: 'lab:write', body: { operation: 'persist' }, description: 'Persist a laboratory observation into the epistemic event ledger with provenance.' },
      { id: 'lab-run', method: 'POST', path: '/lab', scope: 'lab:run', body: { operation: 'run', confirm: true }, description: 'Execute a supported Method Lab runtime. Requires root_delegate and persisted evidence IDs.' },
    ],
    githubBridge: {
      workflow: '.github/workflows/sfi-github-lab-bridge.yml',
      commandPath: 'lab-bridge/commands/*.json',
      result: 'GitHub Actions artifact containing command, response and provenance',
    },
    governance: 'External agents may observe, propose and realize already-authorized internal actions. Method Lab runtime delegation is explicit and auditable; lab:run requires root_delegate. Approval and canonical promotion remain distinct ROOT decisions.',
  });
}
