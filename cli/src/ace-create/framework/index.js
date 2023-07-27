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

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const { copy, replaceInfo } = require('../util');
const { isNativeCppTemplate } = require('../../util');
const {
    Platform,
    platform
} = require('../../ace-check/platform');
let projectDir;

function createFramework(projectPath, frameworkName) {
    try {
        projectDir = projectPath;
        libraryPath = path.join(projectDir, '.arkui-x/ios');
        fs.mkdirSync(libraryPath, { recursive: true });
        findFrameworkTemplate(libraryPath, frameworkName);
        return true;
    } catch (error) {
        console.log('framework created failed! Target directory：' + projectPath + ' .' + error);
        return false;
    }
}

function findFrameworkTemplate(libraryPath, frameworkName) {
    let templatePath = path.join(__dirname, 'template');
    if (fs.existsSync(templatePath)) {
        copyTemplate(templatePath, libraryPath);
        replaceFrameworkInfo(libraryPath, frameworkName);
    } else {
        templatePath = path.join(__dirname, '../../../templates');
        if (fs.existsSync(templatePath)) {
            copyTemplate(templatePath, libraryPath);
            replaceFrameworkInfo(libraryPath, frameworkName);
        } else {
            console.log('Error: Template is not exist!');
        }
    }
}

function copyTemplate(templatePath, libraryPath) {
    try {
        const files = ['AppDelegate_stage.h', 'AppDelegate_stage.m',
            'EntryEntryAbilityViewController.h', 'EntryEntryAbilityViewController.m'];
        copy(path.join(templatePath, 'framework'), path.join(libraryPath));
        files.forEach(fileName => {
            fs.copyFileSync(path.join(templatePath, 'ios/etsapp', fileName),
                path.join(libraryPath, 'MyFramework', fileName));
        });
    } catch (err) {
        console.error('Error: Copy template failed!\n', err);
    }
}

function replaceFrameworkInfo(frameworkPath, frameworkName) {
    const files = [];
    const replaceInfos = [];
    const strs = [];
    try {
        files.push(path.join(frameworkPath, 'MyFramework.xcodeproj/project.pbxproj'));
        replaceInfos.push('MyFramework');
        strs.push(frameworkName);
        files.push(path.join(frameworkPath, 'MyFramework/MyFramework.h'));
        replaceInfos.push('MyFramework');
        strs.push(frameworkName);
        fs.renameSync(path.join(frameworkPath, 'MyFramework/AppDelegate_stage.h'),
            path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.h'));
        fs.renameSync(path.join(frameworkPath, 'MyFramework/AppDelegate_stage.m'),
            path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.m'));
        fs.writeFileSync(path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.m'),
            fs.readFileSync(path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.m')).toString().
                replace('BUNDLE_DIRECTORY];',
                ` [NSString stringWithFormat:@"%@%@",@"/Frameworks/${frameworkName}.framework/",BUNDLE_DIRECTORY]];`));
        files.push(path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.m'));
        replaceInfos.push('packageName');
        strs.push(`com.example.${frameworkName}`);

        files.push(path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.h'));
        replaceInfos.push('AppDelegate');
        strs.push('ArkUIAppDelegate');
        files.push(path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.m'));
        replaceInfos.push('AppDelegate');
        strs.push('ArkUIAppDelegate');
        replaceInfo(files, replaceInfos, strs);

        modifyXcodeProj(frameworkPath);
        fs.renameSync(path.join(frameworkPath, 'MyFramework/MyFramework.h'),
            path.join(frameworkPath, `MyFramework/${frameworkName}.h`));
        fs.renameSync(path.join(frameworkPath, 'MyFramework.xcodeproj'),
            path.join(frameworkPath, `${frameworkName}.xcodeproj`));
        fs.renameSync(path.join(frameworkPath, 'MyFramework'), path.join(frameworkPath, frameworkName));
    } catch (err) {
        console.error(err);
    }
}

function modifyXcodeProj(frameworkPath) {
    const xcodeProjFile = path.join(frameworkPath, 'MyFramework.xcodeproj/project.pbxproj');
    const xcodeProjInfo = fs.readFileSync(xcodeProjFile, 'utf8').split(/\r\n|\n|\r/gm);
    if (!isNativeCppTemplate(projectDir)) {
        for (let i = 0; i < xcodeProjInfo.length; i++) {
            if (xcodeProjInfo[i].indexOf(`/* hello`) !== -1 || xcodeProjInfo[i].indexOf('USER_HEADER') !== -1) {
                xcodeProjInfo.splice(i, 1);
                i--;
            }
        }
    }
    fs.writeFileSync(xcodeProjFile, xcodeProjInfo.join('\r\n'));
}

module.exports = createFramework;
