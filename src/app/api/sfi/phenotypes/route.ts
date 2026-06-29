import { NextResponse } from 'next/server';
import { getSfiPhenotypeRegistry, SFI_PHENOTYPE_REGISTRY_BOUNDARY } from '@/lib/sfi/phenotypes/registry';

export const dynamic = 'force-static';

export async function GET() {
  const phenotypes = getSfiPhenotypeRegistry();

  return NextResponse.json({
    ok: true,
    evidence_state: 'proposed',
    boundary: SFI_PHENOTYPE_REGISTRY_BOUNDARY,
    phenotypes,
  });
}
