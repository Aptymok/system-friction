export function regulateSystem(state: any) {
  if (state.divergence > 0.85) {
    return {
      phase: "protected",
      throttle: 0.3,
      disable: ["social", "amv"],
    };
  }

  if (state.divergence > 0.6) {
    return {
      phase: "degraded",
      throttle: 0.6,
      disable: ["social"],
    };
  }

  return {
    phase: "active",
    throttle: 1,
    disable: [],
  };
}