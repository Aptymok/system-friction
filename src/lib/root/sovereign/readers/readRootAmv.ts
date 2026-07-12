import 'server-only';
import { dateValue, selectRows, source } from './readerSupport';

export async function readRootAmv() {
  const [memory, attractors, ejectors] = await Promise.all([
    selectRows({ table: 'sfi_amv_memory', select: 'id,session_id,module,input_hash,input_summary,inference,decision,output_summary,evaluation,memory_delta,uncertainty,source_trust,requires_human_validation,created_at', order: 'created_at', limit: 80 }),
    selectRows({ table: 'sfi_attractors', select: 'id,attractor_key,label,module,owner_node_key,attractor_type,confidence,persistence,trust,weight,evidence_count,status,vector,first_seen,last_seen,created_at,updated_at', order: 'updated_at', limit: 40 }),
    selectRows({ table: 'sfi_ejectors', select: 'id,ejector_key,label,module,owner_node_key,contradiction,unresolved_debt,decay,external_pressure,weight,evidence_count,status,vector,first_seen,last_seen,created_at,updated_at', order: 'updated_at', limit: 40 }),
  ]);
  return source({ memories: memory.rows, attractors: attractors.rows, ejectors: ejectors.rows }, 'sfi_amv_memory + convergence graph', [memory.error, attractors.error, ejectors.error], dateValue(memory.rows[0]?.created_at ?? attractors.rows[0]?.updated_at), !memory.rows.length);
}
