let running = true;

document.addEventListener("visibilitychange", () => {
  running = !document.hidden;
});

// Profile detection
let profile = 'unknown';
if (window.location.pathname.includes('simulation') || window.location.pathname.includes('flujo')) {
  profile = 'technical';
} else if (window.location.pathname.includes('sistema') || window.location.pathname.includes('mop-h')) {
  profile = 'executive';
} else if (window.location.pathname.includes('casos') || window.location.pathname.includes('contact')) {
  profile = 'engaged';
}
localStorage.setItem("sf_profile", profile);

// Role detection from URL param or localStorage
const urlParams = new URLSearchParams(window.location.search);
const urlRole = urlParams.get("role");
if (urlRole && ["operator", "manager", "director", "founder"].includes(urlRole)) {
  localStorage.setItem("sf_role", urlRole);
}

function safeLoop(renderFn) {
  function loop() {
    if (running) {
      renderFn();
    }
    requestAnimationFrame(loop);
  }
  loop();
}

// Instrumentation
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

function updateUserScore(event) {
  const weights = {
    page_view: 1,
    cta_click: 3,
    email_captured: 10,
    moph_complete: 30
  };

  let score = parseInt(localStorage.getItem("sf_score") || "0");
  const baseScore = weights[event] || 0;
  const role = localStorage.getItem("sf_role") || "operator";
  const roleMultiplier = ROLE_WEIGHTS[role] || 1;
  const adjustedScore = Math.round(baseScore * roleMultiplier);
  
  score += adjustedScore;

  localStorage.setItem("sf_score", score);

  return score;
}

function logEventHistory(event) {
  let history = JSON.parse(localStorage.getItem("sf_history") || "[]");
  history.push({ event, time: Date.now() });

  localStorage.setItem("sf_history", JSON.stringify(history));
}

function evaluateSignal() {
  const history = JSON.parse(localStorage.getItem("sf_history") || "[]");
  const role = localStorage.getItem("sf_role");
  const score = parseInt(localStorage.getItem("sf_score") || "0");

  const events = history.map(e => e.event);
  const activity = events.length;
  const decisionIndex = events.indexOf("email_captured");
  const conversionOccurred = decisionIndex !== -1;

  // Pattern 1: High activity without conversion = Noise
  if (activity > 10 && !conversionOccurred) {
    return "noise";
  }

  // Pattern 2: Early conversion = Fast intent (decision maker)
  if (conversionOccurred && decisionIndex < 3) {
    return "fast_intent";
  }

  // Pattern 3: Role declared but minimal activity = Incoherent signal
  if (role && role !== "unknown" && score < 5) {
    return "low_confidence_identity";
  }

  // Pattern 4: Conversion exists + medium activity = Normal user
  if (conversionOccurred && activity > 3) {
    return "normal";
  }

  // Pattern 5: No conversion yet but some activity = Exploring
  if (!conversionOccurred && activity > 0) {
    return "exploring";
  }

  // Default: Fresh visitor
  return "initial";
}

function updateSignalLabel() {
  const label = evaluateSignal();
  localStorage.setItem("sf_signal", label);
  return label;
}

function track(event, data = {}) {
  const score = updateUserScore(event);
  logEventHistory(event);
  const signal = updateSignalLabel();

  // Detect valuable silent user on email capture
  if (event === "email_captured") {
    const email = localStorage.getItem("sf_email");
    if (email && !email.includes("gmail") && !email.includes("yahoo") && !email.includes("hotmail")) {
      localStorage.setItem("sf_priority", "high");
    }
  }

  // Detect explorer pattern
  if (event === "session_end") {
    const history = JSON.parse(localStorage.getItem("sf_history") || "[]");
    const emailCaptured = history.find(e => e.event === "email_captured");
    if (score > 20 && !emailCaptured) {
      track("high_activity_low_conversion", data);
    }
  }

  const payload = {
    event,
    profile: localStorage.getItem("sf_profile"),
    email: localStorage.getItem("sf_email"),
    role: localStorage.getItem("sf_role") || "unknown",
    priority: localStorage.getItem("sf_priority") || "normal",
    signal: signal,
    path: window.location.pathname,
    timestamp: Date.now(),
    weight: EVENT_WEIGHTS[event] || 0,
    score: score,
    ...data
  };

  console.log("[TRACK]", payload);

  fetch("https://formspree.io/f/xgopjkop", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });
}

// Session tracking
let startTime = Date.now();
window.addEventListener("beforeunload", () => {
  const duration = Date.now() - startTime;
  const score = localStorage.getItem("sf_score");

  if (duration < 5000 && score < 5) {
    track("low_quality_session", { duration });
  } else {
    track("session_end", { duration });
  }
});

// Page view
track("page_view");