# System Friction — Hardening Plan

## Core Changes

### 1. Mobile Stability
- Add viewport meta tag
- Remove fixed canvas overflow
- Use flex/grid instead of absolute positioning

### 2. Value Gating
- Introduce email gate before full results
- Partial render of diagnostics

### 3. Routing
- /index.html → landing only
- /sistema.html → executive path
- /simulation.html → technical path

### 4. JS Protection
- Move critical data out of static JS
- Lazy load JSON fragments

### 5. UI Fixes
- Remove placeholders
- Add progress indicators

---

## Example Fix (HEAD)

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

```css
body {
  overflow-x: hidden;
}
canvas {
  max-width: 100%;
  height: auto;
}
```

---

## Conversion Layer

- Step 1: 3-question diagnostic
- Step 2: partial result
- Step 3: email capture
- Step 4: full system

---

## Principle

Do not expose full system without signal capture.
