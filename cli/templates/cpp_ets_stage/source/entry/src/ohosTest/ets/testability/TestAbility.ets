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

import UIAbility from '@ohos.app.ability.UIAbility';
import AbilityDelegatorRegistry from '@ohos.app.ability.abilityDelegatorRegistry';
import { Hypium } from '@ohos/hypium';
import testsuite from '../test/List.test';
import window from '@ohos.window';

export default class TestAbility extends UIAbility {
    onCreate(want, launchParam) {
        console.log('onCreate');
        var abilityDelegator: any
        abilityDelegator = AbilityDelegatorRegistry.getAbilityDelegator()
        var abilityDelegatorArguments: any
        abilityDelegatorArguments = AbilityDelegatorRegistry.getArguments()
        Hypium.hypiumTest(abilityDelegator, abilityDelegatorArguments, testsuite)
    }

    onDestroy() {
        console.log('onDestroy');
    }

    onWindowStageCreate(windowStage: window.WindowStage) {
        console.log('onCreate');
        windowStage.loadContent('testability/pages/Index', (err, data) => {
            if (err.code) {
                console.log('loadContent error');
                return;
            }
            console.log('loadContent');
        });

        globalThis.abilityContext = this.context;
    }

    onWindowStageDestroy() {
        console.log('onWindowStageDestroy');
    }

    onForeground() {
        console.log('onForeground');
    }

    onBackground() {
        console.log('onBackground');
    }
}