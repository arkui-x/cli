/*
 * Copyright (c) 2023 Huawei Device Co., Ltd.
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

import Ability from '@ohos.application.Ability'
import Window from '@ohos.window'

export default class MainAbility extends Ability {
    onCreate(want, launchParam) {
        console.log('onCreate');
    }

    onDestroy() {
        console.log('onDestroy');
    }

    onWindowStageCreate(windowStage: Window.WindowStage) {
        console.log('onWindowStageCreate');
        // Main window is created, set main page for this ability

        windowStage.loadContent('pages/index', (err, data) => {
            if (err.code) {
                console.log('onWindowStageCreate err');
                return;
            }
        });
    }

    onWindowStageDestroy() {
        // Main window is destroyed, release UI related resources
        console.log('onWindowStageDestroy');
    }

    onForeground() {
        // Ability has brought to foreground
        console.log('onForeground');
    }

    onBackground() {
        // Ability has back to background
        console.log('onBackground');
    }
}
