// Compatibility for existing clients saved with /authentication instead of
// /authenticated. New clients should use that canonical URL.
// Reuse the canonical handlers and every authorization gate.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export { GET, POST } from '../authenticated/route';
