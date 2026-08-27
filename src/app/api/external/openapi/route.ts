import { NextRequest, NextResponse } from 'next/server';
import sourceDocument from '../../../../../public/openapi.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type JsonRecord = Record<string, any>;

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin.replace(/\/$/, '');
  const document = structuredClone(sourceDocument) as JsonRecord;

  document.servers = [{ url: origin }];

  if (document.info && typeof document.info === 'object') {
    document.info.termsOfService = `${origin}/privacy`;
  }

  if (document.externalDocs && typeof document.externalDocs === 'object') {
    document.externalDocs.url = `${origin}/privacy`;
  }

  const authorizationCode = document.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode;
  if (authorizationCode && typeof authorizationCode === 'object') {
    authorizationCode.authorizationUrl = `${origin}/api/oauth/authorize`;
    authorizationCode.tokenUrl = `${origin}/api/oauth/token`;
  }

  if (document['x-sfi-governance'] && typeof document['x-sfi-governance'] === 'object') {
    document['x-sfi-governance'].privacyPolicy = `${origin}/privacy`;
    document['x-sfi-governance'].schemaBinding = 'REQUEST_ORIGIN';
  }

  return NextResponse.json(document, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
