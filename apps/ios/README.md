# SystemFriction iOS App

**Plataforma:** iOS 17+ (SwiftUI)

## Setup

1. Abre `SystemFriction.xcodeproj` en Xcode 15+
2. Selecciona target `SystemFriction`
3. Compila y corre en simulador o dispositivo

## Módulos

- `Capture/` — Speech STT, Vision landmarks, SoundAnalysis
- `Engine/` — Wrapper del motor sf-engine (via URLSession al proxy, o lógica local portada)
- `Agents/` — Debate APTYMOK local
- `UI/` — Dashboard, Salón Eidelon, Laboratorio (SwiftUI)
- `Core/` — Tipos Swift: CognitiveSnapshot, Scenario, ActionPlan, TickGoal

## Fases iOS

- **Fase F**: Captura cognitiva multimodal (Speech/Vision/SoundAnalysis)
- **Fase G**: UI completa (Dashboard + Salón + Laboratorio)
