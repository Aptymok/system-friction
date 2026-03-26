// FaceCapture.swift — Vision face landmarks (cara → rasgos cognitivos)
// Framework: Vision (Apple)

import Foundation
import Vision
import AVFoundation
import Combine

/// Captura de landmarks faciales usando Vision framework.
/// Detecta: sonrisa, apertura de ojos, ceño fruncido, tensión en la mandíbula.
@MainActor
final class FaceCapture: NSObject, ObservableObject, AVCaptureVideoDataOutputSampleBufferDelegate {

    // MARK: - Estado publicado

    @Published var faceData: FaceData? = nil
    @Published var isCapturing: Bool = false
    @Published var permissionStatus: AVAuthorizationStatus = .notDetermined

    // MARK: - Privado

    private let captureSession = AVCaptureSession()
    private let videoOutput = AVCaptureVideoDataOutput()
    private let processingQueue = DispatchQueue(label: "sf.face.capture", qos: .userInitiated)

    // MARK: - Permisos

    func requestPermission() {
        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
            Task { @MainActor in
                self?.permissionStatus = granted ? .authorized : .denied
            }
        }
    }

    // MARK: - Captura

    func startCapture() {
        guard permissionStatus == .authorized, !isCapturing else { return }

        captureSession.beginConfiguration()
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
              let input = try? AVCaptureDeviceInput(device: device) else { return }

        if captureSession.canAddInput(input) { captureSession.addInput(input) }

        videoOutput.setSampleBufferDelegate(self, queue: processingQueue)
        videoOutput.alwaysDiscardsLateVideoFrames = true
        if captureSession.canAddOutput(videoOutput) { captureSession.addOutput(videoOutput) }

        captureSession.commitConfiguration()

        Task.detached { [weak self] in
            self?.captureSession.startRunning()
        }
        isCapturing = true
    }

    func stopCapture() {
        captureSession.stopRunning()
        isCapturing = false
    }

    // MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

    nonisolated func captureOutput(_ output: AVCaptureOutput,
                                   didOutput sampleBuffer: CMSampleBuffer,
                                   from connection: AVCaptureConnection) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let request = VNDetectFaceLandmarksRequest { [weak self] req, _ in
            guard let results = req.results as? [VNFaceObservation],
                  let face = results.first else { return }
            let data = FaceCapture.extractFaceData(from: face)
            Task { @MainActor in
                self?.faceData = data
            }
        }

        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .leftMirrored)
        try? handler.perform([request])
    }

    // MARK: - Extracción de rasgos

    static func extractFaceData(from face: VNFaceObservation) -> FaceData {
        // Roll/yaw/pitch como proxies de tensión/atención
        let yaw = face.yaw?.doubleValue ?? 0.0
        let roll = face.roll?.doubleValue ?? 0.0

        // Aproximación: yaw → tensión de mandíbula, roll → apertura de ojos
        // En producción se usarían los landmarks 2D detallados
        let jawTension = min(abs(yaw) * 2.0, 1.0)
        let eyeOpenness = max(0.0, 1.0 - abs(roll) * 1.5)

        // Sonrisa: estimada desde landmarks de la boca (simplificado)
        var smileIntensity = 0.5
        var browFurrow = 0.3

        if let landmarks = face.landmarks {
            smileIntensity = estimateSmile(landmarks: landmarks)
            browFurrow = estimateBrowFurrow(landmarks: landmarks)
        }

        return FaceData(
            smileIntensity: smileIntensity,
            eyeOpenness: eyeOpenness,
            browFurrow: browFurrow,
            jawTension: jawTension
        )
    }

    private static func estimateSmile(landmarks: VNFaceLandmarks2D) -> Double {
        guard let outerLips = landmarks.outerLips else { return 0.5 }
        let pts = outerLips.normalizedPoints
        guard pts.count >= 2 else { return 0.5 }
        // Ratio de ancho/altura de los labios como proxy de sonrisa
        let xs = pts.map { Double($0.x) }
        let ys = pts.map { Double($0.y) }
        let width = (xs.max() ?? 0.5) - (xs.min() ?? 0.5)
        let height = (ys.max() ?? 0.5) - (ys.min() ?? 0.5)
        let ratio = height > 0 ? width / height : 1.0
        // Ratio mayor → sonrisa más amplia
        return min(max((ratio - 2.0) / 4.0, 0.0), 1.0)
    }

    private static func estimateBrowFurrow(landmarks: VNFaceLandmarks2D) -> Double {
        guard let leftBrow = landmarks.leftEyebrow,
              let rightBrow = landmarks.rightEyebrow else { return 0.3 }
        let leftY = leftBrow.normalizedPoints.map { Double($0.y) }.reduce(0, +) / Double(leftBrow.pointCount)
        let rightY = rightBrow.normalizedPoints.map { Double($0.y) }.reduce(0, +) / Double(rightBrow.pointCount)
        // Cejas bajas → más ceño fruncido (Y mayor en coordenadas Vision = más abajo)
        let avgBrowY = (leftY + rightY) / 2.0
        return min(max(1.0 - avgBrowY * 1.5, 0.0), 1.0)
    }
}
