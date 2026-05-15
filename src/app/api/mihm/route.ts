import { writeFile, unlink } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(req: Request) {
  const formData = await req.formData();
  const audioFile = formData.get('audio') as File;
  const text = formData.get('text') as string | null;
  const jsonSem = formData.get('json') as string | null; // opcional: JSON con R_sem/C_sem

  if (!audioFile) {
    return Response.json({ error: 'No audio file provided' }, { status: 400 });
  }

  const tempDir = path.join(process.cwd(), 'tmp');
  await writeFile(tempDir, ''); // ensure tmp exists? better to create if not exists. We'll just write.
  // Actually we need to ensure tmp directory exists:
  const fs = await import('fs');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempPath = path.join(tempDir, `${Date.now()}.wav`);
  const buffer = Buffer.from(await audioFile.arrayBuffer());
  await writeFile(tempPath, buffer);

  let cmd = `python services/python/mihm_extract_full.py "${tempPath}"`;
  if (text) cmd += ` --text "${text.replace(/"/g, '\\"')}"`;
  if (jsonSem) cmd += ` --json '${jsonSem.replace(/'/g, "'\\''")}'`;
  if (!text && !jsonSem) cmd += ` --no-text`;

  try {
    const { stdout } = await execAsync(cmd);
    await unlink(tempPath);
    return Response.json(JSON.parse(stdout));
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    return Response.json({ error: error.message }, { status: 500 });
  }
}