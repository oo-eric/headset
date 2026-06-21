import SwiftUI
import UIKit
import WebKit

/// SwiftUI wrapper around a fullscreen WKWebView tuned for the headset.
struct WebVRView: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> WebVRController { WebVRController(url: url) }
    func updateUIViewController(_ vc: WebVRController, context: Context) {}
}

final class WebVRController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private let url: URL
    private var webView: WKWebView!
    private var motionBridge: MotionBridge?

    init(url: URL) {
        self.url = url
        super.init(nibName: nil, bundle: nil)
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) not used") }

    // Headset chrome: no status bar, no home indicator, landscape only.
    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .landscape }

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []   // audio (karaoke) can autoplay

        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.isOpaque = true
        web.backgroundColor = .black
        web.scrollView.backgroundColor = .black
        // Kill scroll/zoom/bounce so the stereo canvas can't be nudged around.
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.pinchGestureRecognizer?.isEnabled = false
        webView = web
        view = web
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView.load(URLRequest(url: url))
        // Push gyro orientation into the page. Updates begin immediately; the page
        // ignores them until window.__nativeOrientation is defined on load.
        motionBridge = MotionBridge(webView: webView)
        motionBridge?.start()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        UIApplication.shared.isIdleTimerDisabled = true    // never sleep while in the headset
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        UIApplication.shared.isIdleTimerDisabled = false
        motionBridge?.stop()
    }

    // MARK: - Motion bridge
    // WKWebView doesn't pop a permission prompt the way Safari does — instead it asks
    // the host app. Granting here is what lets the page's DeviceOrientationControls
    // receive real gyro events, so head tracking works inside the wrapper.
    func webView(_ webView: WKWebView,
                 requestDeviceOrientationAndMotionPermissionFor origin: WKSecurityOrigin,
                 initiatedByFrame frame: WKFrameInfo,
                 decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(.grant)
    }

    // MARK: - Self-signed cert (DEV ONLY)
    func webView(_ webView: WKWebView,
                 didReceive challenge: URLAuthenticationChallenge,
                 completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        if let trust = challenge.protectionSpace.serverTrust {
            completionHandler(.useCredential, URLCredential(trust: trust))
        } else {
            completionHandler(.performDefaultHandling, nil)
        }
    }
}
