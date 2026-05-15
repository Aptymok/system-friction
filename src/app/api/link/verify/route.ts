import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'system_friction_default_key_000';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token no proporcionado' }, { status: 400 });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    
    return NextResponse.json({
      valid: true,
      identity: decoded,
      access: 'authorized'
    }, { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({
      valid: false,
      error: 'Invalid or expired token',
      details: errorMessage
    }, { status: 401 });
  }
}