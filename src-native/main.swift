import Cocoa
import WebKit
import CoreAudio

class LocalAppSchemeHandler: NSObject, WKURLSchemeHandler {
    let resourcesURL: URL

    init(resourcesURL: URL) {
        self.resourcesURL = resourcesURL
        super.init()
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else { return }
        var relativePath = url.path
        if relativePath.isEmpty || relativePath == "/" {
            relativePath = "index.html"
        }
        if relativePath.hasPrefix("/") {
            relativePath = String(relativePath.dropFirst())
        }

        let fileURL = resourcesURL.appendingPathComponent(relativePath)

        if let data = try? Data(contentsOf: fileURL) {
            let mimeType: String
            if relativePath.hasSuffix(".html") {
                mimeType = "text/html"
            } else if relativePath.hasSuffix(".js") || relativePath.hasSuffix(".mjs") {
                mimeType = "application/javascript"
            } else if relativePath.hasSuffix(".css") {
                mimeType = "text/css"
            } else if relativePath.hasSuffix(".svg") {
                mimeType = "image/svg+xml"
            } else if relativePath.hasSuffix(".json") {
                mimeType = "application/json"
            } else if relativePath.hasSuffix(".png") {
                mimeType = "image/png"
            } else {
                mimeType = "application/octet-stream"
            }

            let response = HTTPURLResponse(
                url: url,
                statusCode: 200,
                httpVersion: "HTTP/1.1",
                headerFields: [
                    "Content-Type": mimeType,
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-cache"
                ]
            )!

            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } else {
            let response = HTTPURLResponse(
                url: url,
                statusCode: 404,
                httpVersion: "HTTP/1.1",
                headerFields: nil
            )!
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didFinish()
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}

class AppDelegate: NSObject, NSApplicationDelegate, WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: WKWebView!
    var meterTimer: Timer?

    func applicationDidFinishLaunching(_ notification: Notification) {
        let appBundle = Bundle.main
        let webAssetsDir: URL
        if let resURL = appBundle.resourceURL?.appendingPathComponent("web"),
           FileManager.default.fileExists(atPath: resURL.path) {
            webAssetsDir = resURL
        } else {
            webAssetsDir = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("dist")
        }

        let contentController = WKUserContentController()
        contentController.add(self, name: "windowDrag")
        contentController.add(self, name: "nativeAudio")

        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        config.setURLSchemeHandler(LocalAppSchemeHandler(resourcesURL: webAssetsDir), forURLScheme: "app")
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")

        let screenSize = NSScreen.main?.frame.size ?? CGSize(width: 1440, height: 900)
        let windowWidth: CGFloat = min(1440, screenSize.width * 0.9)
        let windowHeight: CGFloat = min(900, screenSize.height * 0.9)

        let rect = NSRect(
            x: (screenSize.width - windowWidth) / 2,
            y: (screenSize.height - windowHeight) / 2,
            width: windowWidth,
            height: windowHeight
        )

        // Native titlebar for seamless window movement
        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )

        window.title = "AudioNodeRouter - macOS Audio Node Mixer (LadioCast Engine)"
        window.appearance = NSAppearance(named: .darkAqua)
        window.isReleasedWhenClosed = false
        window.center()

        webView = WKWebView(frame: window.contentView!.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground")

        window.contentView = webView
        window.makeKeyAndOrderFront(nil)

        if let initialURL = URL(string: "app://local/index.html") {
            webView.load(URLRequest(url: initialURL))
        }

        NSApp.activate(ignoringOtherApps: true)

        // Start high-frequency meter sync to webview (30fps)
        meterTimer = Timer.scheduledTimer(withTimeInterval: 0.033, repeats: true) { [weak self] _ in
            self?.syncMetersToWeb()
        }
    }

    private func syncMetersToWeb() {
        let json = NativeAudioRouter.shared.getMetersJSON()
        webView.evaluateJavaScript("window.__onNativeMeters && window.__onNativeMeters(\(json));", completionHandler: nil)
    }

    // Handle messages from Web UI
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "windowDrag" {
            if let currentEvent = NSApp.currentEvent {
                window.performDrag(with: currentEvent)
            }
        } else if message.name == "nativeAudio" {
            guard let dict = message.body as? [String: Any],
                  let action = dict["action"] as? String else { return }

            switch action {
            case "getDevices":
                sendDevicesToWeb()

            case "updateInput":
                if let id = dict["id"] as? String,
                   let devId = dict["deviceId"] as? UInt32,
                   let vol = dict["volume"] as? Double,
                   let mute = dict["mute"] as? Bool {
                    NativeAudioRouter.shared.setInputNode(id: id, deviceID: AudioDeviceID(devId), volume: Float(vol), mute: mute)
                }

            case "updateOutput":
                if let id = dict["id"] as? String,
                   let devId = dict["deviceId"] as? UInt32,
                   let vol = dict["volume"] as? Double,
                   let mute = dict["mute"] as? Bool {
                    NativeAudioRouter.shared.setOutputNode(id: id, deviceID: AudioDeviceID(devId), volume: Float(vol), mute: mute)
                }

            case "updateBus":
                if let id = dict["id"] as? String,
                   let vol = dict["volume"] as? Double,
                   let mute = dict["mute"] as? Bool {
                    NativeAudioRouter.shared.setBusNode(id: id, volume: Float(vol), mute: mute)
                }

            case "connect":
                if let src = dict["sourceId"] as? String,
                   let tgt = dict["targetId"] as? String {
                    NativeAudioRouter.shared.connect(sourceId: src, targetId: tgt)
                }

            case "disconnect":
                if let src = dict["sourceId"] as? String,
                   let tgt = dict["targetId"] as? String {
                    NativeAudioRouter.shared.disconnect(sourceId: src, targetId: tgt)
                }

            case "removeNode":
                if let id = dict["id"] as? String {
                    NativeAudioRouter.shared.removeInputNode(id: id)
                    NativeAudioRouter.shared.removeOutputNode(id: id)
                    NativeAudioRouter.shared.removeBusNode(id: id)
                }

            default:
                break
            }
        }
    }

    private func sendDevicesToWeb() {
        let devMgr = AudioDeviceManager.shared
        devMgr.refreshDevices()

        var inList: [[String: Any]] = []
        for d in devMgr.inputDevices {
            inList.append(["id": d.id, "name": d.name, "uid": d.uid])
        }

        var outList: [[String: Any]] = []
        for d in devMgr.outputDevices {
            outList.append(["id": d.id, "name": d.name, "uid": d.uid])
        }

        let payload: [String: Any] = ["inputs": inList, "outputs": outList]
        if let data = try? JSONSerialization.data(withJSONObject: payload),
           let jsonStr = String(data: data, encoding: .utf8) {
            webView.evaluateJavaScript("window.__onDevicesList && window.__onDevicesList(\(jsonStr));", completionHandler: nil)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}

// Entry Point
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
