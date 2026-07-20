export type PpoiIndices = {
  IE?: number;
  ES?: number;
  PT?: number;
  RC?: number;

  [key: string]: number | undefined;
};


export type PhenomenonState = {

  phenomenon: {

    id: string;

    name: string;

    status: string;


    fp_code?: string | null;


    current_indices:
      PpoiIndices;


    current_composite:
      number | null;


    indices_calculated_at?:
      string | null;


    opened_at?:
      string;


    last_evidence_at?:
      string;


    [key:string]:
      unknown;

  };



  evidence: Array<{

    id:string;

    evidence_type:string;

    source:string;

    domain:string;

    observed_at:string;


    content_text?:
      string | null;


    content_url?:
      string | null;


    [key:string]:
      unknown;

  }>;



  currentHypothesis:
    Record<string, unknown> | null;

};