(function () {
  const SYSTEM = window.SystemState;
  if (!SYSTEM) {
    console.warn("SystemState unavailable in router");
    return;
  }

  const path = window.location.pathname;
  let profile = "explorer";

  if (path.includes("simulation") || path.includes("flujo")) profile = "technical";
  else if (path.includes("sistema") || path.includes("mop-h")) profile = "executive";
  else if (path.includes("casos") || path.includes("contact")) profile = "engaged";

  SYSTEM.set("profile", profile);

  const params = new URLSearchParams(window.location.search);
  const urlRole = params.get("role");
  if (urlRole && ["operator", "manager", "director", "founder"].includes(urlRole)) {
    SYSTEM.set("role", urlRole);
  }

  if (!SYSTEM.get("session_start")) {
    SYSTEM.set("session_start", Date.now());
  }

  function routeToStep(step) {
    if (!step || typeof window.mostrarQ !== "function") {
      return;
    }
    window.mostrarQ(Number(step));
  }

  window.pushFormStep = function (step) {
    if (typeof step !== "number" || Number.isNaN(step)) {
      return;
    }
    history.pushState({ step }, "", `?step=${step}`);
  };

  window.addEventListener("popstate", (event) => {
    if (event.state && typeof event.state.step !== "undefined") {
      routeToStep(event.state.step);
    }
  });

  window.addEventListener("DOMContentLoaded", () => {
    const initialStep = parseInt(new URLSearchParams(window.location.search).get("step"), 10);
    if (!Number.isNaN(initialStep)) {
      routeToStep(initialStep);
    }
  });
})();
