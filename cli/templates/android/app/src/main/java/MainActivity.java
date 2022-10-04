package packageName;

import android.os.Bundle;
import android.os.PersistableBundle;
import android.util.Log;

import ohos.ace.adapter.AceActivity;

import androidx.annotation.Nullable;

/**
 * Example ace activity class, which will load arkui-crossplatform ability instance.
 * AceActivity is provided by arkui-crossplatform
 * @see <a href=
 * "https://gitee.com/arkui-crossplatform/doc/blob/master/contribute/tutorial/how-to-build-Android-app.md">
 * to build android library</a>
 */
public class MainActivity extends AceActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Log.e("HiHelloWorld", "MainActivity");
        setVersion(ACE_VERSION);
        setInstanceName("ArkUIInstanceName");
        super.onCreate(savedInstanceState);
    }
}