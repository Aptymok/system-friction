import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    // En un entorno real, guardar temporalmente el archivo
    const tempPath = path.join(process.cwd(), 'temp', file.name);
    
    // Llamada al extractor de Python
    const { stdout } = await execPromise(`python3 services/mihm_extractor.py ${tempPath}`);
    const mihmResult = JSON.parse(stdout);

    return NextResponse.json(mihmResult);
  } catch (error) {
    return NextResponse.json({ status: 'BLOCKED', error: 'Fallo en Extractor Acústico' }, { status: 500 });
  }
}