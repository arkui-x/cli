import AbilityDelegatorRegistry from '@ohos.application.abilityDelegatorRegistry'
import { Hypium } from '@ohos/hypium'
import testsuite from '../test/List.test'

export default {
    onCreate() {
        console.info("TestApplication onCreate")
        var abilityDelegator = AbilityDelegatorRegistry.getAbilityDelegator()
        var abilityDelegatorArguments = AbilityDelegatorRegistry.getArguments()
        console.info('start run testcase!!!')
        Hypium.hypiumTest(abilityDelegator, abilityDelegatorArguments, testsuite)
    },
    onDestroy() {
        console.info("TestApplication onDestroy");
    }
};
