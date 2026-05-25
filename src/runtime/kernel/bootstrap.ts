import { scanRoutes, healRoutes, loadKernelState } from "@/experimental/kernel/metaKernel";

// LISTA BASE (actualiza según tu estructura real de API)
const EXPECTED_ROUTES = [
  "/actions",
  "/amv",
  "/audit",
  "/cron",
  "/node",
  "/telemetry",
  "/webhooks",
  "/whatsapp",
];

// GENERADOR AUTO-RECONSTRUCTOR
function routeGenerator() {
  return EXPECTED_ROUTES;
}

// LOOP DE AUTO-REPARACIÓN
export async function bootstrapSelfHealing() {
  console.log("[KERNEL] bootstrapping self-healing layer");

  // Cargar estado previo si existe
  await loadKernelState();

  // scan inicial
  await scanRoutes(EXPECTED_ROUTES);

  // ciclo continuo
  setInterval(() => {
    void healRoutes(routeGenerator);
  }, 5000);
}
