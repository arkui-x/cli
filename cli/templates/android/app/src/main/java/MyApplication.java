package packageName;

import android.util.Log;

import ohos.ace.adapter.AceApplication;

/**
 * Example ace application class, which will load ArkUI-X application instance.
 * AceApplication is provided by ArkUI-X
 * @see <a href=
 * "https://gitee.com/arkui-x/doc/blob/master/contribute/tutorial/how-to-build-Android-app.md">
 * to build android library</a>
 */
public class MyApplication extends AceApplication {
    private static final String LOG_TAG = "HiHelloWorld";

    private static final String RES_NAME = "res";

    @Override
    public void onCreate() {
        Log.e(LOG_TAG, "MyApplication");
        super.onCreate();
        Log.e(LOG_TAG, "MyApplication onCreate");
    }
}