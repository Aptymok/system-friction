import Link from 'next/link';
import { ObservatoryConsole } from '@/components/sfi/ObservatoryConsole';
import { ObservatoryInterpretiveFlow } from '@/components/sfi/ObservatoryInterpretiveFlow';
import './reports/reports.css';

export default function ObservatoryPage(){
  return <>
    <ObservatoryConsole/>
    <ObservatoryInterpretiveFlow/>
    <div style={{background:'#050504',padding:'0 max(5vw,28px) 54px',textAlign:'center'}}>
      <Link href="/observatory/reports" style={{display:'inline-flex',border:'1px solid rgba(222,185,117,.3)',padding:'11px 14px',color:'#cbb07f',font:'10px ui-monospace,SFMono-Regular,Menlo,monospace',letterSpacing:'.14em'}}>REPORTS · CASE PLATFORM</Link>
    </div>
  </>;
}
