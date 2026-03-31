// NarrativeEngine.swift — Generador de narrativa para Sala Eidolón
//
// Prioridad de fuentes:
//   1. Apple Foundation Models (on-device, iOS 18.4+, sin red)
//   2. Railway backend /api/llm/narrative (Groq LLaMA-3.1, requiere red)
//   3. Heurística local (siempre disponible, offline total)
//
// El contexto personal (PersonalContextManager) se inyecta en todos los caminos.

import Foundation
import NaturalLanguage

// Importación condicional: FoundationModels es iOS 18.4+
#if canImport(FoundationModels)
import FoundationModels
#endif

@MainActor
final class NarrativeEngine: ObservableObject {
    static let shared = NarrativeEngine()
    private init() {}

    @Published var isGenerating = false
    @Published var lastSource: NarrativeSource = .none

    enum NarrativeSource: String {
        case none       = "—"
        case onDevice   = "ON-DEVICE"
        case railway    = "RAILWAY"
        case local      = "LOCAL"
    }

    // MARK: - Public API

    func generate(
        userText:    String,
        snapshot:    CognitiveSnapshot,
        history:     [SalonViewModel.ChatMessage] = []
    ) async -> String {
        isGenerating = true
        defer { isGenerating = false }

        let ctx  = PersonalContextManager.shared.context
        let ihg  = snapshot.valence * (1 - snapshot.tension)
        let nti  = snapshot.tension

        // 1 ── On-device LLM (iOS 18.4+, offline)
        #if canImport(FoundationModels)
        if #available(iOS 18.4, *) {
            if let result = await onDeviceResponse(
                userText: userText, snapshot: snapshot, context: ctx, history: history
            ) {
                lastSource = .onDevice
                learn(text: userText, ihg: ihg, snapshot: snapshot)
                return result
            }
        }
        #endif

        // 2 ── Railway (Groq LLaMA-3.1, requires network)
        if let result = await RailwayClient.shared.fetchNarrative(
            userText: userText,
            snapshot: snapshot,
            personalContext: ctx.promptSummary
        ) {
            lastSource = .railway
            learn(text: userText, ihg: ihg, snapshot: snapshot)
            return result
        }

        // 3 ── Local heuristic (always available)
        lastSource = .local
        return localResponse(userText: userText, ihg: ihg, nti: nti, focus: snapshot.focus, ctx: ctx)
    }

    // MARK: - On-device (FoundationModels)

    #if canImport(FoundationModels)
    @available(iOS 18.4, *)
    private func onDeviceResponse(
        userText:  String,
        snapshot:  CognitiveSnapshot,
        context:   PersonalContextManager.PersonalContext,
        history:   [SalonViewModel.ChatMessage]
    ) async -> String? {
        let ihg = snapshot.valence * (1 - snapshot.tension)

        // Build rich system prompt from personal context + MIHM state
        let systemPrompt = """
        Eres Eidolón, asistente de autoconocimiento cognitivo basado en el motor MIHM Personal.
        Respondes en español, de forma empática y precisa, integrando los datos del sistema.

        Estado MIHM actual:
          IHG = \(String(format: "%.2f", ihg)) (homeostasis global, rango -1→1)
          Tensión = \(String(format: "%.2f", snapshot.tension))
          Foco = \(String(format: "%.2f", snapshot.focus))
          Activación = \(String(format: "%.2f", snapshot.arousal))

        \(context.promptSummary.isEmpty ? "" : "Contexto del usuario: \(context.promptSummary)")

        Responde en 2-3 oraciones máximo, usando los datos anteriores de forma natural.
        No menciones que eres un LLM. No inventes métricas.
        """

        // Include last 3 history turns for continuity
        let recentHistory = history.suffix(6).map { msg -> String in
            let role = msg.role == .user ? "Usuario" : "Eidolón"
            return "\(role): \(msg.content)"
        }.joined(separator: "\n")

        let fullPrompt = recentHistory.isEmpty
            ? userText
            : "\(recentHistory)\nUsuario: \(userText)"

        do {
            let session = LanguageModelSession(instructions: systemPrompt)
            let response = try await session.respond(to: fullPrompt)
            return response.content.trimmingCharacters(in: .whitespacesAndNewlines)
        } catch {
            return nil  // fall through to Railway
        }
    }
    #endif

    // MARK: - Local heuristic (offline fallback)

    private func localResponse(
        userText: String,
        ihg:     Double,
        nti:     Double,
        focus:   Double,
        ctx:     PersonalContextManager.PersonalContext
    ) -> String {
        let lower = userText.lowercased()

        // Use NLTagger for basic sentiment detection
        let tagger = NLTagger(tagSchemes: [.sentimentScore])
        tagger.string = userText
        var sentiment: Double = 0
        tagger.enumerateTags(in: userText.startIndex..<userText.endIndex,
                              unit: .paragraph, scheme: .sentimentScore) { tag, _ in
            sentiment = Double(tag?.rawValue ?? "0") ?? 0
            return false
        }

        // Greeting / state check
        if lower.contains("cómo") || lower.contains("como") || lower.contains("estado") {
            return ihg > 0.3
                ? "Tu homeostasis está en IHG=\(fmt(ihg)). "
                  + (nti > 0.5 ? "La tensión (\(fmt(nti))) es elevada — una pausa activa puede ayudar."
                               : "El sistema está equilibrado.")
                : "IHG=\(fmt(ihg)) indica tensión acumulada. R=\(fmt(focus)) es tu capacidad de recuperación actual."
        }

        // Plan / action
        if lower.contains("plan") || lower.contains("hacer") || lower.contains("acción") {
            return focus > 0.6
                ? "Con foco=\(fmt(focus)), tu sistema está listo para tareas complejas. Aprovecha esta ventana."
                : "Foco actual es \(fmt(focus)). Te recomiendo micro-acciones de bajo costo cognitivo primero."
        }

        // Pattern mention
        if !ctx.patterns.isEmpty && ctx.patterns.contains(where: { lower.contains($0.lowercased()) }) {
            let p = ctx.patterns.first { lower.contains($0.lowercased()) }!
            return "Detecto el patrón '\(p)' en tu mensaje. Históricamente correlaciona con IHG≈\(fmt(ctx.lastIHG ?? ihg))."
        }

        // Sentiment-based
        if sentiment < -0.3 {
            return "Noto tensión en tu mensaje. NTI=\(fmt(nti)), R=\(fmt(focus)). ¿Qué parte de esto está fuera de tu control?"
        }
        if sentiment > 0.3 {
            return "Estado positivo detectado. IHG=\(fmt(ihg)). Es buen momento para avanzar en objetivos de alta prioridad."
        }

        return "IHG=\(fmt(ihg)), tensión=\(fmt(nti)). ¿Quieres explorar qué está generando esa dinámica?"
    }

    // MARK: - Learning

    private func learn(text: String, ihg: Double, snapshot: CognitiveSnapshot) {
        let mgr = PersonalContextManager.shared
        mgr.recordSession(snapshot: snapshot)

        // Detect patterns from NLTagger named entities
        let tagger = NLTagger(tagSchemes: [.nameType])
        tagger.string = text
        tagger.enumerateTags(in: text.startIndex..<text.endIndex,
                              unit: .word, scheme: .nameType, options: [.omitWhitespace]) { tag, range in
            if tag != nil {
                mgr.learnPattern(String(text[range]))
            }
            return true
        }

        // Vocabulary weight = |sentiment|
        let weight = abs(snapshot.valence)
        mgr.updateVocabulary(from: text, weight: weight)
    }

    // MARK: - Helpers

    private func fmt(_ v: Double) -> String { String(format: "%.2f", v) }
}
