import { randomUUID } from "crypto";

import { runKernelCycle } from "./kernelCycle";

export async function startKernel() {

  return runKernelCycle({

    cycleId: randomUUID(),

    logbookId: randomUUID(),

    initialEvent: "SFI_TASK_CREATED"

  });

}