import CoreMotion
import WebKit

/// Feeds the device's gyro orientation into the web page.
///
/// WKWebView does not deliver `deviceorientation` events to JS even when motion access
/// is granted (verified on iOS 26), so the page's `DeviceOrientationControls` never gets
/// data. Instead we read CoreMotion natively and push the device attitude quaternion into
/// the page each frame. The page — loaded with `?native=1` — drives its camera from
/// `window.__nativeOrientation(w, x, y, z)` instead of the dead event path.
///
/// CoreMotion device-motion (gyro/accelerometer) needs no usage-description prompt; only
/// motion-activity/pedometer APIs do.
final class MotionBridge {
    private let motion = CMMotionManager()
    private weak var webView: WKWebView?

    init(webView: WKWebView) { self.webView = webView }

    func start() {
        guard motion.isDeviceMotionAvailable, !motion.isDeviceMotionActive else { return }
        motion.deviceMotionUpdateInterval = 1.0 / 60.0
        // xArbitraryZVertical: Z is up (gravity-aligned), X is an arbitrary heading. We
        // only need relative look-around, so an arbitrary heading is fine (and avoids
        // needing the magnetometer / location).
        motion.startDeviceMotionUpdates(using: .xArbitraryZVertical, to: .main) { [weak self] dm, _ in
            guard let self, let dm, let webView = self.webView else { return }
            let q = dm.attitude.quaternion
            let js = "window.__nativeOrientation&&window.__nativeOrientation(\(q.w),\(q.x),\(q.y),\(q.z));"
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    func stop() {
        if motion.isDeviceMotionActive { motion.stopDeviceMotionUpdates() }
    }
}
