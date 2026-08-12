import fs from 'fs';
import path from 'path';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { executeAbortableQuery } from '@/lib/supabase/abortableQuery';
import { writeInstitutionalMemory } from '@/core/memory/InstitutionalMemoryWriter';

export type SfiOperationalEventRisk =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'unknown';

export type SfiOperationalEventStatus =
  | 'observed'
  | 'pending'
  | 'classified'
  | 'blocked'
  | 'drafted'
  | 'persisted'
  | 'resolved'
  | 'unknown';

export type SfiOperationalEvent = {
  id: string;
  created_at: string;
  organ: string;
  kind: string;
  title: string;
  summary: string;
  source?: string;
  risk?: SfiOperationalEventRisk | string;
  status?: SfiOperationalEventStatus | string;
  payload?: Record<string, unknown>;
  next_action?: string;
};

export let lastSfiSupabaseWriteError: unknown = null;


const DATA_DIR = path.join(
  process.cwd(),
  'data'
);

const EVENTS_FILE = path.join(
  DATA_DIR,
  'sfi-operational-events.json'
);


function ensureDataFile() {

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive:true });
  }

  if (!fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(
      EVENTS_FILE,
      '[]',
      'utf8'
    );
  }
}


function readLocalEvents(): SfiOperationalEvent[] {

  ensureDataFile();

  try {

    const parsed =
      JSON.parse(
        fs.readFileSync(
          EVENTS_FILE,
          'utf8'
        )
      );

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch {

    return [];

  }
}


function writeLocalEvents(
  events:SfiOperationalEvent[]
) {

  ensureDataFile();

  fs.writeFileSync(
    EVENTS_FILE,
    JSON.stringify(
      events,
      null,
      2
    ),
    'utf8'
  );

}



async function writeSupabaseEvent(
  event:SfiOperationalEvent
):Promise<boolean>{

  try {

    const result =
      await writeInstitutionalMemory({

        source:
          'sfi-operational-events',

        eventType:
          'SFI_OPERATIONAL_EVENT',

        confidence:
          event.status === 'observed'
            ? 0.82
            : 0.55,

        payload:{
          event:{
            id:event.id,
            created_at:event.created_at,
            organ:event.organ,
            kind:event.kind,
            title:event.title,
            summary:event.summary,
            source:event.source,
            risk:event.risk,
            status:event.status,
            next_action:event.next_action,
            payload:event.payload
          }
        }

      });


    if(!result.ok){

      throw new Error(
        result.error ||
        'institutional_memory_write_failed'
      );

    }


    lastSfiSupabaseWriteError=null;

    return true;


  } catch(error){

    lastSfiSupabaseWriteError=error;

    console.warn(
      '[sfi-operational-events] persistence failed:',
      error
    );

    return false;

  }

}



async function readSupabaseEvents()
:Promise<SfiOperationalEvent[]|null>{

  try {

    const service =
      createServiceSupabaseClient();


    const {data,error} =
      await executeAbortableQuery(

        service
          .from('sfi_amv_memory')
          .select('*')
          .eq(
            'session_id',
            'sfi-operational'
          )
          .order(
            'created_at',
            {
              ascending:true
            }
          )
          .limit(500)

      );


    if(error) throw error;


    return (data || [])
      .map((row:any)=>{

        const embedded =
          row?.memory_delta
            ?.event;


        if(
          embedded &&
          typeof embedded === 'object'
        ){

          return embedded as SfiOperationalEvent;

        }


        return {

          id:String(row.id),

          created_at:
            String(
              row.created_at ||
              new Date().toISOString()
            ),

          organ:
            String(
              row.module ||
              'sfi'
            ),

          kind:
            String(
              row.inference?.event_type ||
              'memory'
            ),

          title:
            String(
              row.input_summary ||
              'SFI operational memory'
            ),

          summary:
            String(
              row.output_summary ||
              ''
            ),

          source:
            String(
              row.module ||
              'sfi_amv_memory'
            ),

          risk:
            'unknown',

          status:
            'persisted',

          payload:
            row.memory_delta || {}

        };

      });


  } catch(error){

    console.warn(
      '[sfi-operational-events] read failed:',
      error
    );

    return null;

  }

}



export async function readSfiOperationalEventsAsync()
:Promise<SfiOperationalEvent[]>{

  const remote =
    await readSupabaseEvents();


  if(
    remote &&
    remote.length
  ){

    return remote;

  }


  return readLocalEvents();

}



export function readSfiOperationalEvents(){

  return readLocalEvents();

}



export function writeSfiOperationalEvents(
  events:SfiOperationalEvent[]
){

  writeLocalEvents(events);

}




export async function appendSfiOperationalEventAsync(
  input:Partial<SfiOperationalEvent>
):Promise<SfiOperationalEvent>{

  const event:SfiOperationalEvent={

    id:
      input.id ||
      `evt-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,

    created_at:
      input.created_at ||
      new Date().toISOString(),

    organ:
      input.organ ||
      'unknown',

    kind:
      input.kind ||
      'observation',

    title:
      input.title ||
      'Evento operacional SFI',

    summary:
      input.summary ||
      'Evento registrado.',

    source:
      input.source ||
      'api/sfi/events',

    risk:
      input.risk ||
      'unknown',

    status:
      input.status ||
      'observed',

    payload:
      input.payload,

    next_action:
      input.next_action

  };


  const persisted =
    await writeSupabaseEvent(event);



  const local =
    readLocalEvents();


  const merged =
    local.filter(
      x=>x.id!==event.id
    );


  writeLocalEvents(
    [
      ...merged,
      event
    ].sort(
      (a,b)=>
        a.created_at.localeCompare(
          b.created_at
        )
    )
  );


  return {

    ...event,

    payload:{

      ...(event.payload || {}),

      persistence:
        persisted
          ? 'institutional_memory'
          : 'local_fallback'

    }

  };

}




export function appendSfiOperationalEvent(
 input:Partial<SfiOperationalEvent>
):SfiOperationalEvent{


  const event:SfiOperationalEvent={

    id:
      input.id ||
      `evt-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,

    created_at:
      input.created_at ||
      new Date().toISOString(),

    organ:
      input.organ ||
      'unknown',

    kind:
      input.kind ||
      'observation',

    title:
      input.title ||
      'Evento operacional SFI',

    summary:
      input.summary ||
      'Evento registrado.',

    source:
      input.source ||
      'api/sfi/events',

    risk:
      input.risk ||
      'unknown',

    status:
      input.status ||
      'observed',

    payload:
      input.payload,

    next_action:
      input.next_action

  };


  void writeSupabaseEvent(event);


  const events =
    readLocalEvents();


  writeLocalEvents(
    [
      ...events.filter(
        x=>x.id!==event.id
      ),
      event
    ]
  );


  return event;

}




export async function latestEventByOrganAsync(
 organ:string
){

  const events =
    await readSfiOperationalEventsAsync();


  return (
    events
      .filter(
        e=>e.organ===organ
      )
      .sort(
        (a,b)=>
          b.created_at.localeCompare(
            a.created_at
          )
      )[0]
    ||
    null
  );

}



export function latestEventByOrgan(
 organ:string
){

  return (
    readLocalEvents()
      .filter(
        e=>e.organ===organ
      )
      .sort(
        (a,b)=>
          b.created_at.localeCompare(
            a.created_at
          )
      )[0]
    ||
    null
  );

}



export async function getSfiOperationalPersistenceStatus(){

  const events =
    await readSupabaseEvents();


  return {

    primary:
      'institutionalMemoryWriter',

    table:
      'sfi_amv_memory',

    fallback:
      'data/sfi-operational-events.json',

    supabaseOk:
      Boolean(events),

    supabaseEventCount:
      events?.length ?? null,

    localEventCount:
      readLocalEvents().length,

    schema_version:
      '2026-08-01.memory-writer.v1'

  };

}