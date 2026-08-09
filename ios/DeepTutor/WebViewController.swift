import AVFoundation
import UIKit
import WebKit

final class WebViewController: UIViewController {
    private static let serverURL = URL(string: "http://102.134.48.49/")!
    private static let bootstrapKey = "deeptutor-ios-bootstrap-v1"

    private lazy var webView: WKWebView = {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.applicationNameForUserAgent = "DeepTutoriOS/1.0"
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = [.video]
        configuration.userContentController.addUserScript(
            WKUserScript(source: Self.bootstrapScript, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        )
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = self
        view.uiDelegate = self
        view.allowsBackForwardNavigationGestures = true
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private let progress = UIProgressView(progressViewStyle: .bar)
    private let errorPanel = UIStackView()
    private var progressObservation: NSKeyValueObservation?

    private static var bootstrapScript: String {
        """
        (function(){try{
          var k='\(bootstrapKey)';
          if(localStorage.getItem(k)==='1')return;
          localStorage.setItem('deeptutor-language','zh');
          localStorage.setItem('deeptutor-response-language','zh');
          localStorage.setItem('dt:chat:viewer-panel','0');
          localStorage.setItem(k,'1');
          document.documentElement.lang='zh';
        }catch(e){}})();
        """
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        configureLayout()
        observeProgress()
        loadPlatform()
    }

    private func configureLayout() {
        progress.translatesAutoresizingMaskIntoConstraints = false
        errorPanel.translatesAutoresizingMaskIntoConstraints = false
        errorPanel.axis = .vertical
        errorPanel.alignment = .center
        errorPanel.spacing = 14
        errorPanel.isHidden = true

        let title = UILabel()
        title.text = "无法连接服务器"
        title.font = .preferredFont(forTextStyle: .title2)
        let message = UILabel()
        message.text = "请检查网络连接后重试。"
        message.textColor = .secondaryLabel
        let retry = UIButton(type: .system)
        retry.setTitle("重新连接", for: .normal)
        retry.titleLabel?.font = .preferredFont(forTextStyle: .headline)
        retry.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
        errorPanel.addArrangedSubview(title)
        errorPanel.addArrangedSubview(message)
        errorPanel.addArrangedSubview(retry)

        view.addSubview(webView)
        view.addSubview(progress)
        view.addSubview(errorPanel)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            progress.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            progress.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progress.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            errorPanel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            errorPanel.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }

    private func observeProgress() {
        progressObservation = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] view, _ in
            self?.progress.progress = Float(view.estimatedProgress)
            self?.progress.isHidden = view.estimatedProgress >= 1
        }
    }

    @objc private func retryTapped() { loadPlatform() }

    private func loadPlatform() {
        errorPanel.isHidden = true
        progress.isHidden = false
        webView.load(URLRequest(url: Self.serverURL, cachePolicy: .useProtocolCachePolicy, timeoutInterval: 30))
    }

    private func isPlatformURL(_ url: URL) -> Bool {
        url.scheme?.lowercased() == Self.serverURL.scheme?.lowercased()
            && url.host?.lowercased() == Self.serverURL.host?.lowercased()
            && (url.port ?? 80) == (Self.serverURL.port ?? 80)
    }

    private func showConnectionError() {
        progress.isHidden = true
        errorPanel.isHidden = false
    }
}

extension WebViewController: WKNavigationDelegate {
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if isPlatformURL(url) || url.scheme == "about" || url.scheme == "blob" {
            decisionHandler(.allow)
        } else if ["http", "https", "mailto", "tel"].contains(url.scheme?.lowercased() ?? "") {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        } else {
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        errorPanel.isHidden = true
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        showConnectionError()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showConnectionError()
    }
}

extension WebViewController: WKUIDelegate {
    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        guard origin.host == Self.serverURL.host else { decisionHandler(.deny); return }
        decisionHandler(.prompt)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url {
            if isPlatformURL(url) {
                webView.load(URLRequest(url: url))
            } else {
                UIApplication.shared.open(url)
            }
        }
        return nil
    }
}
