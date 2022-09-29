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
        console.info('OpenHarmonyTestRunner OnPrepare')
    },
    onRun() {
        console.log('OpenHarmonyTestRunner onRun run')
        var abilityDelegatorArguments = AbilityDelegatorRegistry.getArguments()
        var abilityDelegator = AbilityDelegatorRegistry.getAbilityDelegator()

        var testAbilityName = abilityDelegatorArguments.parameters['-p'] + '.TestAbility'
        var cmd = 'aa start -d 0 -a ' + testAbilityName + ' -b ' + abilityDelegatorArguments.bundleName
        cmd += ' ' + translateParamsToString(abilityDelegatorArguments.parameters)
        var debug = abilityDelegatorArguments.parameters["-D"]
        console.info('debug value : '+debug)
        if (debug == 'true')
        {
            cmd += ' -D'
        }
        console.info('cmd : '+cmd)
        abilityDelegator.executeShellCommand(cmd, (err, data) => {
            console.info('executeShellCommand : err : ' + JSON.stringify(err));
            console.info('executeShellCommand : data : ' + data.stdResult);
            console.info('executeShellCommand : data : ' + data.exitCode);
        })
    }
};