package com.chuhaijian.deeptutor;

import android.Manifest;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import android.net.http.SslError;

import java.util.Locale;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public final class MainActivity extends ComponentActivity {
    private static final int FILE_CHOOSER_REQUEST = 4101;
    private static final int AUDIO_PERMISSION_REQUEST = 4102;
    private static final int STORAGE_PERMISSION_REQUEST = 4103;
    private static final String ANDROID_BOOTSTRAP_KEY =
            "deeptutor-android-bootstrap-v3";

    private final Uri serverUri = Uri.parse(BuildConfig.SERVER_URL);
    private WebView webView;
    private ProgressBar progressBar;
    private View errorView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private PermissionRequest pendingWebPermission;
    private PendingDownload pendingDownload;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureSystemBars();
        View contentView = createContentView();
        setContentView(contentView);
        applySystemBarInsets(contentView);
        configureWebView();
        configureBackNavigation();

        if (savedInstanceState == null) {
            loadPlatform();
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private void applySystemBarInsets(View contentView) {
        // Android 15+ enforces edge-to-edge for targetSdk 35+. Without
        // consuming these insets, the web app's top-right close button sits
        // underneath the status bar and becomes impossible to tap.
        ViewCompat.setOnApplyWindowInsetsListener(contentView, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars()
                            | WindowInsetsCompat.Type.displayCutout()
            );
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(contentView);
    }

    private void configureBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (errorView.getVisibility() == View.VISIBLE) {
                    errorView.setVisibility(View.GONE);
                } else {
                    closeWebDialogOrNavigateBack(this);
                }
            }
        });
    }

    private void closeWebDialogOrNavigateBack(OnBackPressedCallback callback) {
        // Session previews are React overlays, not browser-history entries.
        // Dispatching Escape lets the web app run its own close handler before
        // we consider navigating or exiting the Activity.
        String script = "(function(){"
                + "var d=document.querySelector('[role=\"dialog\"]:not([aria-hidden=\"true\"])');"
                + "if(!d)return false;"
                + "document.dispatchEvent(new KeyboardEvent('keydown',"
                + "{key:'Escape',code:'Escape',bubbles:true}));"
                + "return true;"
                + "})()";
        webView.evaluateJavascript(script, result -> {
            if ("true".equals(result)) return;
            if (webView.canGoBack()) {
                webView.goBack();
                return;
            }
            callback.setEnabled(false);
            getOnBackPressedDispatcher().onBackPressed();
            callback.setEnabled(true);
        });
    }

    private void configureSystemBars() {
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.rgb(247, 248, 250));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
    }

    private View createContentView() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.WHITE);

        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(3)
        );
        progressParams.gravity = Gravity.TOP;
        root.addView(progressBar, progressParams);

        errorView = createErrorView();
        errorView.setVisibility(View.GONE);
        root.addView(errorView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        return root;
    }

    private View createErrorView() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(32), dp(32), dp(32), dp(32));
        panel.setBackgroundColor(Color.WHITE);

        TextView title = new TextView(this);
        title.setText(R.string.connection_failed);
        title.setTextColor(Color.rgb(15, 23, 42));
        title.setTextSize(22);
        title.setGravity(Gravity.CENTER);
        panel.addView(title);

        TextView hint = new TextView(this);
        hint.setText(R.string.connection_hint);
        hint.setTextColor(Color.rgb(71, 85, 105));
        hint.setTextSize(15);
        hint.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams hintParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        hintParams.setMargins(0, dp(12), 0, dp(24));
        panel.addView(hint, hintParams);

        Button retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setAllCaps(false);
        retry.setOnClickListener(view -> loadPlatform());
        panel.addView(retry, new LinearLayout.LayoutParams(dp(180), dp(52)));
        return panel;
    }

    @SuppressWarnings("SetJavaScriptEnabled")
    private void configureWebView() {
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, false);

        webView.setBackgroundColor(Color.WHITE);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setDatabaseEnabled(true);
        webView.getSettings().setAllowFileAccess(false);
        webView.getSettings().setAllowContentAccess(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(true);
        webView.getSettings().setMixedContentMode(
                android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        );
        webView.getSettings().setSafeBrowsingEnabled(true);
        webView.getSettings().setBuiltInZoomControls(false);
        webView.getSettings().setDisplayZoomControls(false);
        webView.getSettings().setUserAgentString(
                webView.getSettings().getUserAgentString() + " DeepTutorAndroid/1.0"
        );

        webView.setWebViewClient(new PlatformWebViewClient());
        webView.setWebChromeClient(new PlatformChromeClient());
        webView.setDownloadListener(new PlatformDownloadListener());
    }

    private void loadPlatform() {
        errorView.setVisibility(View.GONE);
        progressBar.setVisibility(View.VISIBLE);
        if (!hasNetwork()) {
            showConnectionError();
            return;
        }
        webView.loadUrl(BuildConfig.SERVER_URL);
    }

    private boolean hasNetwork() {
        ConnectivityManager manager =
                (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        Network network = manager.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities capabilities = manager.getNetworkCapabilities(network);
        return capabilities != null && capabilities.hasCapability(
                NetworkCapabilities.NET_CAPABILITY_INTERNET
        );
    }

    private void showConnectionError() {
        progressBar.setVisibility(View.GONE);
        errorView.setVisibility(View.VISIBLE);
    }

    private void applyFirstRunWebDefaults(WebView view) {
        // A WebView has its own localStorage, separate from Chrome and the
        // desktop browser. Seed Chinese only once so a later explicit choice
        // in Settings remains respected. Also clear the persisted viewer
        // panel left open by the previous Android build.
        String script = "(function(){try{"
                + "var k='" + ANDROID_BOOTSTRAP_KEY + "';"
                + "if(localStorage.getItem(k)==='1')return false;"
                + "localStorage.setItem('deeptutor-language','zh');"
                + "localStorage.setItem('deeptutor-response-language','zh');"
                + "localStorage.setItem('dt:chat:viewer-panel','0');"
                + "localStorage.setItem(k,'1');"
                + "window.dispatchEvent(new CustomEvent('deeptutor:language',"
                + "{detail:{language:'zh'}}));"
                + "window.dispatchEvent(new CustomEvent('deeptutor:response-language',"
                + "{detail:{language:'zh'}}));"
                + "document.documentElement.lang='zh';"
                + "return true;"
                + "}catch(e){return false;}})()";
        // Do not call reload() here. AppShellContext and UnifiedChatContext
        // already subscribe to the two events above, so the language changes
        // in place without a second navigation. Some vendor WebViews otherwise
        // race page bootstrap against the reload and visibly refresh in a loop.
        view.evaluateJavascript(script, null);
    }

    private boolean isPlatformUrl(Uri uri) {
        return uri != null
                && serverUri.getScheme() != null
                && serverUri.getScheme().equalsIgnoreCase(uri.getScheme())
                && serverUri.getHost() != null
                && serverUri.getHost().equalsIgnoreCase(uri.getHost())
                && effectivePort(serverUri) == effectivePort(uri);
    }

    private int effectivePort(Uri uri) {
        if (uri.getPort() >= 0) return uri.getPort();
        return "https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException exception) {
            Toast.makeText(this, R.string.external_link_failed, Toast.LENGTH_SHORT).show();
        }
    }

    private final class PlatformWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String scheme = uri.getScheme() == null
                    ? ""
                    : uri.getScheme().toLowerCase(Locale.ROOT);
            if (isPlatformUrl(uri)) return false;
            if (scheme.equals("http") || scheme.equals("https")
                    || scheme.equals("mailto") || scheme.equals("tel")) {
                openExternal(uri);
            }
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            progressBar.setVisibility(View.GONE);
            if (isPlatformUrl(Uri.parse(url))) {
                errorView.setVisibility(View.GONE);
                applyFirstRunWebDefaults(view);
            }
            CookieManager.getInstance().flush();
        }

        @Override
        public void onReceivedError(
                WebView view,
                WebResourceRequest request,
                WebResourceError error
        ) {
            if (request.isForMainFrame()) showConnectionError();
        }

        @Override
        public void onReceivedSslError(
                WebView view,
                SslErrorHandler handler,
                SslError error
        ) {
            // Never bypass certificate failures when the deployment moves to HTTPS.
            handler.cancel();
            showConnectionError();
        }
    }

    private final class PlatformChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            progressBar.setProgress(newProgress);
            progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
        }

        @Override
        public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> callback,
                FileChooserParams params
        ) {
            if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
            fileChooserCallback = callback;
            Intent intent;
            try {
                intent = params.createIntent();
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                return true;
            } catch (ActivityNotFoundException exception) {
                fileChooserCallback = null;
                Toast.makeText(MainActivity.this, R.string.no_file_picker, Toast.LENGTH_SHORT).show();
                return false;
            }
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            runOnUiThread(() -> {
                boolean wantsAudio = false;
                for (String resource : request.getResources()) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                        wantsAudio = true;
                        break;
                    }
                }
                if (!wantsAudio || !isPlatformUrl(Uri.parse(request.getOrigin().toString()))) {
                    request.deny();
                    return;
                }
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                        == PackageManager.PERMISSION_GRANTED) {
                    request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                } else {
                    pendingWebPermission = request;
                    requestPermissions(
                            new String[]{Manifest.permission.RECORD_AUDIO},
                            AUDIO_PERMISSION_REQUEST
                    );
                }
            });
        }
    }

    private final class PlatformDownloadListener implements DownloadListener {
        @Override
        public void onDownloadStart(
                String url,
                String userAgent,
                String contentDisposition,
                String mimeType,
                long contentLength
        ) {
            PendingDownload download = new PendingDownload(
                    url,
                    userAgent,
                    contentDisposition,
                    mimeType
            );
            if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P
                    && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {
                pendingDownload = download;
                requestPermissions(
                        new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE},
                        STORAGE_PERMISSION_REQUEST
                );
                return;
            }
            enqueueDownload(download);
        }
    }

    private void enqueueDownload(PendingDownload download) {
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(download.url));
            String filename = URLUtil.guessFileName(
                    download.url,
                    download.contentDisposition,
                    download.mimeType
            );
            String cookie = CookieManager.getInstance().getCookie(download.url);
            if (cookie != null && !cookie.isBlank()) request.addRequestHeader("Cookie", cookie);
            if (download.userAgent != null) request.addRequestHeader("User-Agent", download.userAgent);
            request.setTitle(filename);
            request.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
            );
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            manager.enqueue(request);
            Toast.makeText(this, R.string.download_started, Toast.LENGTH_SHORT).show();
        } catch (RuntimeException exception) {
            Toast.makeText(this, R.string.download_failed, Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || fileChooserCallback == null) return;
        Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        fileChooserCallback.onReceiveValue(result);
        fileChooserCallback = null;
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            String[] permissions,
            int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        boolean granted = grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (requestCode == AUDIO_PERMISSION_REQUEST && pendingWebPermission != null) {
            if (granted) {
                pendingWebPermission.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            } else {
                pendingWebPermission.deny();
                Toast.makeText(this, R.string.microphone_denied, Toast.LENGTH_SHORT).show();
            }
            pendingWebPermission = null;
        } else if (requestCode == STORAGE_PERMISSION_REQUEST && pendingDownload != null) {
            if (granted) enqueueDownload(pendingDownload);
            else Toast.makeText(this, R.string.download_failed, Toast.LENGTH_SHORT).show();
            pendingDownload = null;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onPause() {
        webView.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
        if (pendingWebPermission != null) pendingWebPermission.deny();
        webView.stopLoading();
        webView.setWebChromeClient(null);
        webView.setWebViewClient(null);
        webView.destroy();
        super.onDestroy();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static final class PendingDownload {
        final String url;
        final String userAgent;
        final String contentDisposition;
        final String mimeType;

        PendingDownload(String url, String userAgent, String contentDisposition, String mimeType) {
            this.url = url;
            this.userAgent = userAgent;
            this.contentDisposition = contentDisposition;
            this.mimeType = mimeType;
        }
    }
}
