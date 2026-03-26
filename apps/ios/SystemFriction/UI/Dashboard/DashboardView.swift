// DashboardView.swift — Dashboard: métricas en vivo + gráficas + timeline

import SwiftUI
import Charts

struct DashboardView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var captureCoordinator = CaptureCoordinator()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Tarjeta de estado actual
                    if let snap = appState.currentSnapshot {
                        CurrentStateCard(snapshot: snap)
                    } else {
                        EmptyStateCard(onCapture: { captureCoordinator.requestCapture() })
                    }

                    // Métricas en vivo
                    MetricsGrid(snapshot: appState.currentSnapshot)

                    // Gráfica de trayectoria (si hay simulación)
                    if let scenarioSet = appState.currentScenarioSet {
                        TrajectoryChart(scenario: scenarioSet.consensus)
                            .frame(height: 200)
                    }

                    // Timeline de snapshots
                    if !appState.snapshotHistory.isEmpty {
                        SnapshotTimeline(history: appState.snapshotHistory)
                    }
                }
                .padding()
            }
            .navigationTitle("SystemFriction")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: { captureCoordinator.requestCapture() }) {
                        Image(systemName: "waveform.circle")
                            .symbolEffect(.pulse, isActive: captureCoordinator.isCapturing)
                    }
                }
            }
            .sheet(isPresented: $captureCoordinator.showCaptureSheet) {
                CaptureSheet(coordinator: captureCoordinator) { snapshot in
                    appState.currentSnapshot = snapshot
                    appState.snapshotHistory.insert(snapshot, at: 0)
                }
            }
        }
    }
}

// MARK: - Subvistas del Dashboard

struct CurrentStateCard: View {
    let snapshot: CognitiveSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Circle()
                    .fill(statusColor)
                    .frame(width: 12, height: 12)
                Text("Estado actual")
                    .font(.headline)
                Spacer()
                Text(snapshot.timestamp, style: .relative)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text(snapshot.text.isEmpty ? "(sin texto)" : snapshot.text)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            HStack(spacing: 16) {
                MetricBadge(label: "V", value: snapshot.valence, range: -1...1)
                MetricBadge(label: "A", value: snapshot.arousal, range: 0...1)
                MetricBadge(label: "T", value: snapshot.tension, range: 0...1)
                MetricBadge(label: "F", value: snapshot.focus, range: 0...1)
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var statusColor: Color {
        let friction = frictionFromSnapshot(snapshot)
        if friction > 0.65 { return .red }
        if friction > 0.4 { return .orange }
        return .green
    }
}

struct EmptyStateCard: View {
    let onCapture: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "waveform.and.magnifyingglass")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("No hay snapshot activo")
                .font(.headline)
            Button("Capturar ahora", action: onCapture)
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity)
        .padding(32)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct MetricsGrid: View {
    let snapshot: CognitiveSnapshot?

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            MetricCard(title: "IHG", subtitle: "Homeostasis Global",
                       value: snapshot.map { $0.valence * (1 - $0.tension) } ?? 0,
                       color: .blue, range: -1...1)
            MetricCard(title: "NTI", subtitle: "Tensión Interna",
                       value: snapshot.map { $0.tension } ?? 0,
                       color: .orange, range: 0...1)
            MetricCard(title: "R", subtitle: "Resiliencia",
                       value: snapshot.map { ($0.arousal * 0.5 + $0.focus * 0.5) } ?? 0.5,
                       color: .green, range: 0...1)
            MetricCard(title: "F", subtitle: "Fricción",
                       value: snapshot.map { frictionFromSnapshot($0) } ?? 0,
                       color: .red, range: 0...1)
        }
    }
}

struct MetricCard: View {
    let title: String
    let subtitle: String
    let value: Double
    let color: Color
    let range: ClosedRange<Double>

    private var normalized: Double {
        let span = range.upperBound - range.lowerBound
        return (value - range.lowerBound) / span
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.title2).bold().foregroundStyle(color)
            Text(subtitle).font(.caption).foregroundStyle(.secondary)
            ProgressView(value: normalized)
                .tint(color)
            Text(String(format: "%.3f", value)).font(.caption.monospacedDigit())
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

struct MetricBadge: View {
    let label: String
    let value: Double
    let range: ClosedRange<Double>

    var body: some View {
        VStack(spacing: 2) {
            Text(label).font(.caption2).foregroundStyle(.secondary)
            Text(String(format: "%.2f", value)).font(.caption.monospacedDigit())
        }
    }
}

struct TrajectoryChart: View {
    let scenario: Scenario

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Trayectoria — \(scenario.label)")
                .font(.subheadline).bold()

            Chart(scenario.trajectory, id: \.t) { point in
                LineMark(x: .value("t", point.t), y: .value("IHG", point.IHG))
                    .foregroundStyle(.blue)
                LineMark(x: .value("t", point.t), y: .value("NTI", point.NTI))
                    .foregroundStyle(.orange)
            }
            .chartLegend(position: .topLeading)
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct SnapshotTimeline: View {
    let history: [CognitiveSnapshot]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Timeline").font(.headline)
            ForEach(history.prefix(5)) { snap in
                HStack {
                    Circle()
                        .fill(snap.valence > 0 ? Color.green : Color.red)
                        .frame(width: 8, height: 8)
                    Text(snap.timestamp, style: .time)
                        .font(.caption)
                    Spacer()
                    Text(String(format: "IHG %.2f", snap.valence * (1 - snap.tension)))
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Helpers

private func frictionFromSnapshot(_ snap: CognitiveSnapshot) -> Double {
    let IHG = snap.valence * (1 - snap.tension)
    let IHG_norm = (IHG + 1) / 2
    let NTI = snap.tension * (1 - snap.focus * 0.5)
    let R = (snap.arousal * 0.5 + snap.focus * 0.5) * (1 - snap.tension * 0.3)
    return min(max((1 - IHG_norm) * NTI * (1 - R), 0), 1)
}

// MARK: - CaptureCoordinator

@MainActor
final class CaptureCoordinator: ObservableObject {
    @Published var showCaptureSheet = false
    @Published var isCapturing = false

    func requestCapture() {
        showCaptureSheet = true
    }
}
