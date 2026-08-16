import type { Metadata } from 'next';
import { WorldFieldObservatory } from '@/components/field/map/WorldFieldObservatory';
import styles from './field-map-layout.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Campo Mundial · señales localizadas · SFI',
  description: 'Exploración localizada de señales, eventos y tensiones observadas por System Friction Institute.',
};

export default function FieldMapPage() {
  return <main className="min-h-screen bg-transparent"><div data-sfi-field-anchor="world-map" className={styles.safeFieldMap}><WorldFieldObservatory /></div></main>;
}
