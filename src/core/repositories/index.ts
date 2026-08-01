import type { Observation, Evidence, InstitutionalMemory, SfiEvent, SfiEntityId } from '@/core/contracts';

export class InMemoryObservationRepository {
  private observations: Observation[] = [];

  async save(entity: Observation): Promise<void> {
    this.observations = this.observations.filter((item) => item.id !== entity.id);
    this.observations.push(entity);
  }

  async findById(id: SfiEntityId): Promise<Observation | null> {
    return this.observations.find((item) => item.id === id) ?? null;
  }

  async findByPhenomenon(phenomenonId: SfiEntityId): Promise<Observation[]> {
    return this.observations.filter((item) => item.phenomenonId === phenomenonId);
  }
}

export class InMemoryEvidenceRepository {
  private evidence: Evidence[] = [];

  async save(entity: Evidence): Promise<void> {
    this.evidence = this.evidence.filter((item) => item.id !== entity.id);
    this.evidence.push(entity);
  }

  async findById(id: SfiEntityId): Promise<Evidence | null> {
    return this.evidence.find((item) => item.id === id) ?? null;
  }

  async findByObservationIds(observationIds: SfiEntityId[]): Promise<Evidence[]> {
    return this.evidence.filter((item) => item.observationIds.some((observationId) => observationIds.includes(observationId)));
  }
}

export class InMemoryMemoryRepository {
  private memories: InstitutionalMemory[] = [];

  async save(entity: InstitutionalMemory): Promise<void> {
    this.memories = this.memories.filter((item) => item.id !== entity.id);
    this.memories.push(entity);
  }

  async findById(id: SfiEntityId): Promise<InstitutionalMemory | null> {
    return this.memories.find((item) => item.id === id) ?? null;
  }

  async findByPhenomenon(phenomenonId: SfiEntityId): Promise<InstitutionalMemory[]> {
    return this.memories.filter((item) => item.phenomenonId === phenomenonId);
  }
}

export class InMemoryEventRepository {
  private events: SfiEvent[] = [];

  async save(entity: SfiEvent): Promise<void> {
    this.events = this.events.filter((item) => item.id !== entity.id);
    this.events.push(entity);
  }

  async findById(id: SfiEntityId): Promise<SfiEvent | null> {
    return this.events.find((item) => item.id === id) ?? null;
  }

  async findByLogbookId(logbookId: string): Promise<SfiEvent[]> {
    return this.events.filter((item) => item.logbookId === logbookId);
  }

  async findSequenceRange(start: number, end: number): Promise<SfiEvent[]> {
    return this.events.filter((item) => item.sequence >= start && item.sequence <= end);
  }
}
