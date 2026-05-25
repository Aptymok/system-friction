export async function runMonteCarlo(mihmVec: any) {
  const res = await fetch('/api/montecarlo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mihmVec)
  });
  if (!res.ok) throw new Error('Monte Carlo simulation failed');
  return res.json();
}