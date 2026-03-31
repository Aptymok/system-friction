// RailwayClient.swift — HTTP client for Railway backend
// Base: https://system-friction-production.up.railway.app

import Foundation

final class RailwayClient {
    static let shared = RailwayClient()
    private init() {}

    private let base = URL(string: "https://system-friction-production.up.railway.app")!
    private let session: URLSession = {
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = 8
        return URLSession(configuration: cfg)
    }()

    // MARK: - Health

    func checkHealth() async -> Bool {
        guard let url = URL(string: "\(base)/health") else { return false }
        do {
            let (_, resp) = try await session.data(from: url)
            return (resp as? HTTPURLResponse)?.statusCode == 200
        } catch { return false }
    }

    // MARK: - Metrics

    /// Fire-and-forget: POST /api/metrics with MIHM snapshot.
    func postMetrics(snapshot: CognitiveSnapshot, tick: Int = 0) async {
        guard let url = URL(string: "\(base)/api/metrics") else { return }

        let ihg  = snapshot.valence * (1 - snapshot.tension)
        let nti  = snapshot.tension
        let r    = snapshot.focus
        let iad  = snapshot.focus * 0.8
        let ete  = snapshot.arousal * 0.4 + snapshot.focus * 0.6
        let fric = max(0, min(1, nti * 0.4 + (1 - r) * 0.3 + (1 - ete) * 0.3))
        let st: String = ihg > 0.3 ? "OK" : ihg > 0 ? "DEGRADED" : "CRITICAL"

        let payload: [String: Any] = [
            "ts":   ISO8601DateFormatter().string(from: Date()),
            "tick": tick,
            "mihm": [
                "IHG": ihg, "NTI": nti, "R": r,
                "IAD": iad, "ETE": ete, "frictionScore": fric,
                "status": st,
            ],
        ]
        guard let body = try? JSONSerialization.data(withJSONObject: payload) else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        _ = try? await session.data(for: req)
    }

    // MARK: - Narrative LLM

    /// Request narrative from Railway /api/llm/narrative.
    /// Returns nil on failure — caller should fall back to NarrativeEngine.local().
    func fetchNarrative(
        userText: String,
        snapshot: CognitiveSnapshot,
        personalContext: String = ""
    ) async -> String? {
        guard let url = URL(string: "\(base)/api/llm/narrative") else { return nil }

        let ihg = snapshot.valence * (1 - snapshot.tension)
        let payload: [String: Any] = [
            "text":    userText,
            "context": personalContext,
            "mihm": [
                "IHG": ihg,
                "NTI": snapshot.tension,
                "R":   snapshot.focus,
                "status": ihg > 0.3 ? "OK" : ihg > 0 ? "DEGRADED" : "CRITICAL",
            ],
        ]
        guard let body = try? JSONSerialization.data(withJSONObject: payload) else { return nil }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = body

        do {
            let (data, _) = try await session.data(for: req)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            return json?["narrative"] as? String
        } catch { return nil }
    }

    // MARK: - Commits

    struct Commit: Identifiable {
        let id     = UUID()
        let sha:     String
        let message: String
        let author:  String
        let date:    String
    }

    func fetchCommits() async -> [Commit] {
        guard let url = URL(string: "\(base)/api/commits") else { return [] }
        do {
            let (data, _) = try await session.data(from: url)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let list = json?["commits"] as? [[String: Any]] ?? []
            return list.map {
                Commit(
                    sha:     $0["sha"]     as? String ?? "",
                    message: $0["message"] as? String ?? "",
                    author:  $0["author"]  as? String ?? "",
                    date:    $0["date"]    as? String ?? ""
                )
            }
        } catch { return [] }
    }
}
