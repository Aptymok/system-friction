import { SFI_CANONICAL_CAPABILITIES } from "./canonicalCapabilities";

export type CapabilityStatus =
  | "missing"
  | "partial"
  | "implemented";

export function getCanonicalCapabilities() {
  return SFI_CANONICAL_CAPABILITIES;
}

export function getCapabilityById(id: string) {
  return SFI_CANONICAL_CAPABILITIES.find(
    capability => capability.id === id
  ) ?? null;
}

export function getCapabilitiesByStatus(
  status: CapabilityStatus
) {
  return SFI_CANONICAL_CAPABILITIES.filter(
    capability => capability.status === status
  );
}

export function getCapabilitySummary() {
  const total = SFI_CANONICAL_CAPABILITIES.length;

  const implemented =
    getCapabilitiesByStatus("implemented").length;

  const partial =
    getCapabilitiesByStatus("partial").length;

  const missing =
    getCapabilitiesByStatus("missing").length;

  return {
    total,
    implemented,
    partial,
    missing
  };
}