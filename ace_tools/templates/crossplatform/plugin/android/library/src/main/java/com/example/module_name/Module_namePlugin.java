/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
