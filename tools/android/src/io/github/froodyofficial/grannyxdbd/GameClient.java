package io.github.froodyofficial.grannyxdbd;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import android.webkit.WebViewClient;

// if the graphics driver takes the page down, come straight back instead of closing the app
public class GameClient extends WebViewClient {
  private final Activity activity;
  public GameClient(Activity a) { activity = a; }
  // web links (the Discord button) open in the phone's browser / the Discord app, never inside the game
  @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
    Uri u = req.getUrl(); String sc = u.getScheme();
    if ("http".equals(sc) || "https".equals(sc)) {
      try { activity.startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) {}
      return true;
    }
    return false;
  }
  @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) { activity.recreate(); return true; }
}
