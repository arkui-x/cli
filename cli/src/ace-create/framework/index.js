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
const { copy, rmdir, replaceInfo } = require('../project');
const { isProjectRootDir, getCurrentProjectVersion, isStageProject, isNativeCppTemplate } = require('../../util');
const {
    Platform,
    platform
} = require('../../ace-check/platform');
const projectDir = process.cwd();

function createFramework() {
    if (!isProjectRootDir(projectDir) || !isMacOSPlatform()) {
        return false;
    }
    inquirer.prompt([{
        name: 'frameworkName',
        type: 'input',
        message: 'Please enter the framework name:',
        validate(val) {
            if (val === '') {
                return 'framework name must be required!';
            }
            return true;
        }
    }]).then(answers => {
        const frameworkName = answers.frameworkName;
        if (!validateIllegalName(frameworkName)) {
            return false;
        }
        const frameworkPath = path.join(projectDir, 'ios', frameworkName);
        if (fs.existsSync(frameworkPath)) {
            inquirer.prompt([{
                name: 'delete',
                type: 'input',
                message: 'The framework directory already exists. Do you want to delete the directory (y / n):',
                validate(val) {
                    if (val.toLowerCase() !== 'y' && val.toLowerCase() !== 'n') {
                        return 'Please enter y / n!';
                    } else {
                        return true;
                    }
                }
            }]).then(answers => {
                if (answers.delete === 'y') {
                    try {
                        rmdir(frameworkPath);
                        console.log('Delete directory successfully, creating new framework.');
                    } catch (err) {
                        console.log(`Failed to delete ${frameworkPath}, please delete it do yourself.`);
                    }
                    createFrameworkPkg(frameworkPath, frameworkName);
                } else {
                    console.log('Failed to create framework, framework directory already exists.');
                }
            });
        } else {
            createFrameworkPkg(frameworkPath, frameworkName);
        }
    });
}

function createFrameworkPkg(frameworkPath, frameworkName) {
    try {
        fs.mkdirSync(frameworkPath);
        findFrameworkTemplate(frameworkPath, frameworkName);
        console.log('framework created successfully! Target directory：' + frameworkPath + ' .');
    } catch (error) {
        console.log('framework created failed! Target directory：' + frameworkPath + ' .' + error);
    }
}

function findFrameworkTemplate(frameworkPath, frameworkName) {
    let templatePath = path.join(__dirname, 'template');
    const appVer = getCurrentProjectVersion(projectDir);
    if (appVer == '') {
        console.log('project is not exists');
        return false;
    }
    if (fs.existsSync(templatePath)) {
        copyTemplate(templatePath, frameworkPath);
        replaceFrameworkInfo(frameworkPath, frameworkName, appVer);
    } else {
        templatePath = path.join(__dirname, '../../../templates');
        if (fs.existsSync(templatePath)) {
            copyTemplate(templatePath, frameworkPath);
            replaceFrameworkInfo(frameworkPath, frameworkName, appVer);
        } else {
            console.log('Error: Template is not exist!');
        }
    }
}

function copyTemplate(templatePath, frameworkPath) {
    try {
        let files;
        copy(path.join(templatePath, 'framework'), path.join(frameworkPath));
        if (isStageProject(path.join(projectDir, 'source'))) {
            files = ['AppDelegate_stage.h', 'AppDelegate_stage.m',
                'EntryMainViewController.h', 'EntryMainViewController.m'];
        } else {
            files = ['AppDelegate.h', 'AppDelegate.mm'];
        }
        files.forEach(fileName => {
            fs.copyFileSync(path.join(templatePath, 'ios/etsapp', fileName),
                path.join(frameworkPath, 'MyFramework', fileName));
        });
    } catch (err) {
        console.error('Error: Copy template failed!\n', err);
    }
}

function replaceFrameworkInfo(frameworkPath, frameworkName, appVer) {
    const aceVersion = appVer == 'js' ? 'ACE_VERSION_JS' : 'ACE_VERSION_ETS';
    const files = [];
    const replaceInfos = [];
    const strs = [];
    let moduleType;
    try {
        files.push(path.join(frameworkPath, 'MyFramework.xcodeproj/project.pbxproj'));
        replaceInfos.push('MyFramework');
        strs.push(frameworkName);
        files.push(path.join(frameworkPath, 'MyFramework/MyFramework.h'));
        replaceInfos.push('MyFramework');
        strs.push(frameworkName);
        if (isStageProject(path.join(projectDir, 'source'))) {
            moduleType = 'stage';
            fs.renameSync(path.join(frameworkPath, 'MyFramework/AppDelegate_stage.h'),
                path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.h'));
            fs.renameSync(path.join(frameworkPath, 'MyFramework/AppDelegate_stage.m'),
                path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.m'));
            files.push(path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.m'));
            replaceInfos.push('packageName');
            strs.push(`com.example.${frameworkName}`);
        } else {
            moduleType = 'fa';
            fs.renameSync(path.join(frameworkPath, 'MyFramework/AppDelegate.h'),
                path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.h'));
            fs.renameSync(path.join(frameworkPath, 'MyFramework/AppDelegate.mm'),
                path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.m'));
            files.push(path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.m'));
            replaceInfos.push('ACE_VERSION');
            strs.push(aceVersion);
        }

        files.push(path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.h'));
        replaceInfos.push('AppDelegate');
        strs.push('ArkUIAppDelegate');
        files.push(path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.m'));
        replaceInfos.push('AppDelegate');
        strs.push('ArkUIAppDelegate');
        replaceInfo(files, replaceInfos, strs);

        modifyXcodeProj(frameworkPath, moduleType);
        fs.renameSync(path.join(frameworkPath, 'MyFramework/MyFramework.h'),
            path.join(frameworkPath, `MyFramework/${frameworkName}.h`));
        fs.renameSync(path.join(frameworkPath, 'MyFramework.xcodeproj'),
            path.join(frameworkPath, `${frameworkName}.xcodeproj`));
        fs.renameSync(path.join(frameworkPath, 'MyFramework'), path.join(frameworkPath, frameworkName));
    } catch (err) {
        console.error(err);
    }
}

function modifyXcodeProj(frameworkPath, moduleType) {
    const xcodeProjFile = path.join(frameworkPath, 'MyFramework.xcodeproj/project.pbxproj');
    const xcodeProjInfo = fs.readFileSync(xcodeProjFile, 'utf8').split(/\r\n|\n|\r/gm);
    for (let i = 0; i < xcodeProjInfo.length; i++) {
        if (moduleType === 'stage') {
            if (xcodeProjInfo[i].indexOf(`/* js`) !== -1) {
                xcodeProjInfo.splice(i, 1);
                i--;
            }
        } else {
            if (xcodeProjInfo[i].indexOf(`/* arkui-x`) !== -1 || xcodeProjInfo[i].indexOf(`/* EntryMain`) !== -1) {
                xcodeProjInfo.splice(i, 1);
                i--;
            }
        }
        if (!isNativeCppTemplate(projectDir)) {
            if (xcodeProjInfo[i].indexOf(`/* hello`) !== -1 || xcodeProjInfo[i].indexOf('USER_HEADER') !== -1) {
                xcodeProjInfo.splice(i, 1);
                i--;
            }
        }
    }
    fs.writeFileSync(xcodeProjFile, xcodeProjInfo.join('\r\n'));
}

function isMacOSPlatform() {
    if (platform === Platform.MacOS) {
        return true;
    }
    console.error(`Please go to your MacOS and create framework.`);
    return false;
}

function validateIllegalName(name) {
    const nameStr = name.match(/^[a-zA-Z_][a-zA-Z0-9_]*/g);
    if (nameStr != name || nameStr == 'null' || nameStr == 'app' || nameStr == 'frameworks' ||
    nameStr == 'etsapp'|| nameStr == 'jsapp') {
        console.error('Illegal name, create failed.');
        return false;
    }
    return true;
}

module.exports = createFramework;
