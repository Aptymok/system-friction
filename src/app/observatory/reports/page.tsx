import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { listOperationalCases, readOperationalCase } from '@/lib/sfi/case-platform/repository';
import './reports.css';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function reportTitle(object: Row) {
  const payload = row(object.payload);
  return text(payload.title) || text(row(object.canonicalRef).id) || 'Untitled report';
}

export default async function ObservatoryReportsPage() {
  let user: Awaited<ReturnType<typeof requireAuthenticatedUser>>['user'];
  try {
    ({ user } = await requireAuthenticatedUser());
  } catch {
    redirect('/login?next=%2Fobservatory%2Freports');
  }

  const cases = await listOperationalCases(user.id);
  const rows = (await Promise.all(cases.map(async (caseRecord) => {
    try {
      const envelope = await readOperationalCase(caseRecord.id, user.id);
      return envelope.objects
        .filter((object) => object.kind === 'REPORT')
        .map((object) => ({ caseRecord, object }));
    } catch {
      return [];
    }
  }))).flat().sort((a, b) => b.object.createdAt.localeCompare(a.object.createdAt));

  return (
    <main className="obsReportsShell">
      <header className="obsReportsTop">
        <div>
          <span className="obsReportsKicker">SFI · OBSERVATORY · CASE PLATFORM</span>
          <h1>REPORTS</h1>
          <p>Persisted report records visible to this authenticated SFI account. A report appearing here is not automatically published, institutionally admitted, accepted as evidence or approved by ROOT.</p>
        </div>
        <nav className="obsReportsNav">
          <Link href="/observatory">OBSERVATORY</Link>
          <Link href="/root">ROOT</Link>
        </nav>
      </header>

      {rows.length ? (
        <section className="obsReportsGrid">
          {rows.map(({ caseRecord, object }) => {
            const payload = row(object.payload);
            const canonical = row(object.canonicalRef);
            const readiness = row(payload.publicationReadiness);
            const published = readiness.published === true;
            return (
              <Link
                className="obsReportCard"
                href={`/observatory/reports/${encodeURIComponent(caseRecord.id)}?report=${encodeURIComponent(text(canonical.id))}`}
                key={`${caseRecord.id}:${object.id}`}
              >
                <div className="obsReportBadges">
                  <span className={`obsReportBadge ${published ? 'good' : 'warn'}`}>{published ? 'PUBLISHED' : 'NOT PUBLISHED'}</span>
                  <span className="obsReportBadge">{caseRecord.status}</span>
                  <span className="obsReportBadge">{text(payload.status) || object.epistemicRole}</span>
                </div>
                <strong>{reportTitle(object as unknown as Row)}</strong>
                <code>{text(canonical.id)} · v{text(canonical.version) || 'n/d'}</code>
                <span>{caseRecord.subject}</span>
              </Link>
            );
          })}
        </section>
      ) : (
        <div className="obsReportEmpty">No persisted REPORT objects are visible to this account.</div>
      )}
    </main>
  );
}
