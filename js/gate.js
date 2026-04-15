(function() {
  const SYSTEM = window.SystemState;

  class CustomModal {
    static requestEmail() {
      return new Promise((resolve) => {
        const existingDialog = document.getElementById("sf-email-dialog");
        if (existingDialog) {
          existingDialog.remove();
        }

        const overlay = document.createElement("div");
        overlay.id = "sf-email-dialog";
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.background = "rgba(0,0,0,0.9)";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.zIndex = "99999";
        overlay.style.padding = "24px";

        const card = document.createElement("div");
        card.style.width = "100%";
        card.style.maxWidth = "420px";
        card.style.background = "#0c0c0c";
        card.style.border = "1px solid rgba(255,255,255,.08)";
        card.style.borderRadius = "18px";
        card.style.padding = "28px";
        card.style.boxShadow = "0 24px 80px rgba(0,0,0,0.45)";
        card.style.color = "#f5f5f5";
        card.style.fontFamily = "IBM Plex Mono, monospace";
        card.style.overflow = "hidden";

        const title = document.createElement("div");
        title.textContent = "Acceso seguro";
        title.style.fontSize = "18px";
        title.style.fontWeight = "600";
        title.style.marginBottom = "16px";

        const subtitle = document.createElement("div");
        subtitle.textContent = "Ingresa tu email para continuar hacia el MOP-H.";
        subtitle.style.fontSize = "13px";
        subtitle.style.color = "rgba(255,255,255,.72)";
        subtitle.style.marginBottom = "20px";

        const input = document.createElement("input");
        input.type = "email";
        input.placeholder = "tu@correo.com";
        input.style.width = "100%";
        input.style.padding = "14px 16px";
        input.style.fontSize = "16px";
        input.style.border = "1px solid rgba(255,255,255,.12)";
        input.style.borderRadius = "12px";
        input.style.background = "rgba(255,255,255,.05)";
        input.style.color = "#ffffff";
        input.style.marginBottom = "20px";
        input.style.outline = "none";
        input.autocomplete = "email";
        input.autocapitalize = "none";
        input.spellcheck = false;

        const buttonRow = document.createElement("div");
        buttonRow.style.display = "flex";
        buttonRow.style.gap = "12px";
        buttonRow.style.justifyContent = "flex-end";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.textContent = "Cancelar";
        cancelButton.style.border = "1px solid rgba(255,255,255,.16)";
        cancelButton.style.background = "transparent";
        cancelButton.style.color = "#ffffff";
        cancelButton.style.padding = "12px 18px";
        cancelButton.style.borderRadius = "12px";
        cancelButton.style.cursor = "pointer";
        cancelButton.style.fontSize = "14px";

        const submitButton = document.createElement("button");
        submitButton.type = "button";
        submitButton.textContent = "Ingresar";
        submitButton.style.border = "none";
        submitButton.style.background = "#e6ff00";
        submitButton.style.color = "#0a0a0a";
        submitButton.style.padding = "12px 18px";
        submitButton.style.borderRadius = "12px";
        submitButton.style.cursor = "pointer";
        submitButton.style.fontSize = "14px";
        submitButton.style.fontWeight = "700";

        buttonRow.append(cancelButton, submitButton);
        card.append(title, subtitle, input, buttonRow);
        overlay.append(card);
        document.body.appendChild(overlay);
        input.focus();

        function cleanup() {
          document.body.removeChild(overlay);
          document.removeEventListener("keydown", onKeyDown);
        }

        function onKeyDown(event) {
          if (event.key === "Escape") {
            cleanup();
            resolve(null);
          }
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }

        function submit() {
          const value = input.value.trim();
          if (!value || !value.includes("@")) {
            input.style.borderColor = "#e85a4f";
            return;
          }
          cleanup();
          resolve(value);
        }

        cancelButton.addEventListener("click", () => {
          cleanup();
          resolve(null);
        });

        submitButton.addEventListener("click", submit);
        document.addEventListener("keydown", onKeyDown);
      });
    }
  }

  async function requireEmailGate(onSuccess) {
    const existingEmail = SYSTEM.get("email");

    if (existingEmail) {
      console.log("[SF] Gate passed (existing)");
      onSuccess();
      return;
    }

    track("gate_shown");

    const email = await CustomModal.requestEmail();
    if (!email) {
      console.log("[SF] Gate canceled");
      return;
    }

    SYSTEM.update({ email });
    console.log("[SF] Email captured:", email);

    const signal = updateSignalLabel();
    SYSTEM.update({ signal });

    if (/gmail|yahoo|hotmail/i.test(email)) {
      track("low_intent_email", { signal });
    } else {
      track("high_intent_email", { signal });
    }

    track("email_captured", { signal });

    fetch("https://formspree.io/f/xgopjkop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        email,
        profile: SYSTEM.get("profile"),
        role: SYSTEM.get("role"),
        signal,
        timestamp: new Date().toISOString(),
        action: "gate_passed"
      })
    }).then(() => console.log("[SF] Email sent")).catch(() => console.log("[SF] Email send failed"));

    onSuccess();
  }

  // Expose to global for access from other scripts
  window.CustomModal = CustomModal;
  window.requireEmailGate = requireEmailGate;
})();
