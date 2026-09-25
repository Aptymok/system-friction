'use client';

import Link from 'next/link';
import './PublicSurfaceBridge.css';

type PublicSurfaceBridgeProps={
  scene:string;
  number:string;
  label:string;
  previous?:{href:string;label:string};
  next?:{href:string;label:string};
};

export function PublicSurfaceBridge({scene,number,label,previous,next}:PublicSurfaceBridgeProps){
  return <div className="sfiJourneyBridge" data-scene={scene} aria-label="Public journey continuity">
    <Link className="sfiJourneyBridgeHome" href="/">
      <span>SFI</span>
      <b>RETURN TO JOURNEY</b>
    </Link>
    <div className="sfiJourneyBridgeState">
      <small>PUBLIC SURFACE</small>
      <strong>{number} · {label}</strong>
    </div>
    <nav aria-label="Adjacent public scenes">
      {previous?<Link href={previous.href}>← {previous.label}</Link>:<span/>}
      {next?<Link href={next.href}>{next.label} →</Link>:<span/>}
    </nav>
  </div>;
}
