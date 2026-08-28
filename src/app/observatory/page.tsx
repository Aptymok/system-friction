import Link from 'next/link';
import { ObservatoryConsole } from '@/components/sfi/ObservatoryConsole';
import { ObservatoryProvenanceFeed } from '@/components/sfi/ObservatoryProvenanceFeed';
import './reports/reports.css';

export default function ObservatoryPage(){
  return <>
    <ObservatoryConsole/>
    <ObservatoryProvenanceFeed/>
    <Link className="obsReportsDock" href="/observatory/reports">REPORTS · CASE PLATFORM</Link>
  </>;
}
