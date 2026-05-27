import { appendOperationalEvent, createActionProposal, requireGovernedActor, sha256, stringValue } from './common';

const allowedTypes = new Set(['image', 'audio', 'video', 'html', 'text', 'json', 'calendar_payload']);

export function normalizeMultimediaInput(body: Record<string, unknown>, fallbackType = 'text') {
  const mediaType = stringValue(body.type) ?? fallbackType;
  if (!allowedTypes.has(mediaType)) {
    return { ok: false as const, error: 'unsupported_multimedia_type' };
  }

  const spec = body.spec ?? body.parameters ?? {};
  const content = body.content ?? null;
  const prompt = stringValue(body.prompt);
  const calendarPayload = body.calendar_payload ?? body.calendarPayload ?? null;
  const payload = {
    type: mediaType,
    spec,
    prompt,
    parameters: body.parameters ?? {},
    provenance: body.provenance ?? { owner: 'System Friction Institute' },
    content,
    calendar_payload: calendarPayload,
    requires_approval: true,
  };

  return {
    ok: true as const,
    type: mediaType,
    payload,
    specHash: sha256(spec),
    contentHash: content === null || typeof content === 'undefined' ? null : sha256(content),
    promptHash: prompt ? sha256(prompt) : null,
  };
}

export async function createMultimediaProposal(input: {
  actorId: string;
  body: Record<string, unknown>;
  eventName: 'multimedia.proposed' | 'calendar.payload.proposed';
  fallbackType?: string;
}) {
  const normalized = normalizeMultimediaInput(input.body, input.fallbackType);
  if (!normalized.ok) return normalized;

  const event = await appendOperationalEvent({
    eventName: input.eventName,
    actorId: input.actorId,
    payload: {
      ...normalized.payload,
      spec_hash: normalized.specHash,
      content_hash: normalized.contentHash,
      prompt_hash: normalized.promptHash,
    },
    lineage: [normalized.specHash],
  });
  if (!event.ok) return event;

  return createActionProposal({
    proposalType: normalized.type === 'calendar_payload' ? 'calendar_payload' : 'multimedia',
    actorId: input.actorId,
    title: input.eventName,
    specHash: normalized.specHash,
    contentHash: normalized.contentHash,
    promptHash: normalized.promptHash,
    status: 'proposed',
    eventId: event.data.id,
    payload: event.data.payload as Record<string, unknown>,
  });
}

export async function guardedMultimediaProposal(action: string, body: Record<string, unknown>, eventName: 'multimedia.proposed' | 'calendar.payload.proposed', fallbackType?: string) {
  const gate = await requireGovernedActor(action);
  if (!gate.ok) return { gate };
  const proposal = await createMultimediaProposal({ actorId: gate.ctx.user.id, body, eventName, fallbackType });
  return { gate, proposal };
}
