// CaptureSheet.swift — Sheet de captura multimodal

import SwiftUI

struct CaptureSheet: View {
    @ObservedObject var coordinator: CaptureCoordinator
    let onCapture: (CognitiveSnapshot) -> Void

    @StateObject private var speech = SpeechCapture()
    @StateObject private var face = FaceCapture()
    @StateObject private var sound = SoundCapture()
    @State private var manualText = ""
    @State private var isSaving = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Texto / Reflexión") {
                    TextEditor(text: $manualText)
                        .frame(minHeight: 80)
                        .overlay(
                            Group {
                                if manualText.isEmpty {
                                    Text("¿Cómo te sientes ahora?")
                                        .foregroundStyle(.tertiary)
                                        .padding(.top, 8)
                                        .padding(.leading, 4)
                                        .allowsHitTesting(false)
                                }
                            },
                            alignment: .topLeading
                        )
                }

                Section("Captura de Voz (STT)") {
                    HStack {
                        Image(systemName: speech.isRecording ? "waveform" : "mic")
                            .foregroundStyle(speech.isRecording ? .red : .secondary)
                        Button(speech.isRecording ? "Detener" : "Grabar voz") {
                            if speech.isRecording {
                                speech.stopRecording()
                                manualText = speech.transcript.isEmpty ? manualText : speech.transcript
                            } else {
                                speech.requestPermission()
                                try? speech.startRecording()
                            }
                        }
                    }
                    if !speech.transcript.isEmpty {
                        Text(speech.transcript)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Estado") {
                    HStack {
                        Label("Cámara", systemImage: "camera")
                        Spacer()
                        Text(face.isCapturing ? "Activa" : "Inactiva")
                            .foregroundStyle(face.isCapturing ? .green : .secondary)
                    }
                    HStack {
                        Label("Audio", systemImage: "waveform")
                        Spacer()
                        Text(sound.isCapturing ? "Activo" : "Inactivo")
                            .foregroundStyle(sound.isCapturing ? .green : .secondary)
                    }
                }
            }
            .navigationTitle("Capturar Estado")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Guardar") {
                        saveSnapshot()
                    }
                    .disabled(manualText.isEmpty && speech.transcript.isEmpty)
                }
            }
        }
        .onAppear {
            face.requestPermission()
            face.startCapture()
            sound.startCapture()
        }
        .onDisappear {
            face.stopCapture()
            sound.stopCapture()
            speech.stopRecording()
        }
    }

    private func saveSnapshot() {
        let text = manualText.isEmpty ? speech.transcript : manualText
        let sentiment = CognitiveNormalizer.analyzeSentiment(text: text)
        let input = CognitiveNormalizer.MultimodalInput(
            text: text,
            faceData: face.faceData,
            audioData: sound.audioData,
            textSentiment: sentiment
        )
        let snapshot = CognitiveNormalizer.normalize(input)
        onCapture(snapshot)
        dismiss()
    }
}
