import Cocoa
import WebKit

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

class CustomWindow: NSWindow {
    // Allows dragging the window anywhere on empty areas
    override var canBecomeKey: Bool { return true }
    override var canBecomeMain: Bool { return true }
}

class AppDelegate: NSObject, NSApplicationDelegate, WKUIDelegate, WKNavigationDelegate {
    var window: CustomWindow!
    var webView: WKWebView!

    func applicationDidFinishLaunching(_ notification: Notification) {
        let appBundle = Bundle.main
        let webAssetsDir: URL
        if let resURL = appBundle.resourceURL?.appendingPathComponent("web"),
           FileManager.default.fileExists(atPath: resURL.path) {
            webAssetsDir = resURL
        } else {
            webAssetsDir = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("dist")
        }

        let config = WKWebViewConfiguration()
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

        window = CustomWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )

        window.title = "AudioNodeRouter"
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.isMovableByWindowBackground = true  // ★ 背景ドラッグでウィンドウ全体を移動可能にする
        window.appearance = NSAppearance(named: .darkAqua)
        window.isReleasedWhenClosed = false

        webView = WKWebView(frame: rect, configuration: config)
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground")

        window.contentView = webView
        window.makeKeyAndOrderFront(nil)

        if let initialURL = URL(string: "app://local/index.html") {
            webView.load(URLRequest(url: initialURL))
        }

        NSApp.activate(ignoringOtherApps: true)
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
