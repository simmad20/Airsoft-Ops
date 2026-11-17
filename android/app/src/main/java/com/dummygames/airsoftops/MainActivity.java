package com.dummygames.airsoftops;

import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // A round must never be cut short by the screen going dark (the web app's wake lock does not exist in every WebView).
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Back button: during a round the web app keeps an extra history entry and shows "keep the app open",
        // so going back in the WebView is safe. With nothing to go back to, the app goes to the background
        // instead of closing, so a running session or round is not lost.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView web = getBridge() != null ? getBridge().getWebView() : null;
                if (web != null && web.canGoBack()) {
                    web.goBack();
                } else {
                    moveTaskToBack(true);
                }
            }
        });
    }
}
