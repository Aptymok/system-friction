import { SFI_CANONICAL_OBJECT_REGISTRY, canonicalPublicationDisposition } from '@/lib/discovery/canonicalObjectRegistry';
import { readPublicWorldSnapshotTimeline } from '@/lib/observatory/public/worldSnapshotTimeline';
import { OperationalTimeline, type TimelineItem } from '@/components/sfi/OperationalTimeline';

export const dynamic='force-dynamic';
export const metadata={title:'Recorded Timeline | System Friction Institute',description:'Dated public canonical registry and persistent WorldSpect snapshots with provenance, time basis and explicit missing coverage.'};

export default async function TimelinePage(){
  const institution:TimelineItem[]=SFI_CANONICAL_OBJECT_REGISTRY
    .filter(record=>canonicalPublicationDisposition(record).disposition==='PUBLISH')
    .filter(record=>Boolean(record.updatedAt)&&Number.isFinite(Date.parse(record.updatedAt)))
    .map(record=>({
      id:'registry:'+record.id,at:record.updatedAt,lane:'INSTITUTION' as const,
      title:record.title,subtitle:record.summary,origin:'CANONICAL PUBLIC REGISTRY',
      state:record.epistemicState,href:'/repository?object='+encodeURIComponent(record.slug),
    }));
  let world:TimelineItem[]=[];
  let worldReadPlane='UNAVAILABLE';
  try{
    const history=await readPublicWorldSnapshotTimeline();
    worldReadPlane=history.readPlane;
    world=history.frames.map((frame,index)=>({
      id:'worldspect:'+frame.observedAt+':'+index,at:frame.observedAt,lane:'WORLD' as const,
      title:'WorldSpect observation frame',subtitle:'Persisted longitudinal observation; snapshot is not an independent world event.',
      origin:'WORLDSPECT PUBLIC HISTORY',state:frame.sourceState+' · '+frame.ingestMode,
      href:'/observatory?lens=trajectory&focus=timeline',
      world:{wsi:frame.wsi,nti:frame.nti,confidence:frame.confidence,vectors:frame.vectors},
    }));
  }catch{
    // Historical unavailability must remain visible, not replaced by synthetic frames.
  }
  return <OperationalTimeline items={[...institution,...world]} worldReadPlane={worldReadPlane}/>;
}
