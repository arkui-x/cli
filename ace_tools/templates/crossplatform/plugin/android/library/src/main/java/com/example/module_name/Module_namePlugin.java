package com.example.module_name;

import android.content.Context;
import android.os.Build;
import android.util.Log;

public class Module_namePlugin {
    private static final String TAG = "Module_namePlugin";

    public Module_namePlugin(Context context) {
        nativeInit();
    }

    protected native void nativeInit();

    public int add(int a, int b) {
        return a + b;
    }

    public void log(String msg) {
        Log.d(TAG, msg);
    }

    public String getSystemVersion() {
        return Build.VERSION.RELEASE;
    }

    public String getFullOSName() {
        return "Android " + Build.VERSION.RELEASE;
    }

    public String getDeviceType() {
        return "Phone";
    }
}
