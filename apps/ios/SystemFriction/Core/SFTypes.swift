// SFTypes.swift — Tipos Swift de SystemFriction v2
// Equivalencia iOS de los tipos de @sf/core

import Foundation

// MARK: - CognitiveSnapshot

/// Estado cognitivo capturado en un instante.
struct CognitiveSnapshot: Codable, Identifiable {
    var id: UUID = UUID()
    var timestamp: Date = Date()
    var text: String = ""
    var valence: Double = 0.0      // [-1, 1]
    var arousal: Double = 0.5      // [0, 1]
    var tension: Double = 0.5      // [0, 1]
    var focus: Double = 0.5        // [0, 1]
    var faceData: FaceData? = nil
    var audioData: AudioData? = nil
    var source: CaptureSource = .manual
}

enum CaptureSource: String, Codable {
    case manual, voice, multimodal
}

// MARK: - FaceData (Vision framework)

struct FaceData: Codable {
    var smileIntensity: Double     // [0, 1]
    var eyeOpenness: Double        // [0, 1]
    var browFurrow: Double         // [0, 1]
    var jawTension: Double         // [0, 1]
}

// MARK: - AudioData (SoundAnalysis)

struct AudioData: Codable {
    var speechRate: Double         // palabras/seg estimado
    var pitchVariance: Double      // varianza de tono [0, 1]
    var energyLevel: Double        // energía de voz [0, 1]
    var pauseRatio: Double         // ratio de silencios [0, 1]
}

// MARK: - Scenario

struct Scenario: Codable, Identifiable {
    var id: String
    var label: String
    var description: String
    var probability: Double        // [0, 1]
    var finalMetrics: MetricsPoint
    var trajectory: [MetricsPoint]
    var generatedBy: String        // "math" | "heuristic" | "groq"
    var trace: TraceInfo
}

struct MetricsPoint: Codable {
    var t: Double
    var IHG: Double
    var NTI: Double
    var R: Double
    var IAD: Double
    var ETE: Double
    var frictionScore: Double
    var status: String
}

// MARK: - ScenarioSet

struct ScenarioSet: Codable, Identifiable {
    var id: UUID = UUID()
    var consensus: Scenario
    var efficiency: Scenario
    var wildcard: Scenario
    var votes: [AgentVote]
    var trace: TraceInfo
}

// MARK: - AgentVote

struct AgentVote: Codable, Identifiable {
    var id: UUID = UUID()
    var agentId: String            // "SHINJI" | "REI" | "SHADOW" | "KAWORU"
    var scenarioId: String
    var score: Double              // [0, 1]
    var argument: String
}

// MARK: - ActionPlan

struct ActionPlan: Codable, Identifiable {
    var id: UUID = UUID()
    var scenarioId: String
    var ticks: [TickGoal]
    var trace: TraceInfo
}

struct TickGoal: Codable {
    var tickIndex: Int
    var objective: String
    var microGoals: [String]
    var criteria: [String]
    var covered: Bool = false
}

// MARK: - TraceInfo

struct TraceInfo: Codable {
    var inputsHash: String
    var method: String
    var seed: String
    var engineVersion: String = "2.0.0"
    var timestamp: Date = Date()
}
