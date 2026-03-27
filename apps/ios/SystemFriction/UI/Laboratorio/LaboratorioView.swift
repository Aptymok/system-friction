// LaboratorioView.swift — Laboratorio: simulación + debate + escenarios + plan por tics

import SwiftUI

struct LaboratorioView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = LaboratorioViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if appState.currentSnapshot == nil {
                    NoSnapshotPrompt()
                } else {
                    LaboratorioContent(viewModel: viewModel)
                }
            }
            .navigationTitle("Laboratorio")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                if let snap = appState.currentSnapshot, viewModel.state == .idle {
                    viewModel.run(snapshot: snap)
                }
            }
            .onChange(of: appState.currentSnapshot) { snap in
                if let snap { viewModel.run(snapshot: snap) }
            }
            .onChange(of: viewModel.scenarioSet) { set in
                appState.currentScenarioSet = set
            }
            .onChange(of: viewModel.plan) { plan in
                appState.currentPlan = plan
            }
        }
    }
}

// MARK: - ViewModel

@MainActor
final class LaboratorioViewModel: ObservableObject {

    enum State { case idle, running, done, error(String) }

    @Published var state: State = .idle
    @Published var scenarioSet: ScenarioSet? = nil
    @Published var selectedScenario: Scenario? = nil
    @Published var plan: ActionPlan? = nil
    @Published var progress: Double = 0

    func run(snapshot: CognitiveSnapshot) {
        state = .running
        progress = 0

        Task {
            do {
                // Simular debate (computación síncrona, la hacemos en background para no bloquear UI)
                let result = try await Task.detached(priority: .userInitiated) {
                    // Bridge JS→Swift: en producción llamaría al proxy o al engine nativo portado.
                    // Por ahora, usa el normalizador Swift + lógica heurística local.
                    return LaboratorioViewModel.runLocalDebate(snapshot: snapshot)
                }.value

                self.scenarioSet = result
                self.state = .done
                self.progress = 1.0
            } catch {
                self.state = .error(error.localizedDescription)
            }
        }
    }

    func selectScenario(_ scenario: Scenario) {
        selectedScenario = scenario
        plan = generatePlan(for: scenario)
    }

    private func generatePlan(for scenario: Scenario) -> ActionPlan {
        let ticks = (0..<5).map { i in
            TickGoal(
                tickIndex: i,
                objective: "Tic \(i+1): \(tickObjective(scenario: scenario, index: i))",
                microGoals: microGoals(scenario: scenario, index: i),
                criteria: ["Completado cuando: \(criteria(scenario: scenario, index: i))"],
                covered: false
            )
        }

        return ActionPlan(
            scenarioId: scenario.id,
            ticks: ticks,
            trace: TraceInfo(inputsHash: scenario.trace.inputsHash,
                             method: "local-plan",
                             seed: scenario.trace.seed)
        )
    }

    // MARK: - Heurísticas del plan

    private func tickObjective(scenario: Scenario, index: Int) -> String {
        let objectives = [
            "Establecer baseline de estado",
            "Reducir fricción inmediata",
            "Consolidar recuperación",
            "Optimizar flujo de energía",
            "Integrar nuevo estado estable"
        ]
        return objectives[min(index, objectives.count - 1)]
    }

    private func microGoals(scenario: Scenario, index: Int) -> [String] {
        let base = scenario.finalMetrics
        if base.frictionScore > 0.5 {
            return ["Respirar 3 min", "Reducir input externo", "Descanso breve"]
        } else {
            return ["Mantener foco", "Revisar objetivos", "Avanzar en tarea principal"]
        }
    }

    private func criteria(scenario: Scenario, index: Int) -> String {
        "IHG ≥ \(String(format: "%.2f", scenario.finalMetrics.IHG * Double(index + 1) / 5.0))"
    }

    // MARK: - Debate local (heurístico Swift, sin JS)

    static func runLocalDebate(snapshot: CognitiveSnapshot) -> ScenarioSet {
        let snap = snapshot

        // Generar 3 escenarios heurísticos directamente en Swift
        let consensus = makeHeuristicScenario(snap: snap, label: "Consenso",
            description: "Evolución natural hacia homeostasis.",
            deltaValence: 0.1, deltaTension: -0.1)

        let efficiency = makeHeuristicScenario(snap: snap, label: "Eficiencia",
            description: "Reducción rápida de fricción con alta ETE.",
            deltaValence: 0.05, deltaTension: -0.2)

        let wildcard = makeHeuristicScenario(snap: snap, label: "Wildcard",
            description: "Expansión divergente; alta IAD.",
            deltaValence: -0.05, deltaTension: 0.05)

        return ScenarioSet(
            consensus: consensus,
            efficiency: efficiency,
            wildcard: wildcard,
            votes: [],
            trace: TraceInfo(inputsHash: String(snap.id.uuidString.prefix(8)),
                             method: "local-heuristic",
                             seed: String(snap.timestamp.timeIntervalSince1970))
        )
    }

    private static func makeHeuristicScenario(snap: CognitiveSnapshot, label: String,
                                               description: String,
                                               deltaValence: Double, deltaTension: Double) -> Scenario {
        let finalValence = min(max(snap.valence + deltaValence, -1), 1)
        let finalTension = min(max(snap.tension + deltaTension, 0), 1)
        let finalIHG = finalValence * (1 - finalTension)
        let finalNTI = finalTension * (1 - snap.focus * 0.5)
        let finalR = (snap.arousal * 0.5 + snap.focus * 0.5) * (1 - finalTension * 0.3)
        let frictionScore = min(max((1 - (finalIHG + 1) / 2) * finalNTI * (1 - finalR), 0), 1)

        let finalMetrics = MetricsPoint(
            t: 20, IHG: finalIHG, NTI: finalNTI, R: finalR,
            IAD: snap.focus, ETE: 1 - frictionScore,
            frictionScore: frictionScore,
            status: frictionScore > 0.65 ? "CRITICAL" : frictionScore > 0.4 ? "DEGRADED" : "OK"
        )

        return Scenario(
            id: "\(label)-\(String(snap.id.uuidString.prefix(4)))",
            label: label,
            description: description,
            probability: 1 - frictionScore * 0.5,
            finalMetrics: finalMetrics,
            trajectory: [],
            generatedBy: "heuristic",
            trace: TraceInfo(inputsHash: String(snap.id.uuidString.prefix(8)),
                             method: "local-heuristic-\(label)",
                             seed: "0")
        )
    }
}

// MARK: - Subvistas del Laboratorio

struct LaboratorioContent: View {
    @ObservedObject var viewModel: LaboratorioViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Estado de la simulación
                switch viewModel.state {
                case .idle:
                    ProgressView("Preparando simulación...")
                case .running:
                    ProgressView("Ejecutando debate APTYMOK...", value: viewModel.progress)
                        .padding()
                case .done:
                    if let set = viewModel.scenarioSet {
                        ScenarioSelectionView(scenarioSet: set, selectedId: viewModel.selectedScenario?.id) { scenario in
                            viewModel.selectScenario(scenario)
                        }
                    }
                case .error(let msg):
                    Label(msg, systemImage: "exclamationmark.triangle")
                        .foregroundStyle(.red)
                }

                // Plan generado
                if let plan = viewModel.plan {
                    PlanView(plan: plan)
                }
            }
            .padding()
        }
    }
}

struct ScenarioSelectionView: View {
    let scenarioSet: ScenarioSet
    let selectedId: String?
    let onSelect: (Scenario) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Top 3 Escenarios").font(.headline)

            ScenarioCard(scenario: scenarioSet.consensus, tag: "Consenso", color: .blue,
                         isSelected: selectedId == scenarioSet.consensus.id, onSelect: onSelect)
            ScenarioCard(scenario: scenarioSet.efficiency, tag: "Eficiencia", color: .green,
                         isSelected: selectedId == scenarioSet.efficiency.id, onSelect: onSelect)
            ScenarioCard(scenario: scenarioSet.wildcard, tag: "Wildcard", color: .purple,
                         isSelected: selectedId == scenarioSet.wildcard.id, onSelect: onSelect)
        }
    }
}

struct ScenarioCard: View {
    let scenario: Scenario
    let tag: String
    let color: Color
    let isSelected: Bool
    let onSelect: (Scenario) -> Void

    var body: some View {
        Button(action: { onSelect(scenario) }) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(tag).font(.caption).bold().foregroundStyle(color)
                    Spacer()
                    Text(String(format: "P=%.0f%%", scenario.probability * 100))
                        .font(.caption).foregroundStyle(.secondary)
                    if isSelected {
                        Image(systemName: "checkmark.circle.fill").foregroundStyle(color)
                    }
                }
                Text(scenario.label).font(.subheadline).bold()
                Text(scenario.description).font(.caption).foregroundStyle(.secondary)
                HStack(spacing: 16) {
                    MiniMetric(label: "IHG", value: scenario.finalMetrics.IHG)
                    MiniMetric(label: "NTI", value: scenario.finalMetrics.NTI)
                    MiniMetric(label: "F", value: scenario.finalMetrics.frictionScore)
                }
            }
            .padding()
            .background(isSelected ? color.opacity(0.1) : Color(.systemGray6))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? color : Color.clear, lineWidth: 2)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}

struct MiniMetric: View {
    let label: String
    let value: Double

    var body: some View {
        VStack(spacing: 2) {
            Text(label).font(.system(size: 9)).foregroundStyle(.secondary)
            Text(String(format: "%.2f", value)).font(.system(size: 11).monospacedDigit())
        }
    }
}

struct PlanView: View {
    @State var plan: ActionPlan

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Plan por Tics").font(.headline)
            ForEach($plan.ticks, id: \.tickIndex) { $tick in
                TickCard(tick: $tick)
            }
        }
    }
}

struct TickCard: View {
    @Binding var tick: TickGoal

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Button(action: { tick.covered.toggle() }) {
                    Image(systemName: tick.covered ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(tick.covered ? .green : .secondary)
                }
                Text(tick.objective).font(.subheadline)
                    .strikethrough(tick.covered)
                    .foregroundStyle(tick.covered ? .secondary : .primary)
            }
            ForEach(tick.microGoals, id: \.self) { goal in
                Label(goal, systemImage: "arrow.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if let criteria = tick.criteria.first {
                Text(criteria).font(.caption2).foregroundStyle(.blue)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

struct NoSnapshotPrompt: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.circle")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("Captura tu estado primero")
                .font(.headline)
            Text("Ve al Dashboard y toca el ícono de captura.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}
