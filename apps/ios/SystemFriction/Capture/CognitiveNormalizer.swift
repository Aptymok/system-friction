// CognitiveNormalizer.swift — Normalizador multimodal
// Convierte (texto + voz + cara + audio) → CognitiveSnapshot

import Foundation

/// Convierte datos capturados de múltiples modalidades en un CognitiveSnapshot.
/// Este es el punto de entrada para el motor sf-engine.
struct CognitiveNormalizer {

    // MARK: - Entrada principal

    struct MultimodalInput {
        var text: String
        var faceData: FaceData?
        var audioData: AudioData?
        /// Sentiment score del texto, calculado externamente [-1, 1]
        var textSentiment: Double?
    }

    // MARK: - Normalización

    /// Convierte inputs multimodales en un CognitiveSnapshot normalizado.
    /// - Parameter input: datos capturados de todas las modalidades disponibles
    /// - Returns: CognitiveSnapshot con métricas cognitivas normalizadas
    static func normalize(_ input: MultimodalInput) -> CognitiveSnapshot {
        var valence = 0.0
        var arousal = 0.5
        var tension = 0.5
        var focus = 0.5
        var weightTotal = 0.0

        // --- Texto (sentiment) ---
        if let sentiment = input.textSentiment {
            valence += sentiment * 0.4
            weightTotal += 0.4
            // Texto largo/complejo → más foco
            let textComplexity = min(Double(input.text.count) / 500.0, 1.0)
            focus = focus * 0.5 + textComplexity * 0.5
        }

        // --- Cara ---
        if let face = input.faceData {
            // Sonrisa → valencia positiva
            valence += (face.smileIntensity - 0.5) * 2.0 * 0.3
            weightTotal += 0.3

            // Ceño fruncido → tensión
            tension = tension * 0.5 + face.browFurrow * 0.5

            // Ojos cerrados → baja activación
            arousal = arousal * 0.5 + face.eyeOpenness * 0.5

            // Mandíbula tensa → tensión
            tension = clamp((tension + face.jawTension) / 2.0, 0, 1)
        }

        // --- Audio ---
        if let audio = input.audioData {
            // Alta energía de voz → alta activación
            arousal = clamp(arousal * 0.5 + audio.energyLevel * 0.5, 0, 1)

            // Alta varianza de tono → más activación/estrés
            tension = clamp(tension * 0.6 + audio.pitchVariance * 0.4, 0, 1)

            // Alta tasa de speech → baja valencia (estrés) o alta activación
            let speechNorm = min(audio.speechRate / 4.0, 1.0)
            arousal = clamp(arousal * 0.7 + speechNorm * 0.3, 0, 1)

            // Muchas pausas → menos foco
            focus = clamp(focus * 0.7 + (1.0 - audio.pauseRatio) * 0.3, 0, 1)
        }

        // Normalizar valence al rango [-1, 1]
        valence = clamp(weightTotal > 0 ? valence / weightTotal * 2 : 0, -1, 1)

        // Determinar source
        let source: CaptureSource
        let hasVoice = input.faceData != nil || input.audioData != nil
        if hasVoice && !input.text.isEmpty {
            source = .multimodal
        } else if hasVoice {
            source = .voice
        } else {
            source = .manual
        }

        return CognitiveSnapshot(
            text: input.text,
            valence: valence,
            arousal: arousal,
            tension: tension,
            focus: focus,
            faceData: input.faceData,
            audioData: input.audioData,
            source: source
        )
    }

    // MARK: - Análisis de sentimiento de texto (heurístico básico)

    /// Análisis de sentimiento heurístico basado en palabras clave.
    /// En producción se usaría CoreML/NLP con NLTagger.
    static func analyzeSentiment(text: String) -> Double {
        let lower = text.lowercased()

        let positiveWords = ["bien", "excelente", "genial", "feliz", "tranquilo", "motivado",
                             "energía", "claro", "logro", "éxito", "sí", "bueno", "contento"]
        let negativeWords = ["mal", "tenso", "stress", "estrés", "cansado", "difícil", "problema",
                             "no puedo", "agotado", "frustrado", "tarde", "fallo", "caos", "dolor"]

        var score = 0.0
        for word in positiveWords where lower.contains(word) { score += 0.15 }
        for word in negativeWords where lower.contains(word) { score -= 0.15 }

        return clamp(score, -1.0, 1.0)
    }

    // MARK: - Utilidad

    private static func clamp(_ v: Double, _ min: Double, _ max: Double) -> Double {
        Swift.min(max, Swift.max(min, v))
    }
}
