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
const { copy, rmdir, createPackageFile, replaceInfo, getIncludePath } = require('../project');
const { isProjectRootDir, getCurrentProjectVersion, getCurrentProjectSystem,
    isNativeCppTemplate, isStageProject } = require('../../util');
const projectDir = process.cwd();

function createAar() {
    if (!isProjectRootDir(projectDir)) {
        return false;
    }
    inquirer.prompt([{
        name: 'aarName',
        type: 'input',
        message: 'Please enter the AAR name:',
        validate(val) {
            if (val === '') {
                return 'AAR name must be required!';
            }
            return true;
        }
    }]).then(answers => {
        const aarName = answers.aarName;
        if (!validateIllegalName(aarName)) {
            return false;
        }
        const aarPath = path.join(projectDir, 'android', aarName);
        if (fs.existsSync(aarPath)) {
            inquirer.prompt([{
                name: 'delete',
                type: 'input',
                message: 'The AAR already exists. Do you want to delete the directory (y / n):',
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
                        rmdir(aarPath);
                        console.log('Delete directory successfully, creating new AAR.');
                    } catch (err) {
                        console.log(`Failed to delete ${aarPath}, please delete it do yourself.`);
                    }
                    createAarPkg(aarPath, aarName);
                } else {
                    console.log('Failed to create AAR, AAR directory already exists.');
                }
            });
        } else {
            createAarPkg(aarPath, aarName);
        }
    });
}

function createAarPkg(aarPath, aarName) {
    try {
        fs.mkdirSync(aarPath);
        findAarTemplate(aarPath, aarName);
        console.log('AAR created successfully! Target directory：' + aarPath + ' .');
    } catch (error) {
        console.log('AAR created failed! Target directory：' + aarPath + ' .' + error);
    }
}

function findAarTemplate(aarPath, aarName) {
    let templatePath = path.join(__dirname, 'template');
    const appVer = getCurrentProjectVersion(projectDir);
    if (appVer == '') {
        console.log('project is not exists');
        return false;
    }
    if (fs.existsSync(templatePath)) {
        copyTemplateToAAR(templatePath, aarPath);
        modifyAarConfig(aarPath, aarName);
        replaceAarInfo(aarPath, aarName, appVer);
    } else {
        templatePath = path.join(__dirname, '../../../templates');
        if (fs.existsSync(templatePath)) {
            copyTemplateToAAR(templatePath, aarPath);
            modifyAarConfig(aarPath, aarName);
            replaceAarInfo(aarPath, aarName, appVer);
        } else {
            console.log('Error: Template is not exist!');
        }
    }
}

function copyTemplateToAAR(templatePath, aarPath) {
    if (!copy(path.join(templatePath, 'android/app'), aarPath)) {
        return false;
    }
    if (isNativeCppTemplate(projectDir)) {
        if (!copy(path.join(templatePath, 'cpp/cpp_android'), path.join(aarPath, 'src/main/cpp'))) {
            return false;
        }
    }
    return true;
}

function modifyAarConfig(aarPath, aarName) {
    const projectGradle = path.join(projectDir, 'android/settings.gradle');
    let projectGradleInfo = fs.readFileSync(projectGradle, 'utf8').split(/\r\n|\n|\r/gm);
    if (!projectGradleInfo.includes(`include ':${aarName}'`)) {
        for (let i = 0; i < projectGradleInfo.length; i++) {
            if (projectGradleInfo[i] == `include ':app'`) {
                projectGradleInfo.splice(i + 1, 0, `include ':${aarName}'`);
            }
        }
        fs.writeFileSync(projectGradle, projectGradleInfo.join('\r\n'));
    }

    const buildGradle = path.join(aarPath, 'build.gradle');
    let buildGradleInfo = fs.readFileSync(buildGradle, 'utf8').split(/\r\n|\n|\r/gm);
    for (let i = 0; i < buildGradleInfo.length; i++) {
        if ((buildGradleInfo[i] == `        applicationId "packageName"`) ||
            (buildGradleInfo[i] == "    dynamicFeatures = []")) {
            delete buildGradleInfo[i];
        }
    }
    fs.writeFileSync(buildGradle, buildGradleInfo.join('\r\n'));

    const curManifestXmlInfo = fs.readFileSync(path.join(aarPath, 'src/main/AndroidManifest.xml')).toString();
    const firstIndex = curManifestXmlInfo.indexOf('    <application');
    const lastIndex = curManifestXmlInfo.lastIndexOf('</manifest>');
    const updateManifestXmlInfo = curManifestXmlInfo.slice(0, firstIndex) + curManifestXmlInfo.slice(lastIndex);
    fs.writeFileSync(path.join(aarPath, 'src/main/AndroidManifest.xml'), updateManifestXmlInfo);
}

function replaceAarInfo(aarPath, aarName, appVer) {
    const aarPackage = 'com.example.' + aarName;
    const packageArray = aarPackage.split('.');
    const aceVersion = appVer == 'js' ? 'VERSION_JS' : 'VERSION_ETS';
    const files = [];
    const replaceInfos = [];
    const strs = [];

    files.push(path.join(aarPath, 'src/main/res/values/strings.xml'));
    replaceInfos.push('appName');
    strs.push(aarName);

    files.push(path.join(aarPath, 'src/main/AndroidManifest.xml'));
    replaceInfos.push('packageName');
    strs.push(aarPackage);
    files.push(path.join(aarPath, 'build.gradle'));
    replaceInfos.push('packageName');
    strs.push(aarPackage);
    files.push(path.join(aarPath, 'build.gradle'));
    replaceInfos.push('application');
    strs.push('library');

    files.push(path.join(aarPath, 'src/main/java/MainActivity.java'));
    replaceInfos.push('package packageName');
    strs.push('package ' + aarPackage);
    files.push(path.join(aarPath, 'src/main/java/MyApplication.java'));
    replaceInfos.push('package packageName');
    strs.push('package ' + aarPackage);
    files.push(path.join(aarPath, 'src/androidTest/java/ExampleInstrumentedTest.java'));
    replaceInfos.push('package packageName');
    strs.push('package ' + aarPackage);
    files.push(path.join(aarPath, 'src/test/java/ExampleUnitTest.java'));
    replaceInfos.push('package packageName');
    strs.push('package ' + aarPackage);

    if (isStageProject(path.join(projectDir, 'source'))) {
        fs.writeFileSync(path.join(aarPath, 'src/main/java/MainActivity.java'),
            fs.readFileSync(path.join(aarPath, 'src/main/java/MainActivity.java')).
                toString().replace(/setVersion\([^\)]*\);/g, ''));
        files.push(path.join(aarPath, 'src/main/java/MainActivity.java'));
        replaceInfos.push('MainActivity');
        strs.push('EntryMainActivity');
        files.push(path.join(aarPath, 'src/main/java/MainActivity.java'));
        replaceInfos.push('ArkUIInstanceName');
        strs.push(aarPackage + ':entry:MainAbility:');
        files.push(path.join(aarPath, 'src/main/java/MainActivity.java'));
        replaceInfos.push('ohos.ace.adapter.AceActivity');
        strs.push('ohos.stage.ability.adapter.StageActivity');
        files.push(path.join(aarPath, 'src/main/java/MainActivity.java'));
        replaceInfos.push('AceActivity');
        strs.push('StageActivity');
        files.push(path.join(aarPath, 'src/main/java/MyApplication.java'));
        replaceInfos.push('ohos.ace.adapter.AceApplication');
        strs.push('ohos.stage.ability.adapter.StageApplication');
        files.push(path.join(aarPath, 'src/main/java/MyApplication.java'));
        replaceInfos.push('AceApplication');
        strs.push('StageApplication');
    } else {
        files.push(path.join(aarPath, 'src/main/java/MainActivity.java'));
        replaceInfos.push('ArkUIInstanceName');
        strs.push('entry_MainAbility');
        files.push(path.join(aarPath, 'src/main/java/MainActivity.java'));
        replaceInfos.push('ACE_VERSION');
        strs.push(aceVersion);
    }
    if (isNativeCppTemplate(projectDir)) {
        modifyNativeAAR(aarPath, aarName, files, replaceInfos, strs);
    }
    replaceInfo(files, replaceInfos, strs);
    if (isStageProject(path.join(projectDir, 'source'))) {
        fs.renameSync(path.join(aarPath, 'src/main/java/MainActivity.java'), path.join(aarPath,
            'src/main/java/EntryMainActivity.java'));
    }
    const aospJavaPath = path.join(aarPath, 'src/main/java/');
    const testAospJavaPath = path.join(aarPath, 'src/test/java');
    const androidTestAospJavaPath = path.join(aarPath, 'src/androidTest/java');
    const packagePaths = [aospJavaPath, testAospJavaPath, androidTestAospJavaPath];
    createPackageFile(packagePaths, packageArray);
}

function modifyNativeAAR(aarPath, aarName, files, replaceInfos, strs) {
    const nativeIncludePath = getCmakePath();
    files.push(path.join(aarPath, 'src/main/cpp/CMakeLists.txt'));
    replaceInfos.push('appNameValue');
    strs.push(aarName);
    files.push(path.join(aarPath, 'src/main/cpp/CMakeLists.txt'));
    replaceInfos.push('SDK_INCLUDE_PATH');
    strs.push(nativeIncludePath);
    const buildGradle = path.join(aarPath, 'build.gradle');
    if (fs.existsSync(buildGradle)) {
        const buildGradleInfo = fs.readFileSync(buildGradle, 'utf8').split(/\r\n|\n|\r/gm);
        let num;
        for (let i = 0; i < buildGradleInfo.length; i++) {
            if (buildGradleInfo[i] == `            abiFilters "arm64-v8a", "armeabi-v7a"`) {
                buildGradleInfo[i] = `            abiFilters "arm64-v8a"`;
            }
            if (buildGradleInfo[i] == '    sourceSets {') {
                num = i - 1;
                break;
            }
        }
        const value = `
    externalNativeBuild {
        cmake {
            path file('src/main/cpp/CMakeLists.txt')
            version '3.22.1'
        }
    }

    packagingOptions {
        pickFirst 'lib/arm64-v8a/libarkui_android.so'
    }
        `;
        buildGradleInfo.splice(num, 0, value);
        fs.writeFileSync(buildGradle, buildGradleInfo.join('\r\n'));
    }
}

function getCmakePath() {
    let system;
    const currentSystem = getCurrentProjectSystem(projectDir);
    if (!currentSystem) {
        console.error('current system is unknown.');
        return null;
    }
    const sdkVersion = JSON.parse(fs.readFileSync(
        path.join(projectDir, 'ohos/build-profile.json5'))).app.compileSdkVersion.toString();
    if (currentSystem === HarmonyOS) {
        system = '2';
    } else {
        system = '1';
    }
    return getIncludePath(system, sdkVersion);
}

function validateIllegalName(name) {
    const nameStr = name.match(/^[a-zA-Z_][a-zA-Z0-9_]*/g);
    if (nameStr != name || nameStr == 'app' || nameStr == 'gradle' || nameStr == 'null') {
        console.error('Illegal name, create failed.');
        return false;
    }
    return true;
}
module.exports = createAar;
