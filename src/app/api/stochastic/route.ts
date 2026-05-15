import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    
    // Llamada al motor de Python que ya tienes en el Hub
    const { stdout, stderr } = await execPromise(`python3 scripts/montecarlo_cli.py "${input}"`);
    
    if (stderr) throw new Error(stderr);

    const result = JSON.parse(stdout);
    return NextResponse.json({ 
      status: 'success', 
      metrics: result.metrics, // IHG, NTI, Divergencia
      trace: result.trace 
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Falla en motor estocástico' }, { status: 500 });
  }
}