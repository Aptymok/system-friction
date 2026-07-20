import 'server-only';

export type PpoiEvidenceInput = {
  domain: string;
  source: string;
  generatesArtifact: boolean;
  artifactNote: string | null;
  contentText: string | null;
  observedAt: string;
};

export type PpoiIndices = {
  PT: number;
  PM: number;
  IE: number;
  RC: number;
  CG: number;
  ES: number;
  LT: number;
  IO: number;
};

export type PpoiCalibrationResult = {
  indices: PpoiIndices;
  composite: number;
  evidenceCount: number;
  spanDays: number;
  notes: string[];
};

const DAY_MS =
  24 * 60 * 60 * 1000;

const WEIGHTS = {
  PT: 0.2,
  IE: 0.2,
  RC: 0.2,
  PM: 0.15,
  CG: 0.1,
  ES: 0.1,
  IO: 0.05,
} as const;

const IO_KEYWORDS = [
  'theory',
  'repository',
  'protocol',
  'experiment',
  'community',
  'language',
  'model',
  'algorithm',
  'api',
  'system',
  'framework',
];

const STOPWORDS =
  new Set([
    'de',
    'la',
    'el',
    'que',
    'and',
    'the',
    'para',
    'with',
    'from',
    'this',
    'that',
    'una',
    'uno',
    'los',
    'las',
  ]);

function clamp(
  value: number,
  min: number,
  max: number,
) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(
    max,
    Math.max(
      min,
      value,
    ),
  );
}

function daysBetween(
  a: number,
  b: number,
) {
  return Math.abs(a - b) / DAY_MS;
}

function normalizeToken(
  value: string,
) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    );
}

function tokenize(
  text: string | null,
) {
  if (!text) {
    return new Set<string>();
  }

  return new Set(
    normalizeToken(text)
      .split(
        /[^a-z0-9]+/,
      )
      .filter(
        (token) =>
          token.length > 3 &&
          !STOPWORDS.has(token),
      ),
  );
}

function jaccard(
  a: Set<string>,
  b: Set<string>,
) {
  if (!a.size || !b.size) {
    return null;
  }

  let intersection = 0;

  for (const item of a) {
    if (b.has(item)) {
      intersection += 1;
    }
  }

  const union =
    a.size +
    b.size -
    intersection;

  return union
    ? intersection / union
    : null;
}

function calculatePT(
  sorted: PpoiEvidenceInput[],
  notes: string[],
) {
  if (!sorted.length) {
    return 0;
  }

  if (sorted.length === 1) {
    notes.push(
      'PT=1: single evidence point.',
    );

    return 1;
  }

  const first =
    new Date(
      sorted[0].observedAt,
    ).getTime();

  const last =
    new Date(
      sorted[
        sorted.length - 1
      ].observedAt,
    ).getTime();

  const spanDays =
    daysBetween(
      first,
      last,
    );

  const ageDays =
    daysBetween(
      Date.now(),
      last,
    );

  if (ageDays > 365) {
    notes.push(
      `PT=1: inactive ${Math.round(ageDays)} days.`,
    );

    return 1;
  }

  if (spanDays < 30) {
    notes.push(
      `PT=2: concentrated ${Math.round(spanDays)} days.`,
    );

    return 2;
  }

  if (spanDays < 180) {
    return 3;
  }

  if (spanDays < 730) {
    return 4;
  }

  return 5;
}

function calculatePM(
  evidence: PpoiEvidenceInput[],
) {
  return clamp(
    new Set(
      evidence.map(
        (item) =>
          normalizeToken(
            item.domain,
          ),
      ),
    ).size,
    0,
    5,
  );
}

function calculateIE(
  evidence: PpoiEvidenceInput[],
) {
  return clamp(
    new Set(
      evidence.map(
        (item) =>
          normalizeToken(
            item.source,
          ),
      ),
    ).size,
    0,
    5,
  );
}

function calculateRC(
  sorted: PpoiEvidenceInput[],
) {
  if (sorted.length < 2) {
    return 0;
  }

  const domains =
    new Set<string>();

  let returns = 0;

  sorted.forEach(
    (item, index) => {
      const domain =
        normalizeToken(
          item.domain,
        );

      if (index > 0) {
        const previous =
          sorted[index - 1];

        const gap =
          daysBetween(
            new Date(
              item.observedAt,
            ).getTime(),
            new Date(
              previous.observedAt,
            ).getTime(),
          );

        if (
          gap > 60 &&
          domains.has(domain)
        ) {
          returns += 1;
        }
      }

      domains.add(domain);
    },
  );

  return clamp(
    returns,
    0,
    5,
  );
}

function calculateCG(
  evidence: PpoiEvidenceInput[],
) {
  return clamp(
    evidence.filter(
      (item) =>
        item.generatesArtifact,
    ).length,
    0,
    5,
  );
}

function calculateES(
  sorted: PpoiEvidenceInput[],
) {
  const tokens =
    sorted
      .map(
        (item) =>
          tokenize(
            item.contentText ??
              item.artifactNote,
          ),
      )
      .filter(
        (set) =>
          set.size > 0,
      );

  if (tokens.length < 2) {
    return 2.5;
  }

  const scores:number[] = [];

  for (
    let i = 1;
    i < tokens.length;
    i++
  ) {
    const score =
      jaccard(
        tokens[i - 1],
        tokens[i],
      );

    if (score !== null) {
      scores.push(score);
    }
  }

  if (!scores.length) {
    return 2.5;
  }

  const avg =
    scores.reduce(
      (a,b)=>a+b,
      0,
    ) /
    scores.length;

  return clamp(
    avg * 5,
    0,
    5,
  );
}

function calculateLT(
  sorted: PpoiEvidenceInput[],
) {
  if (sorted.length < 2) {
    return 0;
  }

  const gaps:number[]=[];

  for(
    let i=1;
    i<sorted.length;
    i++
  ){
    gaps.push(
      daysBetween(
        new Date(
          sorted[i].observedAt,
        ).getTime(),
        new Date(
          sorted[i-1].observedAt,
        ).getTime(),
      ),
    );
  }

  const average =
    gaps.reduce(
      (a,b)=>a+b,
      0,
    ) /
    gaps.length;

  return average < 7
    ? 0
    : average < 30
      ? 1
      : average < 90
        ? 2
        : average < 180
          ? 3
          : average < 365
            ? 4
            : 5;
}

function calculateIO(
  evidence: PpoiEvidenceInput[],
) {
  const matches =
    new Set<string>();

  for(
    const item of evidence
  ){
    if(!item.generatesArtifact){
      continue;
    }

    const tokens =
      tokenize(
        item.artifactNote ??
        item.contentText,
      );

    IO_KEYWORDS.forEach(
      (keyword)=>{
        if(tokens.has(keyword)){
          matches.add(keyword);
        }
      },
    );
  }

  return clamp(
    matches.size,
    0,
    5,
  );
}

export function calculatePpoiIndices(
  evidence: PpoiEvidenceInput[],
): PpoiCalibrationResult {

  const notes:string[]=[];

  const sorted =
    [...evidence].sort(
      (a,b)=>
        new Date(
          a.observedAt,
        ).getTime() -
        new Date(
          b.observedAt,
        ).getTime(),
    );

  const indices:PpoiIndices={
    PT:
      calculatePT(
        sorted,
        notes,
      ),

    PM:
      calculatePM(
        sorted,
      ),

    IE:
      calculateIE(
        sorted,
      ),

    RC:
      calculateRC(
        sorted,
      ),

    CG:
      calculateCG(
        sorted,
      ),

    ES:
      calculateES(
        sorted,
      ),

    LT:
      calculateLT(
        sorted,
      ),

    IO:
      calculateIO(
        sorted,
      ),
  };

  const composite =
    Number(
      (
        indices.PT * WEIGHTS.PT +
        indices.IE * WEIGHTS.IE +
        indices.RC * WEIGHTS.RC +
        indices.PM * WEIGHTS.PM +
        indices.CG * WEIGHTS.CG +
        indices.ES * WEIGHTS.ES +
        indices.IO * WEIGHTS.IO
      ).toFixed(3),
    );

  const spanDays =
    sorted.length > 1
      ? Math.round(
          daysBetween(
            new Date(
              sorted[0].observedAt,
            ).getTime(),
            new Date(
              sorted[
                sorted.length-1
              ].observedAt,
            ).getTime(),
          ),
        )
      : 0;

  return {
    indices,
    composite,
    evidenceCount:
      sorted.length,
    spanDays,
    notes,
  };
}