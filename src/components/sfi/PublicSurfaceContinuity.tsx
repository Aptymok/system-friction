'use client';

import Link from 'next/link';
import './PublicSurfaceContinuity.css';

type PublicSurfaceContinuityProps={
  scene:string;
  number:string;
  label:string;
  previous?:{href:string;label:string};
  next?:{href:string;label:string};
};

export function PublicSurfaceContinuity({scene,number,label,previous,next}:PublicSurfaceContinuityProps){
  return <div className="sfiJourneyContinuity" data-scene={scene} aria-label="Public journey continuity">
    <Link className="sfiJourneyContinuityHome" href="/">
      <span>SFI</span>
      <b>RETURN TO JOURNEY</b>
    </Link>
    <div className="sfiJourneyContinuityState">
      <small>PUBLIC SURFACE</small>
      <strong>{number} · {label}</strong>
    </div>
    <nav aria-label="Adjacent public scenes">
      {previous?<Link href={previous.href}>← {previous.label}</Link>:<span/>}
      {next?<Link href={next.href}>{next.label} →</Link>:<span/>}
    </nav>
  </div>;
}
