// CognitiveNormalizerTests.swift — Unit tests del CognitiveNormalizer
// Pruebas con datos simulados (sin hardware real)

import XCTest
@testable import SystemFriction

final class CognitiveNormalizerTests: XCTestCase {

    // MARK: - Tests básicos

    func testNormalize_textOnly_valenceInRange() {
        let input = CognitiveNormalizer.MultimodalInput(
            text: "Me siento bien y con energía",
            faceData: nil,
            audioData: nil,
            textSentiment: 0.5
        )
        let snap = CognitiveNormalizer.normalize(input)

        XCTAssertGreaterThanOrEqual(snap.valence, -1.0, "Valence debe ser >= -1")
        XCTAssertLessThanOrEqual(snap.valence, 1.0, "Valence debe ser <= 1")
        XCTAssertGreaterThan(snap.valence, 0, "Sentimiento positivo → valence > 0")
        XCTAssertEqual(snap.source, .manual)
    }

    func testNormalize_textNegative_valenceLow() {
        let input = CognitiveNormalizer.MultimodalInput(
            text: "Estoy muy cansado y estresado",
            faceData: nil,
            audioData: nil,
            textSentiment: -0.7
        )
        let snap = CognitiveNormalizer.normalize(input)

        XCTAssertLessThan(snap.valence, 0, "Sentimiento negativo → valence < 0")
    }

    func testNormalize_withFaceData_tensionAffected() {
        let highTensionFace = FaceData(
            smileIntensity: 0.1,
            eyeOpenness: 0.3,
            browFurrow: 0.9,
            jawTension: 0.8
        )
        let input = CognitiveNormalizer.MultimodalInput(
            text: "",
            faceData: highTensionFace,
            audioData: nil,
            textSentiment: nil
        )
        let snap = CognitiveNormalizer.normalize(input)

        XCTAssertGreaterThan(snap.tension, 0.5, "Cara tensa → tension > 0.5")
        XCTAssertEqual(snap.source, .voice)
    }

    func testNormalize_withAudioData_arousalAffected() {
        let highEnergyAudio = AudioData(
            speechRate: 3.5,
            pitchVariance: 0.8,
            energyLevel: 0.9,
            pauseRatio: 0.1
        )
        let input = CognitiveNormalizer.MultimodalInput(
            text: "",
            faceData: nil,
            audioData: highEnergyAudio,
            textSentiment: nil
        )
        let snap = CognitiveNormalizer.normalize(input)

        XCTAssertGreaterThan(snap.arousal, 0.5, "Audio energético → arousal > 0.5")
        XCTAssertEqual(snap.source, .voice)
    }

    func testNormalize_multimodal_sourceIsMultimodal() {
        let face = FaceData(smileIntensity: 0.7, eyeOpenness: 0.8, browFurrow: 0.2, jawTension: 0.3)
        let audio = AudioData(speechRate: 2.0, pitchVariance: 0.3, energyLevel: 0.6, pauseRatio: 0.2)
        let input = CognitiveNormalizer.MultimodalInput(
            text: "Hola, ¿cómo estás?",
            faceData: face,
            audioData: audio,
            textSentiment: 0.3
        )
        let snap = CognitiveNormalizer.normalize(input)

        XCTAssertEqual(snap.source, .multimodal)
    }

    func testNormalize_allMetrics_inValidRanges() {
        let face = FaceData(smileIntensity: 0.5, eyeOpenness: 0.6, browFurrow: 0.4, jawTension: 0.5)
        let audio = AudioData(speechRate: 2.5, pitchVariance: 0.5, energyLevel: 0.5, pauseRatio: 0.3)
        let input = CognitiveNormalizer.MultimodalInput(
            text: "El sistema funciona correctamente",
            faceData: face,
            audioData: audio,
            textSentiment: 0.2
        )
        let snap = CognitiveNormalizer.normalize(input)

        XCTAssertTrue((-1.0...1.0).contains(snap.valence), "valence ∈ [-1,1]")
        XCTAssertTrue((0.0...1.0).contains(snap.arousal), "arousal ∈ [0,1]")
        XCTAssertTrue((0.0...1.0).contains(snap.tension), "tension ∈ [0,1]")
        XCTAssertTrue((0.0...1.0).contains(snap.focus), "focus ∈ [0,1]")
    }

    func testNormalize_edgeCase_zeroInputs() {
        let input = CognitiveNormalizer.MultimodalInput(
            text: "",
            faceData: nil,
            audioData: nil,
            textSentiment: nil
        )
        let snap = CognitiveNormalizer.normalize(input)

        // No debe lanzar, valores deben ser finitos
        XCTAssertFalse(snap.valence.isNaN)
        XCTAssertFalse(snap.arousal.isNaN)
        XCTAssertFalse(snap.tension.isNaN)
        XCTAssertFalse(snap.focus.isNaN)
    }

    // MARK: - Tests de análisis de sentimiento

    func testAnalyzeSentiment_positive() {
        let score = CognitiveNormalizer.analyzeSentiment(text: "Me siento bien, excelente energía hoy")
        XCTAssertGreaterThan(score, 0, "Texto positivo → score > 0")
        XCTAssertLessThanOrEqual(score, 1.0)
    }

    func testAnalyzeSentiment_negative() {
        let score = CognitiveNormalizer.analyzeSentiment(text: "Muy cansado y frustrado con el estrés")
        XCTAssertLessThan(score, 0, "Texto negativo → score < 0")
        XCTAssertGreaterThanOrEqual(score, -1.0)
    }

    func testAnalyzeSentiment_neutral() {
        let score = CognitiveNormalizer.analyzeSentiment(text: "El archivo está en el directorio")
        XCTAssertEqual(score, 0.0, accuracy: 0.1, "Texto neutral → score ≈ 0")
    }

    func testAnalyzeSentiment_inRange() {
        let texts = ["", "hola", "muy bien excelente genial feliz", "mal estrés problema caos dolor"]
        for text in texts {
            let score = CognitiveNormalizer.analyzeSentiment(text: text)
            XCTAssertTrue((-1.0...1.0).contains(score), "Score siempre en [-1,1]: '\(text)' → \(score)")
        }
    }

    // MARK: - Test de determinismo

    func testNormalize_deterministic() {
        let face = FaceData(smileIntensity: 0.6, eyeOpenness: 0.7, browFurrow: 0.3, jawTension: 0.4)
        let audio = AudioData(speechRate: 2.0, pitchVariance: 0.4, energyLevel: 0.5, pauseRatio: 0.25)
        let input = CognitiveNormalizer.MultimodalInput(
            text: "Determinismo test",
            faceData: face,
            audioData: audio,
            textSentiment: 0.1
        )

        let snap1 = CognitiveNormalizer.normalize(input)
        let snap2 = CognitiveNormalizer.normalize(input)

        XCTAssertEqual(snap1.valence, snap2.valence)
        XCTAssertEqual(snap1.arousal, snap2.arousal)
        XCTAssertEqual(snap1.tension, snap2.tension)
        XCTAssertEqual(snap1.focus, snap2.focus)
    }
}
