import { scanRoutes, healRoutes, loadKernelState } from "./metaKernel";

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
export function bootstrapSelfHealing() {
  console.log("[KERNEL] bootstrapping self-healing layer");

  // Cargar estado previo si existe
  loadKernelState();

  // scan inicial
  scanRoutes(EXPECTED_ROUTES);

  // ciclo continuo
  setInterval(() => {
    healRoutes(routeGenerator);
  }, 5000);
}
