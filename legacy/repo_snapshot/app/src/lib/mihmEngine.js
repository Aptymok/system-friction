const UCAP_IHG = -0.5;
const UCAP_NTI = 0.4;

export function friction(t, T, O) {
  if (T <= 0) throw new Error('T (tiempo normativo) debe ser > 0');
  return (t / T) + O;
}

export function effectiveL(L, M) {
  return Math.min(L * (1 + (1 - M)), 1);
}

export function nodeIHGContribution(C, E, L, M) {
  const lEff = effectiveL(L, M);
  return (C - E) * (1 - lEff);
}

export function calculateIHG(data) {
  const vectors = data?.vectors || {};
  const contributions = Object.values(vectors).map((v) => nodeIHGContribution(v.C, v.E, v.L, v.M));
  if (!contributions.length) return 0;
  return contributions.reduce((acc, value) => acc + value, 0) / contributions.length;
}

export function calculateNTI(data) {
  const c = data?.nti_components || data;
  return (1 / 5) * ((1 - c.LDI_n) + c.ICC_n + c.CSR + c.IRCI_n + c.IIM);
}

function seededLcg(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return s / 0xFFFFFFFF;
  };
}

function poissonSample(lam, rng) {
  const limit = Math.exp(-lam);
  let p = 1;
  let k = 0;
  while (p > limit) {
    k += 1;
    p *= rng();
  }
  return k - 1;
}

export function monteCarloSimulation(iterations = 50000, params = {}) {
  const { seed = 42, lambda_shock = 0.1, shock_magnitude = 0.3, horizon_days = 180, vectors = {} } = params;

  const rng = seededLcg(seed);
  const ihg0 = calculateIHG({ vectors });
  const results = [];

  for (let i = 0; i < iterations; i += 1) {
    let ihgT = ihg0;
    const lamDaily = lambda_shock / horizon_days;

    for (let day = 0; day < horizon_days; day += 1) {
      const shocks = poissonSample(lamDaily, rng);
      if (shocks > 0) {
        ihgT -= shocks * shock_magnitude * (0.5 + rng() * 0.5);
      }
      ihgT += rng() * 0.003;
      ihgT = Math.max(ihgT, -1.5);
    }

    results.push(ihgT);
  }

  results.sort((a, b) => a - b);
  const n = results.length;
  const pct = (p) => results[Math.floor(n * p)];

  const pCollapse = results.filter((v) => v < UCAP_IHG).length / n;
  const pFracture = results.filter((v) => v < -0.8).length / n;
  const meanIhg = results.reduce((acc, v) => acc + v, 0) / n;

  return {
    seed,
    n,
    lambda: lambda_shock,
    shock_magnitude,
    horizon_days,
    IHG_0: Number(ihg0.toFixed(4)),
    IHG_mean_180d: Number(meanIhg.toFixed(4)),
    p_collapse: Number(pCollapse.toFixed(4)),
    p_fracture: Number(pFracture.toFixed(4)),
    percentiles: {
      p10: Number(pct(0.10).toFixed(4)),
      p25: Number(pct(0.25).toFixed(4)),
      p50: Number(pct(0.50).toFixed(4)),
      p75: Number(pct(0.75).toFixed(4)),
      p90: Number(pct(0.90).toFixed(4)),
    },
  };
}

export function updatePhi(state) {
  const next = { ...(state?.phi || {}) };
  const mihm = state?.mihm || {};
  const ihgAbs = Math.abs(mihm.ihg ?? 0);

  next.F_s = Number((ihgAbs * 0.8).toFixed(4));
  next.C_s = Number((1 - ihgAbs).toFixed(4));
  next.D_cog = Number(Math.min(1, 0.5 + Math.abs(mihm.nti ?? 0)).toFixed(4));
  next.E_r = Number((0.4 + (mihm.nti ?? 0) * 0.3).toFixed(4));
  next.D_i = Number((0.35 + ihgAbs * 0.25).toFixed(4));
  next.G_f = Number((ihgAbs * 1.1).toFixed(4));
  next.R_sem = Number((0.28 + (mihm.nti ?? 0) * 0.22).toFixed(4));
  next.V_i = Number((0.5 - (mihm.nti ?? 0) * 0.15).toFixed(4));
  next.C_sem = Number((0.42 + (mihm.nti ?? 0) * 0.11).toFixed(4));
  next.Phi = Number((0.55 + (mihm.ihg ?? 0) * -0.22).toFixed(4));

  return next;
}

export { UCAP_IHG, UCAP_NTI };
