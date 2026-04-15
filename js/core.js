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

function safeLoop(renderFn) {
  function loop() {
    if (running) {
      renderFn();
    }
    requestAnimationFrame(loop);
  }
  loop();
}