export async function extractMIHM(
  audioFile: File,
  lyrics?: string,
  precomputedSemantics?: { R_sem: number; C_sem: number }
) {
  const formData = new FormData();
  formData.append('audio', audioFile);
  if (lyrics) formData.append('text', lyrics);
  if (precomputedSemantics) formData.append('json', JSON.stringify(precomputedSemantics));

  const res = await fetch('/api/mihm', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('MIHM extraction failed');
  return res.json();
}