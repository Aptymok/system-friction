import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: 'SFI External Agent Gateway',
    version: '1.5.0',
    auth: 'OAuth 2.0 authorization_code (user-bound) or X-SFI-Token/Bearer static token',
    base: '/api/external/v1',
    discovery: {
      openapi: '/openapi.json',
      llms: '/llms.txt',
      llmsFull: '/llms-full.txt',
      aiIndex: '/ai-index.json',
      fieldSchema: '/field-schema.json',
      publicInstitution: '/api/public/institution',
      institutionSurface: '/institution',
      publicHistory: '/api/public/history',
      historySurface: '/history',
      privacy: '/privacy',
      oauthAuthorize: '/api/oauth/authorize',
      oauthToken: '/api/oauth/token',
    },
    oauth: {
      flow: 'authorization_code',
      authorizationUrl: '/api/oauth/authorize',
      tokenUrl: '/api/oauth/token',
      tokenType: 'Bearer',
      accessTokenTtlSeconds: 3600,
      authorizationCodeTtlSeconds: 120,
      pkce: 'S256 supported',
      identity: 'Authenticated SFI institutional member session; client credentials identify the application, not the human principal.',
      recommendedScopes: ['observe', 'propose', 'lab:read'],
    },
    operations: [
      { id: 'console', method: 'GET', path: '/console', scope: 'observe', description: 'Read a consolidated governed machine console: Method Lab, reports, Cognitive Twin runs/evaluations, proposals, evidence and agentic capabilities.' },
      { id: 'signal-status', method: 'GET', path: '/signal', scope: 'observe', description: 'Read universal signal/open-cycle status before opening another analysis cycle.' },
      { id: 'signal-intake', method: 'POST', path: '/signal', scope: 'lab:write', body: { operation: 'intake' }, description: 'Persist any declared signal representation with provenance, individuate the object, expose missing context, method routing, 21-role cognitive plan and open-cycle gate.' },
      { id: 'signal-run', method: 'POST', path: '/signal', scope: 'lab:write', body: { operation: 'run' }, description: 'Execute the existing governed cognitive runtime against an individuated signal. Internal analysis only; no approval, external action or canonization.' },
      { id: 'signal-return', method: 'POST', path: '/signal', scope: 'lab:write', body: { operation: 'return' }, description: 'Persist observed return/outcome evidence for an open universal cycle.' },
      { id: 'signal-close', method: 'POST', path: '/signal', scope: 'lab:write', body: { operation: 'close' }, description: 'Close a methodological cycle after sufficient contrast; closure does not claim the observed system is permanently resolved.' },
      { id: 'observe', method: 'POST', path: '/observe', scope: 'observe', description: 'Read governed SFI state through an allowlisted surface.' },
      { id: 'propose', method: 'POST', path: '/propose', scope: 'propose', description: 'Submit a governed action proposal. ROOT approval remains mandatory.' },
      { id: 'execute', method: 'POST', path: '/execute', scope: 'execute', description: 'Realize an already queued proposal inside SFI. It cannot approve its own proposal or perform an ungoverned external action.' },
      { id: 'lab-state', method: 'POST', path: '/lab', scope: 'lab:read', body: { operation: 'state' }, description: 'Read current Method Lab state.' },
      { id: 'lab-report', method: 'POST', path: '/lab', scope: 'lab:read', body: { operation: 'report' }, description: 'Read persisted Method Lab analyses and Cognitive Twin evaluations.' },
      { id: 'lab-persist', method: 'POST', path: '/lab', scope: 'lab:write', body: { operation: 'persist' }, description: 'Persist a laboratory observation into the epistemic event ledger with provenance.' },
      { id: 'lab-run', method: 'POST', path: '/lab', scope: 'lab:run', body: { operation: 'run', confirm: true }, description: 'Execute a supported Method Lab runtime. Requires root_delegate and persisted evidence IDs.' },
    ],
    universalSignal: {
      contract: 'SFI-UNIVERSAL-SIGNAL-1.0',
      cycleContract: 'SFI-UNIVERSAL-REASONING-CYCLE-1.0',
      acceptedRepresentations: ['url', 'web_page', 'text', 'audio', 'video', 'image', 'document', 'dataset', 'json', 'csv', 'conversation', 'email', 'code', 'api_response', 'sensor', 'event', 'organization', 'person', 'place', 'composite', 'unknown'],
      epistemicOrder: ['individuation', 'question/objective', 'open-cycle gate', 'history/context', 'hypotheses+rivals', 'cross-impact/risk', 'attractor/ejector vs declared target/exclusion', 'invariants', 'minimal perturbation', 'return', 'contrast', 'calibration', 'memory'],
      agentTopology: 'meta_orchestrator + 20 governed cognitive roles already present in SFI runtime',
      externalActionAllowed: false,
    },
    publicData: [
      { id: 'institution-profile', method: 'GET', path: '/api/public/institution', auth: 'none', description: 'Canonical public profile of SFI: definitions, instruments, lifecycle, epistemic invariants, public surfaces and AI-native access.' },
      { id: 'institution-history', method: 'GET', path: '/api/public/history', auth: 'none', epistemicClass: 'OBSERVED', description: 'Verified public SFI milestones from repository and first-party public sources. Undocumented periods remain unasserted.' },
    ],
    githubBridge: {
      workflow: '.github/workflows/sfi-github-lab-bridge.yml',
      commandPath: 'lab-bridge/commands/*.json',
      result: 'GitHub Actions artifact containing command, response and provenance',
    },
    governance: 'External agents may observe, ingest declared signals, run internal cognitive analysis, inspect the consolidated console, propose and realize already-authorized internal actions. OAuth user sessions preserve the authenticated SFI principal. Method Lab runtime delegation is explicit and auditable; lab:run requires root_delegate. Approval and canonical promotion remain distinct ROOT decisions.',
  });
}
