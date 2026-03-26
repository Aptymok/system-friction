// LaboratorioViewModelTests.swift — Tests del flujo Laboratorio (sin UI)

import XCTest
@testable import SystemFriction

@MainActor
final class LaboratorioViewModelTests: XCTestCase {

    // MARK: - Tests de debate local

    func testLocalDebate_returnsMeaningfulScenarioSet() {
        let snap = CognitiveSnapshot(
            text: "Día difícil",
            valence: -0.3,
            arousal: 0.6,
            tension: 0.7,
            focus: 0.4
        )
        let set = LaboratorioViewModel.runLocalDebate(snapshot: snap)

        XCTAssertFalse(set.consensus.id.isEmpty)
        XCTAssertFalse(set.efficiency.id.isEmpty)
        XCTAssertFalse(set.wildcard.id.isEmpty)
        XCTAssertNotEqual(set.consensus.id, set.efficiency.id)
        XCTAssertNotEqual(set.consensus.id, set.wildcard.id)
        XCTAssertNotEqual(set.efficiency.id, set.wildcard.id)
    }

    func testLocalDebate_probabilitiesInRange() {
        let snap = CognitiveSnapshot(valence: 0.1, arousal: 0.5, tension: 0.4, focus: 0.6)
        let set = LaboratorioViewModel.runLocalDebate(snapshot: snap)
        let scenarios = [set.consensus, set.efficiency, set.wildcard]
        for s in scenarios {
            XCTAssertGreaterThanOrEqual(s.probability, 0)
            XCTAssertLessThanOrEqual(s.probability, 1)
        }
    }

    func testLocalDebate_metricsAreFinite() {
        let snap = CognitiveSnapshot(valence: -0.8, arousal: 0.9, tension: 0.9, focus: 0.1)
        let set = LaboratorioViewModel.runLocalDebate(snapshot: snap)
        for scenario in [set.consensus, set.efficiency, set.wildcard] {
            let m = scenario.finalMetrics
            XCTAssertFalse(m.IHG.isNaN)
            XCTAssertFalse(m.NTI.isNaN)
            XCTAssertFalse(m.R.isNaN)
            XCTAssertFalse(m.frictionScore.isNaN)
        }
    }

    func testLocalDebate_frictionScoreInRange() {
        let snap = CognitiveSnapshot(valence: 0.2, arousal: 0.5, tension: 0.3, focus: 0.7)
        let set = LaboratorioViewModel.runLocalDebate(snapshot: snap)
        for scenario in [set.consensus, set.efficiency, set.wildcard] {
            XCTAssertGreaterThanOrEqual(scenario.finalMetrics.frictionScore, 0)
            XCTAssertLessThanOrEqual(scenario.finalMetrics.frictionScore, 1)
        }
    }

    // MARK: - Tests del ViewModel

    func testViewModel_runSetsStateToDone() async {
        let vm = LaboratorioViewModel()
        let snap = CognitiveSnapshot(valence: 0, arousal: 0.5, tension: 0.5, focus: 0.5)

        XCTAssertEqual(vm.state.label, "idle")
        vm.run(snapshot: snap)

        // Esperar a que termine la tarea async
        try? await Task.sleep(nanoseconds: 500_000_000)  // 0.5s

        if case .done = vm.state {
            XCTAssertNotNil(vm.scenarioSet)
        } else {
            XCTFail("Estado esperado: done, actual: \(vm.state.label)")
        }
    }

    func testViewModel_selectScenario_generatesPlan() {
        let vm = LaboratorioViewModel()
        let snap = CognitiveSnapshot(valence: 0.1, arousal: 0.5, tension: 0.4, focus: 0.6)
        let set = LaboratorioViewModel.runLocalDebate(snapshot: snap)

        vm.selectScenario(set.consensus)

        XCTAssertNotNil(vm.plan)
        XCTAssertEqual(vm.plan?.ticks.count, 5)
        XCTAssertEqual(vm.selectedScenario?.id, set.consensus.id)
    }

    func testViewModel_planTicksHaveContent() {
        let vm = LaboratorioViewModel()
        let snap = CognitiveSnapshot(valence: -0.2, arousal: 0.6, tension: 0.6, focus: 0.4)
        let set = LaboratorioViewModel.runLocalDebate(snapshot: snap)
        vm.selectScenario(set.efficiency)

        guard let plan = vm.plan else {
            XCTFail("Plan debe generarse"); return
        }

        for tick in plan.ticks {
            XCTAssertFalse(tick.objective.isEmpty, "Objetivo no debe ser vacío")
            XCTAssertFalse(tick.microGoals.isEmpty, "Micro-goals no deben ser vacíos")
            XCTAssertFalse(tick.covered, "Tics nuevos no deben estar cubiertos")
        }
    }
}

// MARK: - Helper

extension LaboratorioViewModel.State {
    var label: String {
        switch self {
        case .idle: return "idle"
        case .running: return "running"
        case .done: return "done"
        case .error: return "error"
        }
    }
}
