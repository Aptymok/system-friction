import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const WORLD_FIELD_RUNTIME = '/field/world-observatory/index.html?v=20260802.1923';

export default function FieldMapPage() {
  redirect(WORLD_FIELD_RUNTIME);
}
