/**
 * Repository chronology is a scoped MIHM-T temporal reader, never a separate
 * model or an execution engine. The seven clocks reuse the canonical
 * MIHM-T Timeline v0.1 contract. Editorial publication is a different axis.
 *
 * This module is pure, read-only, safe to call in the browser. It does not
 * reconstruct knowledge, authority, observed outcomes or event dates from
 * a publication or database update timestamp.
 */
import {
  projectTimelineClockProfile,
  type TimelineClockInputs,
  type TimelineClockProfile,
  type TimelineClockId,
} from '@/lib/mihm/timelineClocks';

export type RepositoryTemporalObject = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  editorial: {publishedAt:string} | null;
};
export type RepositoryTemporalPublication = {
  publishedAt:string;
  clockEvidence?:TimelineClockInputs;
};
export type RepositoryTemporalEvent = {
  id:string;
  title:string;
  publicationAt:string|null;
  recordAt:string|null;
  profile:TimelineClockProfile;
};
export type RepositoryTemporalAxis = 'PUBLICATION' | TimelineClockId;
const isoInstant=(value:unknown):string|null=>{
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value))return null;
  const ms=Date.parse(value);
  return Number.isFinite(ms)?new Date(ms).toISOString():null;
};

export function projectRepositoryMihmTimeline(
  objects:readonly RepositoryTemporalObject[],
  publicReadings:Readonly<Record<string,RepositoryTemporalPublication>>,
):RepositoryTemporalEvent[]{
  return objects.map(record=>{
    const approved=publicReadings[record.id];
    // A registry update is a RECORD clock, not a real-world EVENT,
    // not an OBSERVATION and never proof of KNOWLEDGE.
    const updated=isoInstant(record.updatedAt);
    const recorded=updated??isoInstant(record.createdAt);
    const recordClock=recorded?{
      RECORD:{
        at:recorded,
        sourceRef:'registry:'+record.id,
        meaning:updated?'Canonical public registry last update':'Canonical public registry creation',
        basis:'OBSERVED_TIME' as const,
        epistemicClass:'OBSERVED' as const,
      },
    }:{};
    const profile=projectTimelineClockProfile({
      eventId:'registry:'+record.id,
      anchorAt:recorded??'',
      anchorMeaning:'Public canonical registry record; publication date is a separate editorial axis.',
      clocks:{...recordClock,...(approved?.clockEvidence??{})},
    });
    // A publication date is only an editorial anchor, not one of the seven clocks.
    const publicationAt=isoInstant(record.editorial?.publishedAt)
      ??isoInstant(approved?.publishedAt)
      ??null;
    return {id:record.id,title:record.title,publicationAt,recordAt:profile.readings.find(x=>x.clock==='RECORD')?.at??null,profile};
  });
}

export function repositoryAxisAt(event:RepositoryTemporalEvent,axis:RepositoryTemporalAxis):string|null{
  return axis==='PUBLICATION'?event.publicationAt:
    event.profile.readings.find(c=>c.clock===axis)?.at??null;
}
