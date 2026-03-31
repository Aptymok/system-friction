// PersonalContextManager.swift
// Carga y persiste el contexto personal del usuario desde/hacia Documents/sf-context.json
// El JSON define patrones, vocabulario preferido, tono y métricas históricas.
// El LLM (on-device o Railway) recibe este contexto para responder "como tú".

import Foundation

final class PersonalContextManager: ObservableObject {
    static let shared = PersonalContextManager()
    private init() { load() }

    @Published private(set) var context: PersonalContext = .empty

    // MARK: - Schema

    struct PersonalContext: Codable {
        var patterns:       [String]         = []   // patrones cognitivos recurrentes
        var vocabulary:     [String: Double] = [:]  // palabras clave → peso emocional
        var tone:           String           = "reflexivo"
        var language:       String           = "es"
        var lastIHG:        Double?          = nil
        var lastTension:    Double?          = nil
        var sessionCount:   Int              = 0
        var updatedAt:      String?          = nil

        static let empty = PersonalContext()

        /// Resumen compacto para el prompt del LLM
        var promptSummary: String {
            var parts: [String] = []
            if !patterns.isEmpty {
                parts.append("Patrones recurrentes: \(patterns.prefix(5).joined(separator: ", "))")
            }
            if let ihg = lastIHG {
                parts.append("IHG histórico: \(String(format: "%.2f", ihg))")
            }
            if tone != "reflexivo" {
                parts.append("Tono preferido: \(tone)")
            }
            return parts.isEmpty ? "" : parts.joined(separator: ". ") + "."
        }
    }

    // MARK: - Persistence

    private var fileURL: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("sf-context.json")
    }

    func load() {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return }
        do {
            let data = try Data(contentsOf: fileURL)
            context = (try? JSONDecoder().decode(PersonalContext.self, from: data)) ?? .empty
        } catch {}
    }

    func save() {
        do {
            var ctx = context
            ctx.updatedAt = ISO8601DateFormatter().string(from: Date())
            let data = try JSONEncoder().encode(ctx)
            try data.write(to: fileURL, options: .atomic)
        } catch {}
    }

    // MARK: - Learning

    /// Agrega un patrón aprendido de la sesión actual.
    func learnPattern(_ pattern: String) {
        guard !context.patterns.contains(pattern) else { return }
        context.patterns.insert(pattern, at: 0)
        context.patterns = Array(context.patterns.prefix(60))
        save()
    }

    /// Actualiza IHG histórico y contador de sesiones.
    func recordSession(snapshot: CognitiveSnapshot) {
        let ihg = snapshot.valence * (1 - snapshot.tension)
        context.lastIHG     = ihg
        context.lastTension = snapshot.tension
        context.sessionCount += 1
        save()
    }

    /// Actualiza el vocabulario emocional a partir del texto de una sesión.
    func updateVocabulary(from text: String, weight: Double) {
        let words = text.lowercased()
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { $0.count > 4 }
        for w in words {
            context.vocabulary[w] = (context.vocabulary[w] ?? 0) * 0.8 + weight * 0.2
        }
        // Prune low-weight entries
        context.vocabulary = context.vocabulary.filter { $0.value > 0.05 }
        save()
    }

    /// Exporta el JSON para revisión manual.
    func export() -> Data? {
        try? JSONEncoder().encode(context)
    }

    /// Reemplaza el contexto completo con un JSON importado.
    func importJSON(_ data: Data) {
        if let ctx = try? JSONDecoder().decode(PersonalContext.self, from: data) {
            context = ctx
            save()
        }
    }
}
