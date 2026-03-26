// SalonEidelonView.swift — Salón Eidelon: chat local + narrativa desde snapshots

import SwiftUI

struct SalonEidelonView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = SalonViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Timeline narrativo (top)
                if !appState.snapshotHistory.isEmpty {
                    NarrativeTimelineView(history: appState.snapshotHistory)
                        .frame(height: 100)
                }

                Divider()

                // Conversación
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 12) {
                            ForEach(viewModel.messages) { msg in
                                MessageBubble(message: msg)
                            }
                        }
                        .padding()
                        .id("bottom")
                    }
                    .onChange(of: viewModel.messages.count) { _ in
                        withAnimation { proxy.scrollTo("bottom") }
                    }
                }

                Divider()

                // Input
                MessageInputBar(
                    text: $viewModel.inputText,
                    onSend: { viewModel.sendMessage(snapshot: appState.currentSnapshot) }
                )
            }
            .navigationTitle("Salón Eidelon")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                if viewModel.messages.isEmpty {
                    viewModel.addWelcome(snapshot: appState.currentSnapshot)
                }
            }
        }
    }
}

// MARK: - ViewModel

@MainActor
final class SalonViewModel: ObservableObject {

    @Published var messages: [ChatMessage] = []
    @Published var inputText: String = ""

    struct ChatMessage: Identifiable {
        let id = UUID()
        let role: Role
        let content: String
        let timestamp: Date
        enum Role { case user, eidolon }
    }

    func addWelcome(snapshot: CognitiveSnapshot?) {
        let greeting: String
        if let snap = snapshot {
            let ihg = snap.valence * (1 - snap.tension)
            greeting = """
            Hola. Soy el Salón Eidelon — tu espacio de reflexión.
            Tu estado actual: IHG = \(String(format: "%.2f", ihg)), Tensión = \(String(format: "%.2f", snap.tension)).
            \(ihg > 0 ? "Tu sistema muestra homeostasis positiva." : "Tu sistema necesita atención.")
            ¿Qué quieres explorar hoy?
            """
        } else {
            greeting = "Hola. Soy el Salón Eidelon. Captura tu estado primero para comenzar el análisis."
        }
        messages.append(ChatMessage(role: .eidolon, content: greeting, timestamp: Date()))
    }

    func sendMessage(snapshot: CognitiveSnapshot?) {
        guard !inputText.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        let userText = inputText
        inputText = ""

        messages.append(ChatMessage(role: .user, content: userText, timestamp: Date()))

        // Respuesta local heurística del Salón (sin API)
        let response = generateResponse(to: userText, snapshot: snapshot)
        messages.append(ChatMessage(role: .eidolon, content: response, timestamp: Date()))
    }

    private func generateResponse(to text: String, snapshot: CognitiveSnapshot?) -> String {
        let lower = text.lowercased()

        if lower.contains("cómo") && lower.contains("estoy") {
            if let snap = snapshot {
                let ihg = snap.valence * (1 - snap.tension)
                return "Según tu último snapshot: IHG=\(String(format: "%.2f", ihg)), Tensión=\(String(format: "%.2f", snap.tension)). " +
                    (ihg > 0 ? "Tu homeostasis es positiva." : "Hay tensión acumulada.")
            }
            return "No hay snapshot activo. Ve al Dashboard y captura tu estado primero."
        }

        if lower.contains("escenario") || lower.contains("simular") {
            return "Para ver escenarios, ve al Laboratorio (tab Lab). Ahí puedes ejecutar la simulación y elegir entre consenso, eficiencia y wildcard."
        }

        if lower.contains("plan") || lower.contains("acción") {
            if let plan = /* appState via future observer */ nil as ActionPlan? {
                return "Tienes un plan activo con \(plan.ticks.count) tics. ¿Quieres ver los detalles?"
            }
            return "Para generar un plan, primero elige un escenario en el Laboratorio."
        }

        // Respuesta genérica reflexiva
        let responses = [
            "Interesante reflexión. ¿Qué patrón notas en relación a tu estado de hoy?",
            "¿Cómo se relaciona eso con lo que registraste en tu último snapshot?",
            "El motor MIHM sugiere que tu tensión actual puede estar afectando ese proceso.",
            "Cuéntame más. ¿Esto es recurrente en tu historial?",
        ]
        return responses[Int.random(in: 0..<responses.count)]
    }
}

// MARK: - Subvistas

struct NarrativeTimelineView: View {
    let history: [CognitiveSnapshot]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(history.prefix(10).reversed()) { snap in
                    VStack(spacing: 4) {
                        Circle()
                            .fill(snap.valence > 0 ? Color.green : Color.orange)
                            .frame(width: 16, height: 16)
                        Text(snap.timestamp, style: .time)
                            .font(.system(size: 9))
                            .foregroundStyle(.secondary)
                        Text(String(format: "%.1f", snap.valence))
                            .font(.system(size: 10).monospacedDigit())
                    }
                }
            }
            .padding(.horizontal)
        }
        .frame(height: 60)
    }
}

struct MessageBubble: View {
    let message: SalonViewModel.ChatMessage

    var body: some View {
        HStack {
            if message.role == .user { Spacer() }

            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .padding(12)
                    .background(message.role == .user ? Color.blue : Color(.systemGray5))
                    .foregroundStyle(message.role == .user ? .white : .primary)
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                Text(message.timestamp, style: .time)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            if message.role == .eidolon { Spacer() }
        }
    }
}

struct MessageInputBar: View {
    @Binding var text: String
    let onSend: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            TextField("Escribe algo...", text: $text, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(1...4)

            Button(action: onSend) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title2)
                    .foregroundStyle(text.isEmpty ? .secondary : .blue)
            }
            .disabled(text.isEmpty)
        }
        .padding()
        .background(.bar)
    }
}
