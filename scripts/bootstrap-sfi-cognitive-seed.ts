import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

dotenv.config({
  path: ".env.local",
});


const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;


if (!SUPABASE_URL) {
  throw new Error(
    "Falta NEXT_PUBLIC_SUPABASE_URL en .env.local"
  );
}


if (!SUPABASE_KEY) {
  throw new Error(
    "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local"
  );
}


const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);



async function main() {

  console.log(
    "SFI Cognitive Seed Bootstrap"
  );


  const phenomenonKey =
    "operational_continuity_loss";


  //
  // 1. Buscar o crear fenómeno
  //

  let phenomenon;


  const {
    data: existingPhenomenon,
    error: findPhenomenonError
  }
  =
  await supabase
    .from("sfi_phenomena")
    .select("*")
    .eq(
      "phenomenon_key",
      phenomenonKey
    )
    .maybeSingle();



  if(findPhenomenonError)
    throw findPhenomenonError;



  if(existingPhenomenon){

    phenomenon =
      existingPhenomenon;


    console.log(
      "Phenomenon exists:",
      phenomenon.id
    );


  }
  else {


    const {
      data,
      error
    }
    =
    await supabase
      .from("sfi_phenomena")
      .insert({

        phenomenon_key:
          phenomenonKey,

        label:
          "Fricción operativa por pérdida de continuidad informacional",

        module:
          "organizational",

        description:
          "Desalineación entre generación de evidencia, memoria institucional y capacidad de decisión.",

        regime:
          "emergent",

        density:
          0.65,

        persistence:
          0.85,

        velocity:
          0.55,

        trust:
          0.80,

        degradation:
          0.35,

        evidence_count:
          0,

        attractor_count:
          0,

        ejector_count:
          0,

        first_seen:
          new Date().toISOString(),

        last_seen:
          new Date().toISOString(),

        vector:
        {
          continuity:0.85,
          memory:0.80,
          evidence:0.75,
          adaptation:0.70
        }

      })
      .select()
      .single();



    if(error)
      throw error;



    phenomenon = data;


    console.log(
      "Phenomenon created:",
      phenomenon.id
    );

  }




  //
  // 2. Crear evidencia
  //

  const {
    data:evidence,
    error:evidenceError
  }
  =
  await supabase
    .from("root_evidence_entries")
    .insert({

      evidence_hash:
        crypto.randomUUID(),

      title:
        "Evidencia inicial continuidad cognitiva institucional",

      content:
        "Alta actividad operacional sin consolidación de memoria semántica.",

      evidence_type:
        "phenomenological",

      target_node_id:
        "sfi_cognitive_runtime",

      payload:
      {
        source:
          "sfi_cognitive_seed",

        phenomenon:
          phenomenonKey,

        weight:
          0.85
      }

    })
    .select()
    .single();



  if(evidenceError)
    throw evidenceError;



  console.log(
    "Evidence created:",
    evidence.id
  );




  //
  // 3. Relación fenómeno-evidencia
  //

  const {
    error:relationError
  }
  =
  await supabase
    .from("sfi_phenomenon_evidence")
    .insert({

      phenomenon_key:
        phenomenonKey,

      evidence_id:
        evidence.id,

      weight:
        0.85,

      relation_type:
        "supports"

    });



  if(relationError)
    throw relationError;



  console.log(
    "Phenomenon evidence linked"
  );




  //
  // 4. Field Case
  //

  const {
    data:fieldCase,
    error:caseError
  }
  =
  await supabase
    .from("field_cases")
    .insert({

      title:
        "SFI-CASE-002 Continuidad cognitiva institucional",

      description:
        "Caso inicial para validar simulación multidominio.",

      status:
        "open"

    })
    .select()
    .single();



  if(caseError)
    throw caseError;



  console.log(
    "Field case created:",
    fieldCase.id
  );




  //
  // 5. AMV Memory
  //

  const {
    error:memoryError
  }
  =
  await supabase
    .from("sfi_amv_memory")
    .insert({

      memory_type:
        "phenomenon",

      reference_id:
        phenomenon.id,

      content:
      {

        phenomenon:
          "Continuidad cognitiva",

        hypothesis:
          "La pérdida de relación temporal entre eventos reduce capacidad adaptativa.",

        confidence:
          0.80

      }

    });



  if(memoryError)
    throw memoryError;



  console.log(
    "AMV memory created"
  );


  console.log(
    "SFI Cognitive Seed completed successfully"
  );

}



main()
.catch(
(error)=>{

  console.error(
    "SFI Seed failed:",
    error.message ?? error
  );

  process.exit(1);

});