package com.codeguru.tutor;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Code Guru - Android shell.
 * The tutor (HTML/JS + offline Python via Pyodide) lives in assets/www and is served from a
 * private https origin so that ES modules, web workers and WebAssembly work offline.
 * Progress is stored in the WebView's localStorage / IndexedDB on the phone only.
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.codeguru.local";
    private static final String ORIGIN = "https://" + HOST + "/";
    private static final int REQ_FILE = 41;
    private static final int REQ_SAVE = 42;

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingSaveData;
    private WebView printView;
    private TextToSpeech tts;
    private boolean ttsReady = false;

    private static final Map<String, String> MIME = new HashMap<>();
    static {
        MIME.put("html", "text/html");
        MIME.put("js", "text/javascript");
        MIME.put("mjs", "text/javascript");
        MIME.put("css", "text/css");
        MIME.put("json", "application/json");
        MIME.put("wasm", "application/wasm");
        MIME.put("zip", "application/zip");
        MIME.put("png", "image/png");
        MIME.put("svg", "image/svg+xml");
        MIME.put("txt", "text/plain");
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#13111C"));
        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        applySystemBarInsets(root);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(true);

        webView.addJavascriptInterface(new AppBridge(), "AndroidApp");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (!HOST.equals(u.getHost())) {
                    return null;
                }
                return serveAsset(u.getPath());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equals(uri.getHost())) {
                    return false;
                }
                openOutside(uri);
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = callback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Choose file"), REQ_FILE);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        tts = new TextToSpeech(this, status -> ttsReady = status == TextToSpeech.SUCCESS);
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override
            public void onStart(String id) { }

            @Override
            public void onDone(String id) {
                if (id != null && id.endsWith("#last")) {
                    jsCall("window.__ttsDone&&window.__ttsDone()");
                }
            }

            @Override
            @SuppressWarnings("deprecation")
            public void onError(String id) {
                if (id != null && id.endsWith("#last")) {
                    jsCall("window.__ttsDone&&window.__ttsDone()");
                }
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        }
        if (webView.getUrl() == null) {
            webView.loadUrl(ORIGIN + "index.html");
        }
    }

    /** Serves files from assets/www with correct MIME types (needed for .mjs and .wasm). */
    private WebResourceResponse serveAsset(String path) {
        if (path == null || path.equals("/") || path.isEmpty()) {
            path = "/index.html";
        }
        if (path.contains("..")) {
            return notFound();
        }
        String file = "www" + path;
        String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
        try {
            InputStream in = getAssets().open(file);
            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Cache-Control", "no-cache");
            boolean text = mime.startsWith("text/") || mime.equals("application/json");
            return new WebResourceResponse(mime, text ? "utf-8" : null, 200, "OK", headers, in);
        } catch (IOException e) {
            return notFound();
        }
    }

    private WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<>(),
                new java.io.ByteArrayInputStream(new byte[0]));
    }

    private void openOutside(Uri uri) {
        try {
            String scheme = uri.getScheme();
            Intent i = "mailto".equals(scheme) ? new Intent(Intent.ACTION_SENDTO, uri) : new Intent(Intent.ACTION_VIEW, uri);
            startActivity(i);
        } catch (Exception ignored) {
            // no app can open this link
        }
    }

    private void jsCall(final String js) {
        runOnUiThread(() -> {
            if (webView != null) {
                webView.evaluateJavascript(js, null);
            }
        });
    }

    /** Keeps the app clear of the status bar, navigation bar and keyboard (edge-to-edge on Android 15+). */
    private void applySystemBarInsets(final View root) {
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int left;
            int top;
            int right;
            int bottom;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets bars = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets ime = insets.getInsets(WindowInsets.Type.ime());
                left = bars.left;
                top = bars.top;
                right = bars.right;
                bottom = Math.max(bars.bottom, ime.bottom);
            } else {
                left = insets.getSystemWindowInsetLeft();
                top = insets.getSystemWindowInsetTop();
                right = insets.getSystemWindowInsetRight();
                bottom = insets.getSystemWindowInsetBottom();
            }
            v.setPadding(left, top, right, bottom);
            return insets;
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
            if (fileCallback != null) {
                fileCallback.onReceiveValue(result);
                fileCallback = null;
            }
        } else if (requestCode == REQ_SAVE) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null && pendingSaveData != null) {
                try (OutputStream os = getContentResolver().openOutputStream(data.getData())) {
                    if (os != null) {
                        os.write(pendingSaveData.getBytes(StandardCharsets.UTF_8));
                    }
                    jsCall("window.CG&&CG.copy&&0;(function(){var t=document.getElementById('toast');if(t){t.textContent='\\u2705 Saved';t.className='toast show';setTimeout(function(){t.className='toast'},2000)}})()");
                } catch (IOException ignored) {
                    // could not write file
                }
            }
            pendingSaveData = null;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    /** Hardware back: let the app go back a screen; close only from the home screen. */
    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        webView.evaluateJavascript(
                "(function(){try{return window.__androidBack?window.__androidBack():'exit'}catch(e){return 'exit'}})()",
                value -> {
                    if (value == null || value.contains("exit")) {
                        finish();
                    }
                });
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (tts != null) {
            tts.stop();
        }
        if (webView != null) {
            webView.onPause();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.shutdown();
            tts = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    /** Prints an HTML page through Android's print service (the user can choose "Save as PDF"). */
    private void printHtmlPage(final String html, final String title) {
        printView = new WebView(this);
        printView.getSettings().setJavaScriptEnabled(false);
        printView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                if (pm != null) {
                    String job = title == null || title.isEmpty() ? "Code Guru" : title;
                    PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(job);
                    pm.print(job, adapter, new PrintAttributes.Builder().build());
                }
            }
        });
        printView.loadDataWithBaseURL(ORIGIN, html, "text/html", "utf-8", null);
    }

    /** Splits long text into pieces the TTS engine accepts. */
    private static List<String> chunks(String text, int max) {
        List<String> out = new ArrayList<>();
        String[] parts = text.split("(?<=[.!?।])\\s+");
        StringBuilder cur = new StringBuilder();
        for (String p : parts) {
            if (cur.length() + p.length() + 1 > max && cur.length() > 0) {
                out.add(cur.toString());
                cur.setLength(0);
            }
            while (p.length() > max) {
                out.add(p.substring(0, max));
                p = p.substring(max);
            }
            if (cur.length() > 0) {
                cur.append(' ');
            }
            cur.append(p);
        }
        if (cur.length() > 0) {
            out.add(cur.toString());
        }
        return out;
    }

    /** Functions the tutor page can call. */
    private class AppBridge {
        @JavascriptInterface
        public void speak(final String text, final String lang, final double rate) {
            runOnUiThread(() -> {
                if (tts == null || !ttsReady || text == null || text.trim().isEmpty()) {
                    jsCall("window.__ttsDone&&window.__ttsDone()");
                    return;
                }
                Locale loc = Locale.forLanguageTag(lang == null ? "en-IN" : lang);
                int r = tts.setLanguage(loc);
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                    tts.setLanguage(Locale.ENGLISH);
                }
                tts.setSpeechRate((float) Math.max(0.5, Math.min(2.0, rate)));
                tts.stop();
                List<String> parts = chunks(text, Math.max(200, TextToSpeech.getMaxSpeechInputLength() - 50));
                for (int i = 0; i < parts.size(); i++) {
                    String id = "cg" + i + (i == parts.size() - 1 ? "#last" : "");
                    tts.speak(parts.get(i), i == 0 ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD, null, id);
                }
            });
        }

        @JavascriptInterface
        public void printHtml(final String html, final String title) {
            runOnUiThread(() -> printHtmlPage(html, title));
        }

        @JavascriptInterface
        public void stopSpeak() {
            runOnUiThread(() -> {
                if (tts != null) {
                    tts.stop();
                }
            });
        }

        @JavascriptInterface
        public void copyText(final String text) {
            runOnUiThread(() -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (cm != null) {
                    cm.setPrimaryClip(ClipData.newPlainText("Code Guru", text));
                }
            });
        }

        @JavascriptInterface
        public void shareText(final String title, final String text) {
            runOnUiThread(() -> {
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("text/plain");
                send.putExtra(Intent.EXTRA_SUBJECT, title);
                send.putExtra(Intent.EXTRA_TEXT, text);
                try {
                    startActivity(Intent.createChooser(send, title));
                } catch (Exception ignored) {
                    // nothing to share with
                }
            });
        }

        @JavascriptInterface
        public void saveFile(final String name, final String data, final String mime) {
            runOnUiThread(() -> {
                pendingSaveData = data;
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType(mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
                i.putExtra(Intent.EXTRA_TITLE, name);
                try {
                    startActivityForResult(i, REQ_SAVE);
                } catch (ActivityNotFoundException e) {
                    pendingSaveData = null;
                    shareText(name, data);
                }
            });
        }
    }
}
