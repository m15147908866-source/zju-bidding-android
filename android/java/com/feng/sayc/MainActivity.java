package com.feng.sayc;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * SAYC 叫牌练习 —— 单一 WebView 外壳。
 *
 * 页面不再用 file:// 打开，而是挂在虚拟源 https://appassets.androidplatform.net/ 下：
 *   - file:// 页面的 Origin 是 null，fetch 第三方 API 会被 CORS 拦住（旧版 APK 无法调用 AI 接口的根因）；
 *   - 官方反模式 setAllowUniversalAccessFromFileURLs(true) 在 API 30+ 已废弃，
 *     且会把所有 file:// 内容暴露给任意页面；
 *   - 虚拟 https 源下 localStorage / fetch / 相对路径脚本的行为与普通网站一致，
 *     不需要放开任何 file 访问开关。
 * 资源由 shouldInterceptRequest 从 assets 读取，仍然完全离线。
 */
public class MainActivity extends Activity {

    private static final String BG = "#f6f3ec";
    private static final String ORIGIN = "https://appassets.androidplatform.net/";
    private static final String HOST = "appassets.androidplatform.net";

    private WebView web;
    private SharedPreferences prefs;
    private final ExecutorService netPool = Executors.newCachedThreadPool();

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("sayc_store", MODE_PRIVATE);

        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor(BG));
        w.setNavigationBarColor(Color.parseColor(BG));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        // 页面全部走虚拟 https 源，file/content 访问一律关闭
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        // 不写死 textZoom：交给系统字体大小设置，保留无障碍缩放
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            s.setForceDark(WebSettings.FORCE_DARK_OFF);
        }

        web.setBackgroundColor(Color.parseColor(BG));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setWebViewClient(new AssetClient());
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new Store(), "AndroidStore");
        web.addJavascriptInterface(new Http(), "AndroidHttp");

        setContentView(web);
        web.loadUrl(ORIGIN + "index.html");
    }

    /** 只服务内置资源；站外链接一律拦下（这个壳不承担浏览器职责） */
    private class AssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            Uri uri = req.getUrl();
            if (!HOST.equals(uri.getHost())) return null;
            String path = uri.getPath();
            if (path == null || path.equals("/")) path = "/index.html";
            if (path.startsWith("/")) path = path.substring(1);
            try {
                InputStream in = getAssets().open(path);
                String mime = mimeOf(path);
                WebResourceResponse res = new WebResourceResponse(mime, "utf-8", in);
                Map<String, String> h = new HashMap<>();
                h.put("Cache-Control", "no-cache");
                res.setResponseHeaders(h);
                return res;
            } catch (IOException e) {
                return null;   // WebView 按 404 处理
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
            return !HOST.equals(req.getUrl().getHost());
        }

        /** API 23 没有 WebResourceRequest 版本，补一个旧重载 */
        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri u = Uri.parse(url);
            return !HOST.equals(u.getHost());
        }
    }

    private static String mimeOf(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json") || p.endsWith(".webmanifest") || p.endsWith(".manifest")) return "application/json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".ico")) return "image/x-icon";
        return "application/octet-stream";
    }

    /**
     * 原生 HTTP 出口。页面是从虚拟 https 源打开的，fetch 第三方接口会受 CORS 限制；
     * 这里用 HttpURLConnection 代发请求，结果通过 window.__nativeHttpDone(id, json) 回传。
     * 异步执行，避免卡住 WebView 的 JS 线程。
     */
    public class Http {
        @JavascriptInterface
        public void postJsonAsync(final String id, final String url, final String headersJson, final String body) {
            netPool.execute(() -> {
                final String result = doPost(url, headersJson, body);
                final WebView view = web;
                if (view == null) return;
                final String js = "window.__nativeHttpDone(" + JSONObject.quote(id) + "," + JSONObject.quote(result) + ")";
                view.post(() -> view.evaluateJavascript(js, null));
            });
        }
    }

    private static String doPost(String url, String headersJson, String body) {
        HttpURLConnection conn = null;
        try {
            JSONObject hdr = new JSONObject(headersJson);
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(90000);
            conn.setDoOutput(true);
            conn.setInstanceFollowRedirects(true);
            for (Iterator<String> it = hdr.keys(); it.hasNext(); ) {
                String k = it.next();
                conn.setRequestProperty(k, hdr.optString(k));
            }
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes("UTF-8"));
            }
            int code = conn.getResponseCode();
            InputStream is = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
            String text = readAll(is);
            JSONObject res = new JSONObject();
            res.put("ok", code >= 200 && code < 300);
            res.put("status", code);
            res.put("body", text);
            return res.toString();
        } catch (Exception e) {
            try {
                JSONObject res = new JSONObject();
                res.put("ok", false);
                res.put("error", e.toString());
                return res.toString();
            } catch (Exception ignored) {
                return "{\"ok\":false,\"error\":\"unknown\"}";
            }
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static String readAll(InputStream in) throws IOException {
        if (in == null) return "";
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        in.close();
        return out.toString("UTF-8");
    }

    /**
     * 用 SharedPreferences 承接页面的存取请求：WebView 的 localStorage 在清数据/升级后
     * 可能丢失，走原生桥可以保证「多局记录」在重启后依然在。
     */
    public class Store {
        @JavascriptInterface
        public String getItem(String key) {
            return prefs.getString(key, null);
        }

        @JavascriptInterface
        public void setItem(String key, String value) {
            prefs.edit().putString(key, value).apply();
        }

        @JavascriptInterface
        public void removeItem(String key) {
            prefs.edit().remove(key).apply();
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && web != null) {
            if (web.canGoBack()) {
                web.goBack();
                return true;
            }
            // 先让页面关掉浮层（设置、体系选择、含义气泡、结算卡）；
            // 页面没有可关的层时才退出，避免把整个应用误关掉。
            web.evaluateJavascript(
                "(window.__androidBack && window.__androidBack()) ? '1' : '0'",
                value -> { if (!"\"1\"".equals(value)) finish(); });
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        netPool.shutdownNow();
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
