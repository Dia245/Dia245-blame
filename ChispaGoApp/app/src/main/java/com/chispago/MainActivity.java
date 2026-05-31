package com.chispago;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.*;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private static final int LOCATION_PERMISSION_CODE = 1001;

    // Guardamos el callback del WebView para invocarlo tras el resultado
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getSupportActionBar() != null) getSupportActionBar().hide();
        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.webView);

        // PASO 1: Pedir permiso Android ANTES de cargar la página
        if (hasLocationPermission()) {
            loadApp();
        } else {
            requestLocationPermission();
        }
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this,
                Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
    }

    private void requestLocationPermission() {
        ActivityCompat.requestPermissions(this,
            new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }, LOCATION_PERMISSION_CODE);
    }

    @Override
    public void onRequestPermissionsResult(int code,
            String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);

        if (code == LOCATION_PERMISSION_CODE) {
            boolean granted = results.length > 0
                && results[0] == PackageManager.PERMISSION_GRANTED;

            // Si hay un callback pendiente del WebView, resolverlo
            if (pendingGeoCallback != null) {
                pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
                pendingGeoCallback = null;
            }

            if (granted) {
                // Permiso concedido → cargar o recargar la app
                if (webView.getUrl() == null) loadApp();
                else webView.evaluateJavascript("onAndroidPermissionGranted()", null);
            } else {
                // Permiso denegado permanentemente → mostrar diálogo
                if (!ActivityCompat.shouldShowRequestPermissionRationale(
                        this, Manifest.permission.ACCESS_FINE_LOCATION)) {
                    showGoToSettingsDialog();
                } else {
                    // Cargamos igual, el HTML mostrará modo manual
                    loadApp();
                    if (webView.getUrl() != null)
                        webView.evaluateJavascript("onAndroidPermissionDenied()", null);
                }
            }
        }
    }

    private void loadApp() {
        setupWebView();
        webView.loadUrl("file:///android_asset/index.html");
    }

    private void setupWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setGeolocationEnabled(true);
        s.setGeolocationDatabasePath(getFilesDir().getPath());
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                    GeolocationPermissions.Callback callback) {
                if (hasLocationPermission()) {
                    // Ya tenemos permiso Android → conceder directamente al WebView
                    callback.invoke(origin, true, false);
                } else {
                    // Guardar callback y pedir permiso Android
                    pendingGeoCallback = callback;
                    pendingGeoOrigin   = origin;
                    requestLocationPermission();
                }
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage msg) {
                android.util.Log.d("ChispaGo",
                    msg.message() + " [" + msg.sourceId() + ":" + msg.lineNumber() + "]");
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                String url = req.getUrl().toString();
                if (url.startsWith("file://")) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                return true;
            }
        });

        // Interfaz JS → Android para que el HTML pueda consultar el estado
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
    }

    // Puente Java ↔ JavaScript
    class AndroidBridge {
        @JavascriptInterface
        public boolean hasLocationPermission() {
            return MainActivity.this.hasLocationPermission();
        }

        @JavascriptInterface
        public void requestPermission() {
            runOnUiThread(() -> requestLocationPermission());
        }
    }

    private void showGoToSettingsDialog() {
        new AlertDialog.Builder(this)
            .setTitle("Permiso de ubicación requerido")
            .setMessage("El permiso fue denegado permanentemente. Ve a Ajustes > Aplicaciones > Chispa Go > Permisos y activa \"Ubicación\".")
            .setPositiveButton("Ir a Ajustes", (d, w) -> {
                Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.fromParts("package", getPackageName(), null));
                startActivity(i);
            })
            .setNegativeButton("Continuar sin GPS", (d, w) -> loadApp())
            .setCancelable(false)
            .show();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
