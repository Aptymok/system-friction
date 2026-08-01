import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { executeAbortableQuery } from '@/lib/supabase/abortableQuery';
import { createHash } from 'crypto';


export type InstitutionalMemoryIntent = {
  source?: string | Record<string, any>;
  entityType?: string;
  entityId?: string;

  provenance?: Record<string, any> | string | null;

  authorization?: Record<string, any> | string | null;

  eventType?: string;

  confidence?: number;

  payload?: Record<string, any>;
};


export type InstitutionalMemoryResult = {
  ok: boolean;
  success: boolean;

  error?: string;

  memory?: {
    id: string | null;
    created_at: string | null;
  };
};


function hashPayload(payload: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}


function resolveSource(
  source: InstitutionalMemoryIntent['source']
) {

  if (typeof source === 'string') {
    return source;
  }

  return (
    source?.component ??
    source?.agentId ??
    source?.name ??
    'institutional-memory'
  );

}



export async function writeInstitutionalMemory(
  intent: InstitutionalMemoryIntent
): Promise<InstitutionalMemoryResult> {


  try {


    const service = createServiceSupabaseClient();


    const moduleName =
      resolveSource(intent.source);


    const eventType =
      intent.eventType ??
      intent.entityType ??
      'INSTITUTIONAL_MEMORY_EVENT';


    const confidence =
      intent.confidence ??
      0.5;


    const payload =
      intent.payload ??
      {
        entityType: intent.entityType ?? null,
        entityId: intent.entityId ?? null,
        provenance: intent.provenance ?? null,
        authorization: intent.authorization ?? null
      };


    const inputHash =
      hashPayload(payload);



    const result =
      await executeAbortableQuery(

        service
          .from('sfi_amv_memory')
          .insert({

            session_id:
              payload.caseId ??
              `institutional_${Date.now()}`,


            module:
              moduleName,


            input_hash:
              inputHash,


            input_summary:
              eventType,


            inference: {

              event_type:
                eventType,

              source:
                moduleName,

              entity_type:
                intent.entityType ?? null,

              entity_id:
                intent.entityId ?? null,

              provenance:
                intent.provenance ?? null

            },


            decision: {

              status:
                'persisted',

              authorization:
                intent.authorization ?? null

            },


            output_summary:
              eventType,


            evaluation: {

              writer:
                'institutionalMemoryWriter',

              version:
                '1.1'

            },


            memory_delta: {

              ...payload,

              institutional_context: {

                entityType:
                  intent.entityType ?? null,

                entityId:
                  intent.entityId ?? null,

                provenance:
                  intent.provenance ?? null,

                authorization:
                  intent.authorization ?? null

              }

            },


            uncertainty:
              1 - confidence,


            source_trust:
              confidence,


            requires_human_validation:
              confidence < 0.5


          })
          .select('id,created_at')
          .single(),

        5000

      );



    if (result.error) {

      return {

        ok:false,

        success:false,

        error:
          result.error.message

      };

    }



    return {

      ok:true,

      success:true,

      memory: {

        id:
          result.data?.id ?? null,

        created_at:
          result.data?.created_at ?? null

      }

    };



  } catch(error) {


    return {

      ok:false,

      success:false,

      error:
        error instanceof Error
          ? error.message
          : 'unknown_error'

    };

  }

}



export class InstitutionalMemoryWriter {


  async write(
    intent: InstitutionalMemoryIntent
  ): Promise<InstitutionalMemoryResult> {

    return writeInstitutionalMemory(intent);

  }


}