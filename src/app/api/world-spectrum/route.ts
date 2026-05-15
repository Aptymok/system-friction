import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function GET() {
  const scriptPath = path.join(process.cwd(), 'services/python/world_cli.py');
  try {
    const { stdout } = await execAsync(`python ${scriptPath}`);
    const data = JSON.parse(stdout);
    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'WorldSpectrum failed' }, { status: 500 });
  }
}