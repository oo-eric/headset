import Foundation

/// One experiment served by the site's /api endpoint.
struct Project: Identifiable, Decodable, Hashable {
    let name: String
    let path: String   // e.g. "/hello-world/"
    let title: String
    var id: String { name }
}

private struct ProjectsResponse: Decodable { let projects: [Project] }

/// URLSession delegate that trusts the dev server's self-signed certificate.
/// DEV ONLY — this disables certificate validation, which is fine for a LAN dev
/// box but must never ship to anything public.
final class TrustingSessionDelegate: NSObject, URLSessionDelegate {
    func urlSession(_ session: URLSession,
                    didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        if let trust = challenge.protectionSpace.serverTrust {
            completionHandler(.useCredential, URLCredential(trust: trust))
        } else {
            completionHandler(.performDefaultHandling, nil)
        }
    }
}

@MainActor
final class ServerClient: ObservableObject {
    @Published var projects: [Project] = []
    @Published var error: String?
    @Published var loading = false

    private lazy var session: URLSession = {
        URLSession(configuration: .ephemeral, delegate: TrustingSessionDelegate(), delegateQueue: nil)
    }()

    /// Normalize "192.168.1.89:8443" or a full URL into a base URL (defaults to https).
    func baseURL(host: String) -> URL? {
        let h = host.trimmingCharacters(in: .whitespaces)
        guard !h.isEmpty else { return nil }
        if h.hasPrefix("http://") || h.hasPrefix("https://") { return URL(string: h) }
        return URL(string: "https://\(h)")
    }

    /// Resolve a project's path (e.g. "/hello-world/") against the current host.
    /// Appends ?autostart=1&native=1: skip the tap-to-start gate, and drive the camera
    /// from the native CoreMotion bridge (WKWebView won't deliver deviceorientation).
    func url(for project: Project, host: String) -> URL? {
        guard let base = baseURL(host: host) else { return nil }
        let sep = project.path.contains("?") ? "&" : "?"
        return URL(string: project.path + sep + "autostart=1&native=1", relativeTo: base)
    }

    func load(host: String) async {
        guard let base = baseURL(host: host),
              let url = URL(string: "/api", relativeTo: base) else {
            error = "Enter a host like vr.pinecone.website"
            return
        }
        loading = true
        error = nil
        defer { loading = false }
        do {
            let (data, _) = try await session.data(from: url)
            projects = try JSONDecoder().decode(ProjectsResponse.self, from: data).projects
        } catch {
            self.error = "Couldn't reach \(url.absoluteString)\n\(error.localizedDescription)"
            projects = []
        }
    }
}
