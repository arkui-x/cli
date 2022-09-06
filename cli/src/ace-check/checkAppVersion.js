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

const process = require('child_process');
const { Platform, platform } = require('./platform');

function checkXcodeVersion() {
    try {
        if (platform === Platform.MacOS) {
            return process.execSync(`xcodebuild  -version`).toString().replace(/\n/g, '');
        }
        return "";
    } catch (err) {
    }
}
function checkIdeviceVersion() {
    try {
        if (platform === Platform.MacOS) {
            return process.execSync(`idevicesyslog -v`).toString().replace(/\n/g, '');
        }
        return "";
    } catch (err) {
    }
}
function checkDeployVersion() {
    try {
        if (platform === Platform.MacOS) {
            return process.execSync(`ios-deploy -V`).toString().replace(/\n/g, '');
        }
        return "";
    } catch (err) {
    }
}

module.exports = {
    checkXcodeVersion,
    checkIdeviceVersion,
    checkDeployVersion
};
