import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWorldVectorInternalReport, buildWorldVectorPublicReport } from './reportBuilder';
import type { WorldVectorObservation } from './types';

// Actual observed inputs from World Vector Actions run 40453589724, 2026-10-27.
// This checks report identity only; it does not generate a new observation or RETURN.
const cycleRange = { cycle_start_date: '2026-10-26', cycle_end_date: '2026-11-01' };
const monday: WorldVectorObservation = {
  "sector": "institutional",
  "status": "observed",
  "warnings": [],
  "confidence": 0.5805,
  "day_of_week": "Monday",
  "observed_at": "2026-10-26T03:39:06.712+00:00",
  "domain_values": [
    {
      "value": 0.4351,
      "domain": "AFFECTIVE",
      "confidence": 0.55,
      "source_count": 2
    },
    {
      "value": 0.8448,
      "domain": "BIO",
      "confidence": 0.56,
      "source_count": 2
    },
    {
      "value": 0.2543,
      "domain": "CLIMATE",
      "confidence": 0.62,
      "source_count": 2
    },
    {
      "value": 0.7571,
      "domain": "CULTURAL",
      "confidence": 0.57,
      "source_count": 2
    },
    {
      "value": 0.5108,
      "domain": "ECONOMY",
      "confidence": 0.65,
      "source_count": 2
    },
    {
      "value": 0.568,
      "domain": "GEO_DIGITAL",
      "confidence": 0.61,
      "source_count": 2
    },
    {
      "value": 0.5567,
      "domain": "GEOPOLITICAL",
      "confidence": 0.555,
      "source_count": 2
    },
    {
      "value": 0.6741,
      "domain": "INSTITUTIONAL",
      "confidence": 0.55,
      "source_count": 2
    },
    {
      "value": 0.5999,
      "domain": "MEMETIC",
      "confidence": 0.53,
      "source_count": 2
    },
    {
      "value": 0.6628,
      "domain": "TECH",
      "confidence": 0.61,
      "source_count": 2
    }
  ],
  "interpretation": "Lectura observada para institutional; puede orientar interpretación operativa sin reclamar continuidad persistente. Dominante actual: BIO:BIO · bio_clinicaltrials_public.",
  "dominant_signal": "BIO:BIO · bio_clinicaltrials_public",
  "dominant_sources": [
    {
      "key": "bio_clinicaltrials_public",
      "label": "BIO · bio_clinicaltrials_public",
      "value": 1,
      "domain": "BIO",
      "confidence": 0.58
    },
    {
      "key": "tech_github_public",
      "label": "TECH · tech_github_public",
      "value": 0.9989994512049142,
      "domain": "TECH",
      "confidence": 0.64
    },
    {
      "key": "geo_digital_github_public",
      "label": "GEO_DIGITAL · geo_digital_github_public",
      "value": 0.9451237118283949,
      "domain": "GEO_DIGITAL",
      "confidence": 0.6
    },
    {
      "key": "cultural_wikipedia_public",
      "label": "CULTURAL · cultural_wikipedia_public",
      "value": 0.8178599583939474,
      "domain": "CULTURAL",
      "confidence": 0.56
    },
    {
      "key": "memetic_wikimedia_pageviews_public",
      "label": "MEMETIC · memetic_wikimedia_pageviews_public",
      "value": 0.7684799388664969,
      "domain": "MEMETIC",
      "confidence": 0.54
    }
  ],
  "source_snapshot_id": "52d93eb0-dfaa-4a6b-b03c-7feb3b9deb6e"
};
const tuesday: WorldVectorObservation = {
  "observed_at": "2026-10-27T04:03:18.329+00:00",
  "sector": "technology_ai_data",
  "day_of_week": "Tuesday",
  "source_snapshot_id": "f5a82749-0773-4e9b-86c6-a05eb2ecd4f5",
  "domain_values": [
    {
      "domain": "AFFECTIVE",
      "value": 0.4351,
      "confidence": 0.55,
      "source_count": 2
    },
    {
      "domain": "BIO",
      "value": 0.8447,
      "confidence": 0.56,
      "source_count": 2
    },
    {
      "domain": "CLIMATE",
      "value": 0.3029,
      "confidence": 0.62,
      "source_count": 2
    },
    {
      "domain": "CULTURAL",
      "value": 0.757,
      "confidence": 0.57,
      "source_count": 2
    },
    {
      "domain": "ECONOMY",
      "value": 0.5109,
      "confidence": 0.65,
      "source_count": 2
    },
    {
      "domain": "GEO_DIGITAL",
      "value": 0.568,
      "confidence": 0.61,
      "source_count": 2
    },
    {
      "domain": "GEOPOLITICAL",
      "value": 0.5555,
      "confidence": 0.555,
      "source_count": 2
    },
    {
      "domain": "INSTITUTIONAL",
      "value": 0.674,
      "confidence": 0.55,
      "source_count": 2
    },
    {
      "domain": "MEMETIC",
      "value": 0.599,
      "confidence": 0.53,
      "source_count": 2
    },
    {
      "domain": "TECH",
      "value": 0.6639,
      "confidence": 0.61,
      "source_count": 2
    }
  ],
  "dominant_sources": [
    {
      "key": "bio_clinicaltrials_public",
      "label": "BIO · bio_clinicaltrials_public",
      "domain": "BIO",
      "value": 1,
      "confidence": 0.58
    },
    {
      "key": "tech_github_public",
      "label": "TECH · tech_github_public",
      "domain": "TECH",
      "value": 0.9991652420436776,
      "confidence": 0.64
    },
    {
      "key": "geo_digital_github_public",
      "label": "GEO_DIGITAL · geo_digital_github_public",
      "domain": "GEO_DIGITAL",
      "value": 0.9452100466274652,
      "confidence": 0.6
    },
    {
      "key": "cultural_wikipedia_public",
      "label": "CULTURAL · cultural_wikipedia_public",
      "domain": "CULTURAL",
      "value": 0.8178686130006456,
      "confidence": 0.56
    },
    {
      "key": "memetic_wikimedia_pageviews_public",
      "label": "MEMETIC · memetic_wikimedia_pageviews_public",
      "domain": "MEMETIC",
      "value": 0.7683675201332739,
      "confidence": 0.54
    }
  ],
  "dominant_signal": "BIO:BIO · bio_clinicaltrials_public",
  "interpretation": "Lectura observada para technology / AI / data; puede orientar interpretación operativa sin reclamar continuidad persistente. Dominante actual: BIO:BIO · bio_clinicaltrials_public.",
  "confidence": 0.5805,
  "status": "observed",
  "warnings": []
};

test('daily report dates distinguish two observed days within the same weekly cycle', () => {
  const first = buildWorldVectorInternalReport({ observation: monday, cycleRange });
  const second = buildWorldVectorInternalReport({ observation: tuesday, cycleRange });
  assert.deepEqual([first.period_start, first.period_end], ['2026-10-26', '2026-10-26']);
  assert.deepEqual([second.period_start, second.period_end], ['2026-10-27', '2026-10-27']);
  assert.notEqual(first.period_start, second.period_start);
  assert.equal(second.report_type, 'internal_daily');
  assert.match(second.body, /Observed at: 2026-10-27T04:03:18.329\+00:00/);
});

test('public weekly draft retains the enclosing cycle as its persistence identity', () => {
  const weekly = buildWorldVectorPublicReport({ observation: tuesday, cycleRange });
  assert.deepEqual([weekly.period_start, weekly.period_end], ['2026-10-26', '2026-11-01']);
  assert.equal(weekly.report_type, 'public_weekly');
});

test('daily report normalizes offset-bearing timestamps to their actual UTC date', () => {
  const offsetObservation: WorldVectorObservation = {
    ...tuesday,
    observed_at: '2026-10-27T00:30:00+03:00',
  };
  const report = buildWorldVectorInternalReport({ observation: offsetObservation, cycleRange });
  assert.deepEqual([report.period_start, report.period_end], ['2026-10-26', '2026-10-26']);
  assert.match(report.body, /Observed at: 2026-10-27T00:30:00\+03:00/);
});

test('daily report retains legacy cycle identity when observation timestamp is invalid or absent', () => {
  for (const observed_at of ['not-a-timestamp', undefined]) {
    const observation: WorldVectorObservation = { ...tuesday, observed_at };
    const report = buildWorldVectorInternalReport({ observation, cycleRange });
    assert.deepEqual([report.period_start, report.period_end], ['2026-10-26', '2026-10-26']);
  }
});
