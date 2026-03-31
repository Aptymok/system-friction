// SalonEidelonView.swift — Sala Eidolón
// Pipeline: texto → NarrativeEngine (on-device → Railway → local) → respuesta con métricas reales

import SwiftUI

struct SalonEidelonView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = SalonViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {

                // Source indicator bar
                HStack {
                    Circle()
                        .fill(sourceColor(vm.narrativeSource))
                        .frame(width: 6, height: 6)
                    Text(vm.narrativeSource.rawValue)
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundStyle(.secondary)
                    Spacer()
                    if let snap = appState.currentSnapshot {
                        let ihgVal = snap.valence * (1 - snap.tension)
                        Text("IHG \(String(format: "%.2f", ihgVal))")
                            .font(.system(size: 9, design: .monospaced))
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 6)
                .background(Color(.systemGroupedBackground))

                Divider()

                // Snapshot timeline
                if !appState.snapshotHistory.isEmpty {
                    NarrativeTimelineView(history: appState.snapshotHistory)
                        .frame(height: 56)
                }

                Divider()

                // Messages
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 12) {
                            ForEach(vm.messages) { msg in
                                MessageBubble(message: msg)
                            }
                            if vm.isGenerating {
                                TypingIndicator()
                            }
                        }
                        .padding()
                        .id("bottom")
                    }
                    .onChange(of: vm.messages.count) { _ in
                        withAnimation { proxy.scrollTo("bottom") }
                    }
                    .onChange(of: vm.isGenerating) { _ in
                        withAnimation { proxy.scrollTo("bottom") }
                    }
                }

                Divider()

                MessageInputBar(
                    text: $vm.inputText,
                    isLoading: vm.isGenerating,
                    onSend: {
                        Task {
                            await vm.sendMessage(
                                snapshot: appState.currentSnapshot,
                                history:  vm.messages
                            )
                        }
                    }
                )
            }
            .navigationTitle("Sala Eidolón")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                if vm.messages.isEmpty {
                    vm.addWelcome(snapshot: appState.currentSnapshot)
                }
            }
        }
    }

    private func sourceColor(_ src: NarrativeEngine.NarrativeSource) -> Color {
        switch src {
        case .onDevice: return .green
        case .railway:  return .blue
        case .local:    return .orange
        case .none:     return .gray
        }
    }
}

// MARK: - ViewModel

@MainActor
final class SalonViewModel: ObservableObject {

    @Published var messages:        [ChatMessage] = []
    @Published var inputText:       String = ""
    @Published var isGenerating:    Bool = false
    @Published var narrativeSource: NarrativeEngine.NarrativeSource = .none

    struct ChatMessage: Identifiable {
        let id        = UUID()
        let role:       Role
        let content:    String
        let timestamp:  Date
        enum Role { case user, eidolon }
    }

    func addWelcome(snapshot: CognitiveSnapshot?) {
        let ihg = snapshot.map { $0.valence * (1 - $0.tension) } ?? 0
        let txt = snapshot == nil
            ? "Bienvenido a Sala Eidolón. Captura tu estado primero para comenzar."
            : "Bienvenido. IHG=\(String(format: "%.2f", ihg)), "
              + "tensión=\(String(format: "%.2f", snapshot!.tension)). "
              + (ihg > 0.3 ? "Sistema en equilibrio." : "Hay tensión activa — cuéntame.")
        append(.eidolon, txt)
    }

    func sendMessage(snapshot: CognitiveSnapshot?, history: [ChatMessage]) async {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        inputText = ""
        append(.user, text)
        isGenerating = true

        // Fire-and-forget metrics to Railway
        if let snap = snapshot {
            Task.detached { await RailwayClient.shared.postMetrics(snapshot: snap) }
        }

        let snap = snapshot ?? CognitiveSnapshot(
            valence: 0, arousal: 0.5, tension: 0.5, focus: 0.5,
            rawText: "", captureSource: .text
        )

        let response = await NarrativeEngine.shared.generate(
            userText: text,
            snapshot: snap,
            history:  history
        )

        narrativeSource = NarrativeEngine.shared.lastSource
        isGenerating    = false
        append(.eidolon, response)
    }

    private func append(_ role: ChatMessage.Role, _ content: String) {
        messages.append(ChatMessage(role: role, content: content, timestamp: Date()))
    }
}

// MARK: - Subviews

struct NarrativeTimelineView: View {
    let history: [CognitiveSnapshot]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(history.prefix(12).reversed()) { snap in
                    let ihg = snap.valence * (1 - snap.tension)
                    VStack(spacing: 3) {
                        Circle()
                            .fill(ihg > 0.3 ? Color.green : ihg > 0 ? Color.orange : Color.red)
                            .frame(width: 12, height: 12)
                        Text(String(format: "%.1f", ihg))
                            .font(.system(size: 8).monospacedDigit())
                            .foregroundStyle(.secondary)
                        Text(snap.timestamp, style: .time)
                            .font(.system(size: 7))
                            .foregroundStyle(Color(.tertiaryLabel))
                    }
                }
            }
            .padding(.horizontal)
        }
    }
}

struct MessageBubble: View {
    let message: SalonViewModel.ChatMessage

    var body: some View {
        HStack(alignment: .top) {
            if message.role == .user { Spacer(minLength: 40) }
            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 3) {
                HStack {
                    if message.role == .eidolon {
                        Text("EIDOLÓN").font(.system(size: 8, design: .monospaced)).foregroundStyle(.secondary)
                        Spacer()
                    } else {
                        Spacer()
                        Text("TÚ").font(.system(size: 8, design: .monospaced)).foregroundStyle(.secondary)
                    }
                }
                Text(message.content)
                    .padding(11)
                    .background(message.role == .user ? Color.blue : Color(.secondarySystemBackground))
                    .foregroundStyle(message.role == .user ? .white : .primary)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                Text(message.timestamp, style: .time)
                    .font(.system(size: 8))
                    .foregroundStyle(Color(.tertiaryLabel))
            }
            if message.role == .eidolon { Spacer(minLength: 40) }
        }
    }
}

struct TypingIndicator: View {
    @State private var dot = 0
    let timer = Timer.publish(every: 0.4, on: .main, in: .common).autoconnect()
    var body: some View {
        HStack {
            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .fill(i == dot ? Color.primary : Color(.tertiaryLabel))
                        .frame(width: 6, height: 6)
                }
            }
            .padding(10)
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            Spacer()
        }
        .onReceive(timer) { _ in dot = (dot + 1) % 3 }
    }
}

struct MessageInputBar: View {
    @Binding var text: String
    let isLoading: Bool
    let onSend: () -> Void
    var body: some View {
        HStack(spacing: 10) {
            TextField("Escribe…", text: $text, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(1...5)
                .disabled(isLoading)
            Button(action: onSend) {
                if isLoading {
                    ProgressView().frame(width: 28, height: 28)
                } else {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundStyle(text.isEmpty ? Color(.tertiaryLabel) : .blue)
                }
            }
            .disabled(text.isEmpty || isLoading)
        }
        .padding()
        .background(.bar)
    }
}
