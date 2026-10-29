import { redirect } from 'next/navigation';
// Bilingual incoming links resolve to one Spanish canonical service catalog.
export default function EnglishServicesRedirect(){redirect('/servicios');}
