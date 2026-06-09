import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { computeCulturalVector } from './cultural-vector-scoring';
import type { CulturalVectorResponse, PlatformVector } from './cultural-vector-contract';
import { findCulturalWaveCase } from './cultural-wave-cases';
import { evidenceTypeVectorEffects, inferEvidenceType, sourceCoverageContribution } from './evidence-vector-mapper';
