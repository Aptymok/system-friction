function requireEmailGate(onSuccess) {
  const existing = localStorage.getItem("sf_email");

  if (existing) {
    console.log("[SF] Gate passed (existing)");
    onSuccess();
    return;
  }

  const email = prompt("Ingresa tu email para continuar:");

  if (email && email.includes("@")) {
    localStorage.setItem("sf_email", email);
    console.log("[SF] Email captured:", email);

    // Send to Formspree
    fetch("https://formspree.io/f/xgopjkop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        email: email,
        profile: localStorage.getItem("sf_profile"),
        timestamp: new Date().toISOString(),
        action: "gate_passed"
      })
    }).then(() => console.log("[SF] Email sent")).catch(() => console.log("[SF] Email send failed"));

    onSuccess();
  } else {
    alert("Acceso no habilitado.");
  }
}