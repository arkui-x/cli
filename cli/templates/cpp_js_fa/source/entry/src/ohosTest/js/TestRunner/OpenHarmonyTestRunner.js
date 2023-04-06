import hilog from '@ohos.hilog';
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
        hilog.isLoggable(0x0000, 'testTag', hilog.LogLevel.INFO);
        hilog.info(0x0000, 'testTag', '%{public}s', 'OpenHarmonyTestRunner OnPrepare');
    },
    onRun() {
        hilog.isLoggable(0x0000, 'testTag', hilog.LogLevel.INFO);
        hilog.isLoggable(0x0000, 'testTag', hilog.LogLevel.INFO);
        hilog.info(0x0000, 'testTag', '%{public}s', 'OpenHarmonyTestRunner onRun run');
        var abilityDelegatorArguments = AbilityDelegatorRegistry.getArguments()
        var abilityDelegator = AbilityDelegatorRegistry.getAbilityDelegator()

        var testAbilityName = abilityDelegatorArguments.parameters['-p'] + '.TestAbility'
        var cmd = 'aa start -d 0 -a ' + testAbilityName + ' -b ' + abilityDelegatorArguments.bundleName
        cmd += ' ' + translateParamsToString(abilityDelegatorArguments.parameters)
        var debug = abilityDelegatorArguments.parameters["-D"]
        if (debug == 'true')
        {
            cmd += ' -D'
        }
        hilog.info(0x0000, 'testTag', 'cmd : %{public}s', cmd);
        abilityDelegator.executeShellCommand(cmd, (err, data) => {
            hilog.info(0x0000, 'testTag', 'executeShellCommand : err : %{public}s', JSON.stringify(err) ?? '');
            hilog.info(0x0000, 'testTag', 'executeShellCommand : data : %{public}s', data.stdResult ?? '');
            hilog.info(0x0000, 'testTag', 'executeShellCommand : data : %{public}s', data.exitCode ?? '');
        })
    }
};