let running = true;
const SYSTEM = window.SystemState;

document.addEventListener("visibilitychange", () => {
  running = !document.hidden;
});

const EVENT_WEIGHTS = {
  page_view: 1,
  cta_click: 3,
  gate_shown: 5,
  email_captured: 10,
  moph_start: 15,
  moph_complete: 30,
  observatory_unlocked: 8
};

const ROLE_WEIGHTS = {
  operator: 1,
  manager: 1.5,
  director: 2,
  founder: 2.5
};

function getHistory() {
  return SYSTEM.get("history") || [];
}

function updateUserScore(event) {
  const baseScore = EVENT_WEIGHTS[event] || 0;
  const role = SYSTEM.get("role") || "operator";
  const roleMultiplier = ROLE_WEIGHTS[role] || 1;
  let adjustedScore = Math.round(baseScore * roleMultiplier);

  if (event === "cta_click") {
    const history = getHistory();
    const recent = history.slice(-5).map(item => item.event);
    if (recent.length === 5 && recent.every(name => name === "cta_click")) {
      adjustedScore = 0;
      SYSTEM.update({ signal: "noise" });
    }
  }

  if (event === "email_captured") {
    const sessionStart = SYSTEM.get("session_start") || Date.now();
    if (Date.now() - sessionStart <= 60000) {
      adjustedScore *= 3;
      SYSTEM.update({ signal: "fast_intent" });
    }
  }

  const score = (SYSTEM.get("score") || 0) + adjustedScore;
  SYSTEM.set("score", score);
  return score;
}

function logEventHistory(event) {
  SYSTEM.pushEvent(event);
}

function evaluateSignal() {
  const history = getHistory();
  const role = SYSTEM.get("role");
  const score = SYSTEM.get("score") || 0;
  const events = history.map(e => e.event);
  const activity = events.length;
  const decisionIndex = events.indexOf("email_captured");
  const conversionOccurred = decisionIndex !== -1;

  if (activity > 10 && !conversionOccurred) {
    return "noise";
  }
  if (conversionOccurred && decisionIndex < 3) {
    return "fast_intent";
  }
  if (role && role !== "unknown" && score < 5) {
    return "low_confidence_identity";
  }
  if (conversionOccurred && activity > 3) {
    return "normal";
  }
  if (!conversionOccurred && activity > 0) {
    return "exploring";
  }
  return "initial";
}

function updateSignalLabel() {
  const label = evaluateSignal();
  SYSTEM.set("signal", label);
  return label;
}

function track(event, data = {}) {
  const score = updateUserScore(event);
  logEventHistory(event);
  const signal = updateSignalLabel();

  if (event === "email_captured") {
    const email = SYSTEM.get("email") || "";
    if (email && !/gmail|yahoo|hotmail/i.test(email)) {
      SYSTEM.set("priority", "high");
    }
  }

  const payload = {
    event,
    profile: SYSTEM.get("profile"),
    email: SYSTEM.get("email"),
    role: SYSTEM.get("role") || "unknown",
    priority: SYSTEM.get("priority") || "normal",
    signal,
    path: window.location.pathname,
    timestamp: Date.now(),
    weight: EVENT_WEIGHTS[event] || 0,
    score,
    ...data
  };

  console.log("[TRACK]", payload);

  fetch("https://formspree.io/f/xgopjkop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => {
    console.warn("[TRACK] failed to send", event);
  });
}

let startTime = Date.now();
window.addEventListener("beforeunload", () => {
  const duration = Date.now() - startTime;
  const role = SYSTEM.get("role");

  if (role === "director" && duration < 15000) {
    SYSTEM.set("low_confidence_identity", true);
  }

  if (duration < 5000 && (SYSTEM.get("score") || 0) < 5) {
    track("low_quality_session", { duration });
  } else {
    track("session_end", { duration });
  }
});

track("page_view");
