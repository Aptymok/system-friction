import { NextResponse } from 'next/server';
import { getOperationalMemory, logOperationalEvent } from '@/observatory/operational/storage';

export async function GET() {
  const now = Date.now();
  const due = getOperationalMemory().calendars.filter((item) => item.status === 'accepted' && new Date(item.scheduledFor).getTime() <= now);
  const jobs = due.map((item) => ({
    calendarId: item.id,
    prompt: item.prompt,
    material: item.material,
    approvalRequired: true,
  }));

  if (jobs.length) {
    logOperationalEvent('cron_agent_wake', { jobs });
  }

  return NextResponse.json({
    success: true,
    jobs,
    publishBlocked: true,
  });
}
