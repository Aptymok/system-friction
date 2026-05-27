let shuttingDown = false;

function log(message: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ service: 'sfi-worker', message, ...extra, ts: new Date().toISOString() }));
}

process.on('SIGINT', () => {
  shuttingDown = true;
  log('shutdown_requested', { signal: 'SIGINT' });
});

process.on('SIGTERM', () => {
  shuttingDown = true;
  log('shutdown_requested', { signal: 'SIGTERM' });
});

export async function workerLoop(tick: () => Promise<unknown>, intervalMs = 60_000) {
  while (!shuttingDown) {
    const startedAt = Date.now();
    await tick();
    const waitMs = Math.max(0, intervalMs - (Date.now() - startedAt));
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}
