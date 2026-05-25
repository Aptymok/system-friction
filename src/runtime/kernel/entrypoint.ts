import { systemTick } from "./systemTick";

export async function handleEvent(event: any, metrics: any) {
  const result = await systemTick(metrics, async (job: any) => {
    // fallback executor (no mover lógica aquí)
    return job;
  });
  return result;
}
