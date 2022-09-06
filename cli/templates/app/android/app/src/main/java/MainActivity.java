package packageName;

import android.os.Bundle;
import android.os.PersistableBundle;
import android.util.Log;

import ohos.ace.adapter.AceActivity;

import androidx.annotation.Nullable;

public class MainActivity extends AceActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Log.e("HiHelloWorld", "MainActivity");
        setInstanceName("EntryMainAbility");
        super.onCreate(savedInstanceState);
    }
}