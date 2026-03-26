// SpeechCapture.swift — Speech STT (voz → texto)
// Framework: Speech (Apple)

import Foundation
import Speech
import Combine

/// Captura continua de voz usando el framework Speech de Apple.
/// STT en tiempo real, en dispositivo (no requiere internet para idiomas descargados).
@MainActor
final class SpeechCapture: ObservableObject {

    // MARK: - Estado publicado

    @Published var transcript: String = ""
    @Published var isRecording: Bool = false
    @Published var permissionStatus: SFSpeechRecognizerAuthorizationStatus = .notDetermined
    @Published var error: String? = nil

    // MARK: - Privado

    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    // MARK: - Init

    init(locale: Locale = Locale(identifier: "es-MX")) {
        speechRecognizer = SFSpeechRecognizer(locale: locale)
    }

    // MARK: - Permisos

    func requestPermission() {
        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            Task { @MainActor in
                self?.permissionStatus = status
            }
        }
    }

    // MARK: - Grabación

    func startRecording() throws {
        guard permissionStatus == .authorized else {
            error = "Permiso de voz no concedido"
            return
        }
        guard !isRecording else { return }

        // Reset
        recognitionTask?.cancel()
        recognitionTask = nil
        transcript = ""

        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let req = recognitionRequest else { return }
        req.shouldReportPartialResults = true

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()
        isRecording = true

        recognitionTask = speechRecognizer?.recognitionTask(with: req) { [weak self] result, err in
            Task { @MainActor in
                if let result {
                    self?.transcript = result.bestTranscription.formattedString
                }
                if err != nil || result?.isFinal == true {
                    self?.stopRecording()
                }
            }
        }
    }

    func stopRecording() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        recognitionTask = nil
        isRecording = false
    }
}
