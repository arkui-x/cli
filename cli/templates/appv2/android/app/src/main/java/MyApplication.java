package packageName;

import android.util.Log;

import ohos.ace.adapter.AceApplication;

public class MyApplication extends AceApplication {
    private static final String LOG_TAG = "HiHelloWorld";

    private static final String RES_NAME = "res";

    @Override
    public void onCreate() {
        Log.e(LOG_TAG, "MyApplication");
        super.onCreate();
        Log.e(LOG_TAG, "MyApplication is onCreate");
    }
}