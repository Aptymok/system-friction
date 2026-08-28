import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { readOperationalCase } from '@/lib/sfi/case-platform/repository';
import '../reports.css';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

type Row = Record<string, unknown>;
type PageProps = {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ report?: string }>;
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function label(value: string) {
  return value.replace(/^\d+_/, '').replaceAll('_', ' ');
}

function renderValue(value: unknown, depth = 0): ReactNode {
  if (value === null || typeof value === 'undefined' || value === '') return <span>n/d</span>;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const output = String(value);
    return output.length < 120 && /^[A-Z0-9_.:+/ >→=<-]+$/i.test(output)
      ? <code>{output}</code>
      : <p>{output}</p>;
  }
  if (Array.isArray(value)) {
    return <ul>{value.map((item, index) => <li key={index}>{renderValue(item, depth + 1)}</li>)}</ul>;
  }
  const entries = Object.entries(row(value));
  if (!entries.length) return <span>—</span>;
  return (
    <div>
      {entries.map(([key, item]) => (
        <div className="obsReportDatum" key={`${depth}:${key}`}>
          <strong>{label(key)}</strong>
          <div>{renderValue(item, depth + 1)}</div>
        </div>
      ))}
    </div>
  );
}

export default async function ObservatoryReportReaderPage({ params, searchParams }: PageProps) {
  const { caseId } = await params;
  const requested = text((await searchParams).report);
  let user: Awaited<ReturnType<typeof requireAuthenticatedUser>>['user'];
  try {
    ({ user } = await requireAuthenticatedUser());
  } catch {
    redirect(`/login?next=${encodeURIComponent(`/observatory/reports/${caseId}${requested ? `?report=${encodeURIComponent(requested)}` : ''}`)}`);
  }

  let envelope: Awaited<ReturnType<typeof readOperationalCase>>;
  try {
    envelope = await readOperationalCase(caseId, user.id);
  } catch {
    notFound();
  }

  const reports = envelope.objects
    .filter((object) => object.kind === 'REPORT')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!reports.length) notFound();

  const report = (requested
    ? reports.find((object) => object.canonicalRef.id === requested)
    : reports[0]) ?? reports[0];
  const payload = row(report.payload);
  const sections = row(payload.sections);
  const readiness = row(payload.publicationReadiness);
  const published = readiness.published === true;
  const sourceIds = new Set(report.sourceRefs.map((ref) => ref.id));
  const caseSources = envelope.objects.filter((object) => object.kind === 'SOURCE');
  const sources = sourceIds.size
    ? caseSources.filter((object) => sourceIds.has(object.canonicalRef.id))
    : caseSources;
  const evidenceCount = envelope.objects.filter((object) => object.kind === 'EVIDENCE').length;
  const governanceCount = envelope.objects.filter((object) => object.kind === 'GOVERNANCE_DECISION').length;
  const truthClaimCount = envelope.objects.filter((object) => object.kind === 'TRUTH_CLAIM').length;
  const title = text(payload.title) || report.canonicalRef.id;
  const subtitle = text(payload.subtitle) || envelope.case.subject;
  const abstract = text(payload.executiveAbstract);
  const limitations = Array.isArray(payload.limitations) ? payload.limitations : [];
  const orderedSections = Object.entries(sections).sort(([a], [b]) => a.localeCompare(b));

  return (
    <main className="obsReportsShell">
      <article className="obsReportDocument">
        <header className="obsReportsTop">
          <div>
            <span className="obsReportsKicker">SFI · OBSERVATORY REPORT READER</span>
            <p>Live projection of the persisted Case Platform REPORT object. This page does not copy the report into a second store.</p>
          </div>
          <nav className="obsReportsNav">
            <Link href="/observatory/reports">REPORTS</Link>
            <Link href="/observatory">OBSERVATORY</Link>
            <Link href="/root">ROOT</Link>
          </nav>
        </header>

        <section className="obsReportGate">
          <div>
            <strong>{published ? 'PUBLICATION STATE · PUBLISHED' : 'PUBLICATION STATE · NOT PUBLISHED'}</strong>
            <p>{published ? 'The persisted report marks itself as published.' : 'This is an internal report reader. Visibility here does not grant publication, institutional admission, accepted evidence or ROOT approval.'}</p>
          </div>
          <div className="obsReportBadges">
            <span className={`obsReportBadge ${published ? 'good' : 'warn'}`}>{published ? 'PUBLISHED' : 'GOVERNANCE REQUIRED'}</span>
            <span className="obsReportBadge">{envelope.case.status}</span>
            <span className="obsReportBadge">{envelope.case.uncertainty.determinability}</span>
          </div>
        </section>

        <section className="obsReportTitle">
          <span className="obsReportsKicker">{report.canonicalRef.id} · v{report.canonicalRef.version || 'n/d'}</span>
          <h1>{title}</h1>
          <h2>{subtitle}</h2>
        </section>

        <section className="obsReportMeta">
          <div><small>CASE</small><code>{envelope.case.id}</code></div>
          <div><small>SERVICE PROFILE</small><span>{envelope.case.serviceProfileId}</span></div>
          <div><small>STATUS</small><span>{envelope.case.status}</span></div>
          <div><small>DETERMINABILITY</small><span>{envelope.case.uncertainty.determinability}</span></div>
          <div><small>RELEASE MODE</small><span>{text(payload.releaseMode) || 'n/d'}</span></div>
          <div><small>REPORT STATUS</small><span>{text(payload.status) || report.epistemicRole}</span></div>
          <div><small>SOURCE CUTOFF</small><span>{envelope.case.temporalWindow.cutoff}</span></div>
          <div><small>RECONSTRUCTED AS OF</small><span>{envelope.case.temporalWindow.reconstructionAsOf || 'n/d'}</span></div>
          <div><small>CASE OBJECTS</small><span>{envelope.objects.length}</span></div>
          <div><small>SOURCE REFS</small><span>{report.sourceRefs.length || sources.length}</span></div>
          <div><small>ACCEPTED EVIDENCE OBJECTS</small><span>{evidenceCount}</span></div>
          <div><small>GOVERNANCE DECISIONS</small><span>{governanceCount}</span></div>
          <div><small>TRUTH CLAIMS</small><span>{truthClaimCount}</span></div>
        </section>

        {abstract && (
          <section className="obsReportAbstract">
            <h3>EXECUTIVE ABSTRACT</h3>
            <p>{abstract}</p>
          </section>
        )}

        {orderedSections.map(([key, section]) => (
          <section className="obsReportSection" key={key} id={key.toLowerCase()}>
            <h3>{key}</h3>
            <h2>{label(key)}</h2>
            {renderValue(section)}
          </section>
        ))}

        <section className="obsReportAppendix">
          <h3>PUBLICATION READINESS</h3>
          {renderValue(readiness)}
        </section>

        {limitations.length > 0 && (
          <section className="obsReportAppendix">
            <h3>LIMITATIONS</h3>
            {renderValue(limitations)}
          </section>
        )}

        <section className="obsReportAppendix">
          <h3>CASE SOURCE OBJECTS</h3>
          <p>These are persisted SOURCE objects/references. Their presence in the case does not automatically promote them to accepted EVIDENCE.</p>
          <div className="obsReportSources">
            {sources.map((source) => {
              const sourcePayload = row(source.payload);
              return (
                <div className="obsReportSource" key={source.id}>
                  <b>{source.canonicalRef.id}</b>
                  <span>{text(sourcePayload.label) || text(sourcePayload.publisher) || source.epistemicRole}</span>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="obsReportFooter">
          <span>EPistemic role: {report.epistemicRole}</span>
          <span>INSTITUTIONAL ADMISSION: {text(payload.institutionalAdmission) || envelope.case.governance.institutionalAdmission}</span>
          <span>UPDATED FROM PERSISTED CASE STATE</span>
        </footer>
      </article>
    </main>
  );
}
