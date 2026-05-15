let frictionLog: any[] = [];

export function recordFriction(event: any) {
  frictionLog.push({
    ...event,
    timestamp: Date.now(),
  });

  // compresión
  if (frictionLog.length > 500) {
    frictionLog = frictionLog.slice(-250);
  }
}

export function getFriction() {
  return frictionLog;
}