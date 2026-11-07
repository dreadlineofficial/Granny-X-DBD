package io.github.froodyofficial.grannyxdbd;

import android.app.Activity;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import android.webkit.WebViewClient;

// if the graphics driver takes the page down, come straight back instead of closing the app
public class GameClient extends WebViewClient {
  private final Activity activity;
  public GameClient(Activity a) { activity = a; }
  @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) { activity.recreate(); return true; }
}
