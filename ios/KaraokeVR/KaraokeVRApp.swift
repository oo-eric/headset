import SwiftUI

// A thin native shell: a launcher that lists the experiments served by the Vite dev
// server, and a fullscreen WKWebView host that runs the chosen one in the headset.
@main
struct KaraokeVRApp: App {
    var body: some Scene {
        WindowGroup {
            LauncherView()
        }
    }
}
