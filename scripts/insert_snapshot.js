import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PUBLIC_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const payloadRaw = fs.readFileSync('world_payload.json', 'utf8');
const body = JSON.parse(payloadRaw);

(async () => {
  try {
    const wsi = Number(body.wsi);
    const nti = Number(body.nti);
    const sources = body.sources;
    const observed_at = body.ts;

    const { data, error } = await supabase
      .from('worldspect_snapshots')
      .insert([{ wsi, nti, sources, observed_at, raw_payload: body, ingest_mode: 'manual_debug', snapshot_hash: 'debug_local' }])
      .select('*');

    if (error) {
      console.error('Supabase insert error:', error);
      process.exit(3);
    }

    console.log('Inserted row:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Exception:', e);
    process.exit(4);
  }
})();
