# iOS WebView Wrapper App (`ios/`)

A thin native iOS shell that runs the experiments fullscreen in the phone-in-headset.
It does **not** reimplement any VR logic — it just hosts the existing web page in a
`WKWebView` and clears the iOS-specific obstacles that block a plain Safari tab from
working well in a headset.

## Why a native wrapper at all

Mobile Safari works, but a wrapper buys us things Safari can't:

- **True fullscreen** — no address bar, no status bar, no home indicator, no tab chrome
  eating the stereo viewport.
- **Stays awake** — `isIdleTimerDisabled = true` so the screen never dims mid-session.
- **Locked landscape** and no scroll/zoom/bounce, so the split-screen canvas can't drift.
- **A launcher** that lists every experiment from the dev server, so you pick one with
  the phone out and then drop it in the headset.

## The motion-permission gotcha (the important part)

This is the thing that quietly breaks naive WebView wrappers, so read this before
touching the head-tracking path.

- In **Mobile Safari**, `DeviceOrientationEvent.requestPermission()` exists and must be
  called from a user gesture (this is what `hello-world/main.js` already does on its
  first tap).
- In a **`WKWebView`**, `requestPermission` is **not exposed the same way**. Instead, the
  web page's request for motion/orientation is routed to the **host app**, via this
  `WKUIDelegate` method (iOS 15+):

  ```swift
  func webView(_ webView: WKWebView,
               requestDeviceOrientationAndMotionPermissionFor origin: WKSecurityOrigin,
               initiatedByFrame frame: WKFrameInfo,
               decisionHandler: @escaping (WKPermissionDecision) -> Void) {
      decisionHandler(.grant)
  }
  ```

  Granting here is what lets the page's `DeviceOrientationControls` receive real gyro
  events. **No changes to the web code are needed** — `main.js` listens for
  `deviceorientation` exactly as it does in Safari; the app just has to grant access.
  This is implemented in `WebVRController` (`ios/KaraokeVR/WebVRView.swift`).

- We deliberately did **not** hand-roll a CoreMotion → `deviceorientation` bridge. Letting
  the OS deliver native orientation events keeps the exact coordinate frame Safari uses,
  which is the frame `DeviceOrientationControls` already expects.
- **If head tracking ever fails to fire on a real device:** the fallback is a CoreMotion
  bridge — `CMMotionManager.deviceMotion`, convert `attitude` to `alpha/beta/gamma`, and
  `evaluateJavaScript` a synthetic `DeviceOrientationEvent` into the page each frame. It's
  more code and the angle conversion needs on-device tuning, so we only reach for it if
  the delegate-grant path comes up empty. (Requires `NSMotionUsageDescription` in
  Info.plist.)

Sources:

- Apple: `requestDeviceOrientationAndMotionPermissionFor(_:...)`
  <https://developer.apple.com/documentation/webkit/wkuidelegate/webview(_:requestdeviceorientationandmotionpermissionfor:initiatedbyframe:decisionhandler:)>
- Apple Developer Forums — Device Motion in WKWebView
  <https://developer.apple.com/forums/thread/125490>

## Self-signed dev cert

The dev server uses `@vitejs/plugin-basic-ssl` (self-signed). Both the `WKWebView`
(`WKNavigationDelegate`) and the `URLSession` that fetches `/projects.json`
(`TrustingSessionDelegate`) implement the auth-challenge callback and trust any server
cert. **This is DEV ONLY** — it disables certificate validation, which is fine for a LAN
dev box and must never ship to anything public. `Info.plist` also sets
`NSAllowsArbitraryLoads` to cover the `NO_SSL=1` (plain-HTTP-behind-tunnel) path.

## How content is served — the launcher + `/projects.json`

The app loads the **live dev server** (not a bundled build), so edits to `main.js`
hot-reload in the headset.

- `vite.config.js` adds a tiny middleware: `GET /projects.json` returns every top-level
  directory that contains an `index.html`, as `{ name, path, title }` (title comes from
  the page's `<title>`).
- Because the launcher needs to reach _all_ experiments, run Vite from the **repo root**
  (`yarn dev`, no directory argument) so projects are served at `/<dir>/` and the
  endpoint can scan the root. Running `yarn dev hello-world` still works for plain
  browser dev of a single experiment.
- Experiment `index.html` files must reference their script with a **relative** path
  (`./main.js`, not `/main.js`) so they load correctly when served at `/<dir>/`.

The launcher (`LauncherView.swift`) fetches `/projects.json`, lists the experiments, and
opens the chosen one in a fullscreen `WebVRView`. The server host is editable in the UI
and persisted with `@AppStorage("serverHost")` (default `192.168.1.89:8443`), so a
changed LAN IP doesn't require a rebuild.

## Project layout & building

```
ios/
  KaraokeVR.xcodeproj/        # hand-authored, objectVersion 77 (synchronized folder)
  Info.plist                  # landscape, status bar hidden, ATS dev exception
  KaraokeVR/                  # synchronized source group — new files auto-included
    KaraokeVRApp.swift        # @main App
    LauncherView.swift        # project list + editable host
    WebVRView.swift           # fullscreen WKWebView host + motion grant + cert trust
    ServerClient.swift        # /projects.json fetch over a cert-trusting URLSession
    Assets.xcassets/
```

The `.xcodeproj` uses a **`PBXFileSystemSynchronizedRootGroup`** (Xcode 16+), so any file
dropped into `KaraokeVR/` is picked up automatically — no need to edit `project.pbxproj`
when adding sources.

- Open in Xcode: `open ios/KaraokeVR.xcodeproj`, pick your device, Run. Running on a
  physical device needs a signing team (set it in Signing & Capabilities).
- Headless compile check (no signing):
  ```sh
  xcodebuild -project ios/KaraokeVR.xcodeproj -target KaraokeVR \
    -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
  ```
- Deployment target: iOS 16.0 (the motion-permission delegate is iOS 15+).

## In-headset flow

1. Start the server at the repo root: `yarn dev` (HTTPS on `:8443`).
2. Launch the app, confirm/edit the host, tap an experiment.
3. The page loads fullscreen; tap once (finger or headset clicker) to start head
   tracking — the app grants motion access and the gyro drives the camera.
