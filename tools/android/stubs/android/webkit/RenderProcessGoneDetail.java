package android.webkit;
// compile-time stand-in for the Android 8 (API 26) class, for building against an older android.jar; never packaged
public abstract class RenderProcessGoneDetail {
  public abstract boolean didCrash();
  public abstract int rendererPriorityAtExit();
}
