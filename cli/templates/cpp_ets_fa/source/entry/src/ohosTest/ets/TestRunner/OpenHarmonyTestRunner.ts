import hilog from '@ohos.hilog';
import TestRunner from '@ohos.application.testRunner'
import AbilityDelegatorRegistry from '@ohos.application.abilityDelegatorRegistry'

var abilityDelegator = undefined
var abilityDelegatorArguments = undefined

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

async function onAbilityCreateCallback() {
    hilog.isLoggable(0x0000, 'testTag', hilog.LogLevel.INFO);
    hilog.info(0x0000, 'testTag', '%{public}s', 'onAbilityCreateCallback');
}

async function addAbilityMonitorCallback(err: any) {
    hilog.isLoggable(0x0000, 'testTag', hilog.LogLevel.INFO);
    hilog.info(0x0000, 'testTag', 'addAbilityMonitorCallback : %{public}s',
        JSON.stringify(err) ?? '');
}

export default class OpenHarmonyTestRunner implements TestRunner {
    constructor() {
    }

    onPrepare() {
        hilog.isLoggable(0x0000, 'testTag', hilog.LogLevel.INFO);
        hilog.info(0x0000, 'testTag', '%{public}s', 'OpenHarmonyTestRunner OnPrepare');
    }

    onRun() {
        hilog.isLoggable(0x0000, 'testTag', hilog.LogLevel.INFO);
        hilog.info(0x0000, 'testTag', '%{public}s', 'OpenHarmonyTestRunner onRun run');
        abilityDelegatorArguments = AbilityDelegatorRegistry.getArguments()
        abilityDelegator = AbilityDelegatorRegistry.getAbilityDelegator()

        let lMonitor = {
            abilityName: testAbilityName,
            onAbilityCreate: onAbilityCreateCallback,
        };
        var testAbilityName = abilityDelegatorArguments.parameters['-p'] + '.TestAbility'
        abilityDelegator.addAbilityMonitor(lMonitor, addAbilityMonitorCallback)
        var cmd = 'aa start -d 0 -a ' + testAbilityName + ' -b ' + abilityDelegatorArguments.bundleName
        cmd += ' '+translateParamsToString(abilityDelegatorArguments.parameters)
        var debug = abilityDelegatorArguments.parameters['-D']
        if (debug == 'true')
        {
            cmd += ' -D'
        }
        hilog.isLoggable(0x0000, 'testTag', hilog.LogLevel.INFO);
        hilog.info(0x0000, 'testTag', 'cmd : %{public}s', cmd);
        abilityDelegator.executeShellCommand(cmd,
            (err: any, d: any) => {
                hilog.info(0x0000, 'testTag', 'executeShellCommand : err : %{public}s',
                    JSON.stringify(err) ?? '');
                hilog.info(0x0000, 'testTag', 'executeShellCommand : data : %{public}s',
                    d.stdResult ?? '');
                hilog.info(0x0000, 'testTag', 'executeShellCommand : data : %{public}s',
                    d.exitCode ?? '');
            })
        hilog.info(0x0000, 'testTag', '%{public}s',
            'OpenHarmonyTestRunner onRun call abilityDelegator.getAppContext');
        var context = abilityDelegator.getAppContext()
        hilog.info(0x0000, 'testTag', 'getAppContext : %{public}s',
            JSON.stringify(context) ?? '');
        hilog.info(0x0000, 'testTag', '%{public}s', 'OpenHarmonyTestRunner onRun end');
    }
};