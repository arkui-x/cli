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

import TestRunner from '@ohos.application.testRunner';
import AbilityDelegatorRegistry from '@ohos.app.ability.abilityDelegatorRegistry';

var abilityDelegator = undefined
var abilityDelegatorArguments = undefined

async function onAbilityCreateCallback() {
    console.log('onAbilityCreateCallback');
}

async function addAbilityMonitorCallback(err: any) {
    console.log('addAbilityMonitorCallback');
}

export default class OpenHarmonyTestRunner implements TestRunner {
    constructor() {
    }

    onPrepare() {
        console.log('onPrepare');
    }

    async onRun() {
        console.log('onRun');
        abilityDelegatorArguments = AbilityDelegatorRegistry.getArguments()
        abilityDelegator = AbilityDelegatorRegistry.getAbilityDelegator()
        var bundleName = abilityDelegatorArguments.bundleName
        var parameters = abilityDelegatorArguments.parameters
        let moduleName = parameters["moduleName"]
        let lMonitor = {
            abilityName: "TestAbility",
            onAbilityCreate: onAbilityCreateCallback,
        };
        abilityDelegator.addAbilityMonitor(lMonitor, addAbilityMonitorCallback)
        let want = {
            abilityName: "TestAbility",
            bundleName: bundleName,
            moduleName: moduleName
        };
        abilityDelegator.startAbility(want, (err: any, data: any) => {
            console.log('startAbility' + err + data);
        });
    }
}