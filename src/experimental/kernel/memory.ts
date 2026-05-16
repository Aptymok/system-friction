let memory: any[] = [];

export function storeMemory(entry: any) {
  memory.push({
    ...entry,
    timestamp: Date.now(),
  });

  if (memory.length > 1000) {
    memory = memory.slice(-500); // compresión
  }
}

export function getMemory() {
  return memory;
}