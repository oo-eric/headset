import SwiftUI

/// Lists the experiments the dev server is serving and opens the chosen one fullscreen.
struct LauncherView: View {
    @AppStorage("serverHost") private var host = "https://vr.pinecone.website"
    @StateObject private var client = ServerClient()
    @State private var draftHost = ""

    var body: some View {
        NavigationStack {
            List {
                Section("Dev server") {
                    HStack {
                        TextField("host:port", text: $draftHost)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .keyboardType(.URL)
                            .submitLabel(.go)
                            .onSubmit(commit)
                        Button("Load", action: commit)
                            .buttonStyle(.borderedProminent)
                    }
                    if client.loading {
                        HStack { ProgressView(); Text("Loading…").foregroundStyle(.secondary) }
                    }
                    if let e = client.error {
                        Text(e).font(.footnote).foregroundStyle(.red)
                    }
                }

                Section("Experiments") {
                    if client.projects.isEmpty && !client.loading && client.error == nil {
                        Text("No projects yet — make sure `yarn dev` is running at the repo root.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    ForEach(client.projects) { project in
                        NavigationLink(value: project) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(project.title).font(.headline)
                                Text(project.path).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Phone-VR")
            .navigationDestination(for: Project.self) { project in
                if let url = client.url(for: project, host: host) {
                    WebVRView(url: url)
                        .ignoresSafeArea()
                        .toolbar(.hidden, for: .navigationBar)
                        .statusBarHidden(true)
                } else {
                    Text("Couldn't build a URL for \(project.name).")
                }
            }
            .task {
                if draftHost.isEmpty { draftHost = host }
                await client.load(host: host)
            }
        }
    }

    private func commit() {
        host = draftHost.trimmingCharacters(in: .whitespaces)
        Task { await client.load(host: host) }
    }
}
