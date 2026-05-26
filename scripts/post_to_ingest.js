const fs = require('fs');

const url = process.env.INGEST_URL || 'http://localhost:3000/api/worldspect/ingest-payload';
const AUTH = process.env.INGEST_AUTH || 'Bearer sf_ingest_prod_99f2b8a7c1e04';

const body = fs.readFileSync('world_payload.json');

(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AUTH
      },
      body
    });
    console.log('STATUS', res.status);
    const txt = await res.text();
    console.log('BODY:', txt);
  } catch (e) {
    console.error('ERROR', e);
    process.exit(2);
  }
})();
