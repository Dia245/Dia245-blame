package com.chispago;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.net.Uri;
import android.os.Bundle;
import android.os.Looper;
import android.provider.Settings;
import android.webkit.*;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.*;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private FusedLocationProviderClient fusedClient;
    private static final int LOCATION_PERMISSION_CODE = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getSupportActionBar() != null) getSupportActionBar().hide();
        setContentView(R.layout.activity_main);

        fusedClient = LocationServices.getFusedLocationProviderClient(this);
        webView = findViewById(R.id.webView);
        setupWebView();
        webView.loadUrl("file:///android_asset/index.html");

        // Pedir permiso inmediatamente al abrir
        if (!hasPermission()) {
            ActivityCompat.requestPermissions(this,
                new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                }, LOCATION_PERMISSION_CODE);
        }
    }

    private boolean hasPermission() {
        return ContextCompat.checkSelfPermission(this,
            Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void setupWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);

        // Puente Java → JS: el HTML llama a AndroidGPS.getLocation()
        webView.addJavascriptInterface(new AndroidGPS(), "AndroidGPS");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                    GeolocationPermissions.Callback cb) {
                cb.invoke(origin, true, true); // siempre conceder
            }
            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                android.util.Log.d("ChispaGo", m.message());
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                String url = r.getUrl().toString();
                if (url.startsWith("file://")) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                return true;
            }
        });
    }

    // ── PUENTE JAVA ↔ JS ─────────────────────────────────────────
    class AndroidGPS {

        @JavascriptInterface
        public boolean hasPermission() {
            return MainActivity.this.hasPermission();
        }

        // JS llama esto → Java obtiene GPS → llama receiveLocation() en JS
        @JavascriptInterface
        @SuppressLint("MissingPermission")
        public void getLocation() {
            if (!hasPermission()) {
                runOnUiThread(() ->
                    ActivityCompat.requestPermissions(MainActivity.this,
                        new String[]{Manifest.permission.ACCESS_FINE_LOCATION},
                        LOCATION_PERMISSION_CODE));
                return;
            }

            // 1. Intentar última ubicación conocida (instantáneo)
            fusedClient.getLastLocation().addOnSuccessListener(loc -> {
                if (loc != null) {
                    sendLocationToJS(loc);
                } else {
                    // 2. Si no hay última ubicación, pedir una nueva
                    requestFreshLocation();
                }
            }).addOnFailureListener(e -> requestFreshLocation());
        }

        @SuppressLint("MissingPermission")
        private void requestFreshLocation() {
            LocationRequest req = new LocationRequest.Builder(
                Priority.PRIORITY_HIGH_ACCURACY, 1000)
                .setMaxUpdates(1)
                .setWaitForAccurateLocation(false)
                .build();

            fusedClient.requestLocationUpdates(req,
                new LocationCallback() {
                    @Override
                    public void onLocationResult(LocationResult result) {
                        fusedClient.removeLocationUpdates(this);
                        Location loc = result.getLastLocation();
                        if (loc != null) sendLocationToJS(loc);
                        else callJS("onGPSError('Sin señal GPS. Activa la ubicación en Ajustes.')");
                    }
                }, Looper.getMainLooper());
        }

        private void sendLocationToJS(Location loc) {
            String js = String.format(
                "receiveLocation(%f, %f, %f)",
                loc.getLatitude(), loc.getLongitude(), loc.getAccuracy()
            );
            callJS(js);
        }
    }

    // Ejecutar JS en el hilo principal
    private void callJS(String js) {
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    @Override
    public void onRequestPermissionsResult(int code,
            String[] perms, int[] results) {
        super.onRequestPermissionsResult(code, perms, results);
        if (code == LOCATION_PERMISSION_CODE) {
            boolean granted = results.length > 0
                && results[0] == PackageManager.PERMISSION_GRANTED;
            if (granted) {
                // Decirle al HTML que ya tiene permiso y obtenga GPS
                callJS("onPermissionGranted()");
            } else if (!ActivityCompat.shouldShowRequestPermissionRationale(
                    this, Manifest.permission.ACCESS_FINE_LOCATION)) {
                // Denegado permanentemente → ir a ajustes
                new AlertDialog.Builder(this)
                    .setTitle("Permiso requerido")
                    .setMessage("Ve a Ajustes > Apps > Chispa Go > Permisos > Ubicación y actívalo.")
                    .setPositiveButton("Ir a Ajustes", (d, w) -> {
                        startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            Uri.fromParts("package", getPackageName(), null)));
                    })
                    .setNegativeButton("Cancelar", null)
                    .show();
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
