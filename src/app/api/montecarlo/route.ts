import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(req: Request) {
  const mihmVec = await req.json();
  const inputJson = JSON.stringify(mihmVec);
  const scriptPath = path.join(process.cwd(), 'services/python/montecarlo_cli.py');
  try {
    const { stdout } = await execAsync(`python ${scriptPath} '${inputJson.replace(/'/g, "'\\''")}'`);
    return Response.json(JSON.parse(stdout));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}