export const EXPERIMENT_VERSION = 'SFI-CL-COGNITIVE-OLYMPICS-2026.08.1';
export const START_YEAR = 2010;
export const END_YEAR = 2026;

export const PROFILES = {
  smoke: { problemsPerYear: 60, batchSize: 20, congress: false },
  quick: { problemsPerYear: 500, batchSize: 50, congress: false },
  full: { problemsPerYear: 5000, batchSize: 100, congress: false },
  congress: { problemsPerYear: 5000, batchSize: 100, congress: true },
};

export const DEFAULT_DOMAINS = [
  'economy', 'labor', 'demography', 'health', 'energy', 'environment',
  'trade', 'technology', 'production', 'inequality', 'institutions',
];

export const WORLD_BANK_INDICATORS = [
  ['NY.GDP.MKTP.KD.ZG', 'GDP growth', 'economy'],
  ['NY.GDP.PCAP.KD.ZG', 'GDP per-capita growth', 'economy'],
  ['FP.CPI.TOTL.ZG', 'Inflation, consumer prices', 'economy'],
  ['SL.UEM.TOTL.ZS', 'Unemployment rate', 'labor'],
  ['SL.TLF.CACT.ZS', 'Labor force participation', 'labor'],
  ['SL.EMP.TOTL.SP.ZS', 'Employment to population ratio', 'labor'],
  ['SP.POP.GROW', 'Population growth', 'demography'],
  ['SP.URB.TOTL.IN.ZS', 'Urban population share', 'demography'],
  ['SP.POP.0014.TO.ZS', 'Population ages 0-14', 'demography'],
  ['SP.POP.65UP.TO.ZS', 'Population ages 65+', 'demography'],
  ['SP.DYN.LE00.IN', 'Life expectancy', 'health'],
  ['SP.DYN.IMRT.IN', 'Infant mortality', 'health'],
  ['SH.XPD.CHEX.GD.ZS', 'Current health expenditure', 'health'],
  ['EG.ELC.ACCS.ZS', 'Access to electricity', 'energy'],
  ['EG.USE.PCAP.KG.OE', 'Energy use per capita', 'energy'],
  ['EN.ATM.CO2E.PC', 'CO2 emissions per capita', 'environment'],
  ['AG.LND.FRST.ZS', 'Forest area', 'environment'],
  ['NE.TRD.GNFS.ZS', 'Trade as share of GDP', 'trade'],
  ['NE.EXP.GNFS.ZS', 'Exports as share of GDP', 'trade'],
  ['NE.IMP.GNFS.ZS', 'Imports as share of GDP', 'trade'],
  ['BX.KLT.DINV.WD.GD.ZS', 'FDI net inflows as share of GDP', 'trade'],
  ['IT.NET.USER.ZS', 'Individuals using the Internet', 'technology'],
  ['IT.CEL.SETS.P2', 'Mobile cellular subscriptions', 'technology'],
  ['NV.IND.MANF.ZS', 'Manufacturing value added share', 'production'],
  ['NV.AGR.TOTL.ZS', 'Agriculture value added share', 'production'],
  ['NV.SRV.TOTL.ZS', 'Services value added share', 'production'],
  ['SI.POV.GINI', 'Gini index', 'inequality'],
  ['SI.POV.NAHC', 'National poverty headcount', 'inequality'],
  ['SG.GEN.PARL.ZS', 'Women in national parliaments', 'institutions'],
];

export function parseCli(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [key, inline] = arg.slice(2).split('=', 2);
    if (inline !== undefined) out[key] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) out[key] = argv[++i];
    else out[key] = true;
  }
  return out;
}

export function profileFrom(value) {
  const name = String(value || process.env.SFI_CL_PROFILE || 'quick').toLowerCase();
  return { name, ...(PROFILES[name] || PROFILES.quick) };
}
