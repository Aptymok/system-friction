// SoundCapture.swift — SoundAnalysis: clasificación de audio
// Framework: SoundAnalysis (Apple)

import Foundation
import SoundAnalysis
import AVFoundation
import Combine

/// Captura y clasificación de audio usando SoundAnalysis framework.
/// Detecta eventos de voz: energía, tasa de speech, varianza de tono.
@MainActor
final class SoundCapture: NSObject, ObservableObject, SNResultsObserving {

    // MARK: - Estado publicado

    @Published var audioData: AudioData? = nil
    @Published var isCapturing: Bool = false
    @Published var error: String? = nil

    // MARK: - Privado

    private var streamAnalyzer: SNAudioStreamAnalyzer?
    private let analysisQueue = DispatchQueue(label: "sf.sound.capture", qos: .userInitiated)
    private let audioEngine = AVAudioEngine()

    // Acumuladores para promediar
    private var energySamples: [Double] = []
    private var frameCount: Int = 0

    // MARK: - Inicio

    func startCapture() {
        guard !isCapturing else { return }

        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.record, mode: .measurement)
            try audioSession.setActive(true)

            let inputNode = audioEngine.inputNode
            let format = inputNode.outputFormat(forBus: 0)

            streamAnalyzer = SNAudioStreamAnalyzer(format: format)

            // Clasificador de sonido (SpeechActivity disponible en iOS 17)
            if let request = try? SNClassifySoundRequest(classifierIdentifier: .version1) {
                try streamAnalyzer?.add(request, withObserver: self)
            }

            inputNode.installTap(onBus: 0, bufferSize: 8192, format: format) { [weak self] buffer, time in
                self?.analysisQueue.async {
                    self?.streamAnalyzer?.analyze(buffer, atAudioFramePosition: time.sampleTime)
                    self?.processRawBuffer(buffer)
                }
            }

            try audioEngine.start()
            isCapturing = true

        } catch {
            self.error = error.localizedDescription
        }
    }

    func stopCapture() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        streamAnalyzer = nil
        isCapturing = false
        energySamples = []
        frameCount = 0
    }

    // MARK: - SNResultsObserving

    nonisolated func request(_ request: SNRequest, didProduce result: SNResult) {
        guard let classificationResult = result as? SNClassificationResult else { return }

        let topClassification = classificationResult.classifications.first
        let confidence = topClassification?.confidence ?? 0

        // Aproximación de tasa de habla desde confianza de clasificación de speech
        let speechRate = confidence * 3.5  // estimado: 0–3.5 palabras/seg

        Task { @MainActor in
            self.updateAudioData(speechRate: speechRate)
        }
    }

    nonisolated func request(_ request: SNRequest, didFailWithError error: Error) {
        Task { @MainActor in
            self.error = error.localizedDescription
        }
    }

    // MARK: - Procesamiento de buffer raw

    private func processRawBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData?[0] else { return }
        let frameLength = Int(buffer.frameLength)

        // RMS energy
        var sum: Double = 0
        for i in 0..<frameLength {
            let s = Double(channelData[i])
            sum += s * s
        }
        let rms = sqrt(sum / Double(max(frameLength, 1)))
        energySamples.append(min(rms * 10, 1.0))
        frameCount += 1

        // Actualizar cada 10 frames
        if frameCount % 10 == 0 {
            let avgEnergy = energySamples.reduce(0, +) / Double(energySamples.count)
            let variance = energySamples.map { pow($0 - avgEnergy, 2) }.reduce(0, +) / Double(energySamples.count)
            let pauseRatio = energySamples.filter { $0 < 0.05 }.count |> { Double($0) / Double(energySamples.count) }

            Task { @MainActor in
                var current = self.audioData ?? AudioData(speechRate: 0, pitchVariance: 0, energyLevel: 0, pauseRatio: 0)
                current.energyLevel = avgEnergy
                current.pitchVariance = min(variance * 5, 1.0)
                current.pauseRatio = pauseRatio
                self.audioData = current
            }
        }
    }

    private func updateAudioData(speechRate: Double) {
        var current = audioData ?? AudioData(speechRate: 0, pitchVariance: 0, energyLevel: 0, pauseRatio: 0)
        current.speechRate = speechRate
        audioData = current
    }
}

// Operador pipe para legibilidad
private func |> <T, U>(value: T, function: (T) -> U) -> U {
    return function(value)
}
