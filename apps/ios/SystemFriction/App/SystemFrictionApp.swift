// SystemFrictionApp.swift — Punto de entrada de la app iOS

import SwiftUI

@main
struct SystemFrictionApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
    }
}

// MARK: - Estado global de la app

@MainActor
final class AppState: ObservableObject {
    @Published var currentSnapshot: CognitiveSnapshot? = nil
    @Published var currentScenarioSet: ScenarioSet? = nil
    @Published var selectedScenario: Scenario? = nil
    @Published var currentPlan: ActionPlan? = nil
    @Published var snapshotHistory: [CognitiveSnapshot] = []
    @Published var selectedTab: AppTab = .dashboard
}

enum AppTab: String, CaseIterable {
    case dashboard = "Dashboard"
    case salon = "Salón"
    case laboratorio = "Lab"

    var icon: String {
        switch self {
        case .dashboard: return "chart.line.uptrend.xyaxis"
        case .salon: return "bubble.left.and.bubble.right"
        case .laboratorio: return "flask"
        }
    }
}

// MARK: - ContentView (Tab bar)

struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        TabView(selection: $appState.selectedTab) {
            DashboardView()
                .tabItem { Label("Dashboard", systemImage: AppTab.dashboard.icon) }
                .tag(AppTab.dashboard)

            SalonEidelonView()
                .tabItem { Label("Salón", systemImage: AppTab.salon.icon) }
                .tag(AppTab.salon)

            LaboratorioView()
                .tabItem { Label("Lab", systemImage: AppTab.laboratorio.icon) }
                .tag(AppTab.laboratorio)
        }
        .accentColor(.blue)
    }
}
