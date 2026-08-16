import AVFoundation
import UIKit
import WebKit

final class WebViewController: UIViewController {
    private static let defaultServerURL = URL(string: "https://www.chuhaijian.com/deeptutor")!
    private static let serverURLKey = "deeptutor_server_url"
    private static let bootstrapKey = "deeptutor-ios-bootstrap-v2"

    private var serverURL: URL = {
        guard let value = UserDefaults.standard.string(forKey: serverURLKey),
              let url = URL(string: value) else { return defaultServerURL }
        return url
    }()

    private lazy var webView: WKWebView = {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.applicationNameForUserAgent = "chuhaijiandeeptutor-iOS/1.0.1"
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
        let toolbar = UIStackView()
        toolbar.translatesAutoresizingMaskIntoConstraints = false
        toolbar.axis = .horizontal
        toolbar.alignment = .center
        toolbar.spacing = 8
        toolbar.isLayoutMarginsRelativeArrangement = true
        toolbar.layoutMargins = UIEdgeInsets(top: 0, left: 16, bottom: 0, right: 8)

        let brand = UILabel()
        brand.text = "chuhaijiandeeptutor"
        brand.font = .preferredFont(forTextStyle: .headline)
        let spacer = UIView()
        let serverButton = UIButton(type: .system)
        serverButton.setTitle("服务器", for: .normal)
        serverButton.addTarget(self, action: #selector(serverSettingsTapped), for: .touchUpInside)
        toolbar.addArrangedSubview(brand)
        toolbar.addArrangedSubview(spacer)
        toolbar.addArrangedSubview(serverButton)

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

        view.addSubview(toolbar)
        view.addSubview(webView)
        view.addSubview(progress)
        view.addSubview(errorPanel)
        NSLayoutConstraint.activate([
            toolbar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            toolbar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            toolbar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            toolbar.heightAnchor.constraint(equalToConstant: 52),
            webView.topAnchor.constraint(equalTo: toolbar.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            progress.topAnchor.constraint(equalTo: toolbar.bottomAnchor),
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

    @objc private func serverSettingsTapped() {
        let alert = UIAlertController(
            title: "设置服务端",
            message: "留空将使用官方服务：https://www.chuhaijian.com/deeptutor",
            preferredStyle: .alert
        )
        alert.addTextField { field in
            field.placeholder = "https://example.com/deeptutor"
            field.keyboardType = .URL
            field.autocapitalizationType = .none
            field.text = UserDefaults.standard.string(forKey: Self.serverURLKey) ?? ""
        }
        alert.addAction(UIAlertAction(title: "取消", style: .cancel))
        alert.addAction(UIAlertAction(title: "连接", style: .default) { [weak self, weak alert] _ in
            guard let self else { return }
            self.saveServerURL(alert?.textFields?.first?.text ?? "")
        })
        present(alert, animated: true)
    }

    private func saveServerURL(_ input: String) {
        var value = input.trimmingCharacters(in: .whitespacesAndNewlines)
        if value.isEmpty {
            UserDefaults.standard.removeObject(forKey: Self.serverURLKey)
            serverURL = Self.defaultServerURL
        } else {
            if !value.contains("://") { value = "https://" + value }
            while value.count > "https://x/".count && value.hasSuffix("/") {
                value.removeLast()
            }
            guard let candidate = URL(string: value),
                  candidate.scheme?.lowercased() == "https",
                  candidate.host != nil else {
                showInvalidServerAlert()
                return
            }
            UserDefaults.standard.set(value, forKey: Self.serverURLKey)
            serverURL = candidate
        }
        webView.stopLoading()
        loadPlatform()
    }

    private func showInvalidServerAlert() {
        let alert = UIAlertController(title: "地址无效", message: "请输入有效的 HTTPS 服务端地址。", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "确定", style: .default))
        present(alert, animated: true)
    }

    private func loadPlatform() {
        errorPanel.isHidden = true
        progress.isHidden = false
        webView.load(URLRequest(url: serverURL, cachePolicy: .reloadRevalidatingCacheData, timeoutInterval: 30))
    }

    private func isPlatformURL(_ url: URL) -> Bool {
        url.scheme?.lowercased() == serverURL.scheme?.lowercased()
            && url.host?.lowercased() == serverURL.host?.lowercased()
            && effectivePort(for: url) == effectivePort(for: serverURL)
    }

    private func effectivePort(for url: URL) -> Int {
        url.port ?? (url.scheme?.lowercased() == "https" ? 443 : 80)
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
        guard origin.host.lowercased() == serverURL.host?.lowercased() else { decisionHandler(.deny); return }
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
