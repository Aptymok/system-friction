type JobStatus = "pending" | "running" | "done" | "failed";

type Job = {
  id: string;
  executeAt: number;
  status: JobStatus;
  payload: any;
  retries: number;
};

const JOBS: Job[] = [];

export function schedule(job: Job) {
  JOBS.push(job);
}

export function tickScheduler(executor: (job: Job) => Promise<void>) {
  const now = Date.now();

  for (const job of JOBS) {
    if (job.status !== "pending") continue;
    if (job.executeAt > now) continue;

    job.status = "running";

    executor(job)
      .then(() => (job.status = "done"))
      .catch(() => {
        job.retries++;
        job.status = job.retries > 3 ? "failed" : "pending";
      });
  }
}