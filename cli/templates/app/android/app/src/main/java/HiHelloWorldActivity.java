package packageName;

import android.os.Bundle;
import android.os.PersistableBundle;
import android.util.Log;

import ohos.ace.adapter.AceActivity;

import androidx.annotation.Nullable;

public class HiHelloWorldActivity extends AceActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Log.e("HiHelloWorld", "HiHelloWorldActivity");
        setInstanceName("MainAbility");
        super.onCreate(savedInstanceState);
    }
}