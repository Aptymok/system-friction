import { NextRequest, NextResponse } from 'next/server';
import sourceDocument from '../../../../../public/openapi.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type JsonRecord = Record<string, any>;

const ACTION_DESCRIPTION_LIMIT = 300;
const OPENAPI_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

function clipActionDescription(value: string) {
  if (value.length <= ACTION_DESCRIPTION_LIMIT) return value;
  const head = value.slice(0, ACTION_DESCRIPTION_LIMIT - 3);
  const breakAt = head.lastIndexOf(' ');
  const clipped = (breakAt >= 220 ? head.slice(0, breakAt) : head).trimEnd();
  return `${clipped}...`;
}

function enforceActionDescriptionLimits(document: JsonRecord) {
  const paths = document.paths;
  if (!paths || typeof paths !== 'object') return;

  for (const pathItem of Object.values(paths) as unknown[]) {
    if (!pathItem || typeof pathItem !== 'object' || Array.isArray(pathItem)) continue;
    for (const [method, operation] of Object.entries(pathItem as JsonRecord)) {
      if (!OPENAPI_METHODS.has(method.toLowerCase())) continue;
      if (!operation || typeof operation !== 'object' || Array.isArray(operation)) continue;
      const op = operation as JsonRecord;
      if (typeof op.description === 'string') {
        op.description = clipActionDescription(op.description);
      }
    }
  }
}

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
    document['x-sfi-governance'].actionDescriptionLimit = ACTION_DESCRIPTION_LIMIT;
  }

  enforceActionDescriptionLimits(document);

  return NextResponse.json(document, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
