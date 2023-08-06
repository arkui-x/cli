package packageName;

import android.os.Bundle;
import android.util.Log;

import ohos.ace.adapter.AceActivity;


/**
 * Example ace activity class, which will load ArkUI-X ability instance.
 * AceActivity is provided by ArkUI-X
 * @see <a href=
 * "https://gitee.com/arkui-crossplatform/doc/blob/master/contribute/tutorial/how-to-build-Android-app.md">
 * to build android library</a>
 */
public class MainActivity extends AceActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Log.e("HiHelloWorld", "MainActivity");
        setInstanceName("ArkUIInstanceName");
        super.onCreate(savedInstanceState);
    }
}
