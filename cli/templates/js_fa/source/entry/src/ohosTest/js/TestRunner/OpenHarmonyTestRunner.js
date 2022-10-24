/*
 * Copyright (c) 2022 Huawei Device Co., Ltd.
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

import AbilityDelegatorRegistry from '@ohos.application.abilityDelegatorRegistry'

function translateParamsToString(parameters) {
    const keySet = new Set([
        '-s class', '-s notClass', '-s suite', '-s itName',
        '-s level', '-s testType', '-s size', '-s timeout',
        '-s package', '-s dryRun'
    ])
    let targetParams = '';
    for (const key in parameters) {
        if (keySet.has(key)) {
            targetParams += ' ' + key + ' ' + parameters[key]
        }
    }
    return targetParams.trim()
}

 export default {
    onPrepare() {
        console.debug('OpenHarmonyTestRunner OnPrepare')
    },
    onRun() {
        console.log('OpenHarmonyTestRunner onRun run')
        var abilityDelegatorArguments = AbilityDelegatorRegistry.getArguments()
        var abilityDelegator = AbilityDelegatorRegistry.getAbilityDelegator()

        var testAbilityName = abilityDelegatorArguments.parameters['-p'] + '.TestAbility'
        var cmd = 'aa start -d 0 -a ' + testAbilityName + ' -b ' + abilityDelegatorArguments.bundleName
        cmd += ' ' + translateParamsToString(abilityDelegatorArguments.parameters)
        var debug = abilityDelegatorArguments.parameters["-D"]
        console.debug('debug value : '+debug)
        if (debug == 'true')
        {
            cmd += ' -D'
        }
        console.debug('cmd : '+cmd)
        abilityDelegator.executeShellCommand(cmd, (err, data) => {
            console.debug('executeShellCommand : err : ' + JSON.stringify(err));
            console.debug('executeShellCommand : data : ' + data.stdResult);
            console.debug('executeShellCommand : data : ' + data.exitCode);
        })
    }
};