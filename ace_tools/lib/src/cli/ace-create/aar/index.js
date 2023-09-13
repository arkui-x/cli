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
const { copy, createPackageFile, replaceInfo } = require('../util');
const { isNativeCppTemplate } = require('../../util');
let projectDir;

function createAar(projectPath, aarName) {
  let libraryPath;
  try {
    projectDir = projectPath;
    libraryPath = path.join(projectDir, '.arkui-x/android');
    fs.mkdirSync(libraryPath, { recursive: true });
    findAarTemplate(libraryPath, aarName);
    return true;
  } catch (error) {
    console.log('AAR created failed! Target directory: ' + libraryPath + '.' + error);
    return false;
  }
}

function findAarTemplate(libraryPath, aarName) {
  let templatePath = path.join(__dirname, 'template');
  if (fs.existsSync(templatePath)) {
    copyTemplateToAAR(templatePath, libraryPath);
    modifyAarConfig(libraryPath);
    replaceAarInfo(libraryPath, aarName);
  } else {
    templatePath = globalThis.templatePath;
    if (fs.existsSync(templatePath)) {
      copyTemplateToAAR(templatePath, libraryPath);
      modifyAarConfig(libraryPath);
      replaceAarInfo(libraryPath, aarName);
    } else {
      console.log('Error: Template is not exist!');
    }
  }
}

function copyTemplateToAAR(templatePath, libraryPath) {
  if (!copy(path.join(templatePath, 'android'), libraryPath)) {
    return false;
  }
  if (isNativeCppTemplate(projectDir)) {
    if (!copy(path.join(templatePath, 'cpp/cpp_android'), path.join(libraryPath, 'app/src/main/cpp'))) {
      return false;
    }
  }
  return true;
}

function modifyAarConfig(libraryPath) {
  const buildGradle = path.join(libraryPath, 'app/build.gradle');
  const buildGradleInfo = fs.readFileSync(buildGradle, 'utf8').split(/\r\n|\n|\r/gm);
  for (let i = 0; i < buildGradleInfo.length; i++) {
    if (buildGradleInfo[i] === `        applicationId "packageName"` ||
            buildGradleInfo[i] === '    dynamicFeatures = []') {
      delete buildGradleInfo[i];
    }
  }
  fs.writeFileSync(buildGradle, buildGradleInfo.join('\r\n'));

  const curManifestXmlInfo = fs.readFileSync(path.join(libraryPath, 'app/src/main/AndroidManifest.xml')).toString();
  const firstIndex = curManifestXmlInfo.indexOf('    <application');
  const lastIndex = curManifestXmlInfo.lastIndexOf('</manifest>');
  const updateManifestXmlInfo = curManifestXmlInfo.slice(0, firstIndex) + curManifestXmlInfo.slice(lastIndex);
  fs.writeFileSync(path.join(libraryPath, 'app/src/main/AndroidManifest.xml'), updateManifestXmlInfo);
}

function replaceAarInfo(libraryPath, aarName) {
  const aarPackage = 'com.example.' + aarName;
  const packageArray = aarPackage.split('.');
  const files = [];
  const replaceInfos = [];
  const strs = [];
  const aarPath = path.join(libraryPath, aarName);
  fs.renameSync(path.join(libraryPath, 'app'), aarPath);

  files.push(path.join(libraryPath, 'settings.gradle'));
  replaceInfos.push(':app');
  strs.push(':' + aarName);
  files.push(path.join(libraryPath, 'settings.gradle'));
  replaceInfos.push('appName');
  strs.push(aarName);

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

  files.push(path.join(aarPath, 'src/main/java/MainActivity.java'));
  replaceInfos.push('MainActivity');
  strs.push('EntryEntryAbilityActivity');
  files.push(path.join(aarPath, 'src/main/java/MainActivity.java'));
  replaceInfos.push('ArkUIInstanceName');
  strs.push(aarPackage + ':entry:EntryAbility:');
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
  if (isNativeCppTemplate(projectDir)) {
    modifyNativeAAR(aarPath, aarName, files, replaceInfos, strs);
  }
  replaceInfo(files, replaceInfos, strs);
  fs.renameSync(path.join(aarPath, 'src/main/java/MainActivity.java'), path.join(aarPath,
    'src/main/java/EntryEntryAbilityActivity.java'));
  const aospJavaPath = path.join(aarPath, 'src/main/java/');
  const testAospJavaPath = path.join(aarPath, 'src/test/java');
  const androidTestAospJavaPath = path.join(aarPath, 'src/androidTest/java');
  const packagePaths = [aospJavaPath, testAospJavaPath, androidTestAospJavaPath];
  createPackageFile(packagePaths, packageArray);
}

function modifyNativeAAR(aarPath, aarName, files, replaceInfos, strs) {
  files.push(path.join(aarPath, 'src/main/cpp/CMakeLists.txt'));
  replaceInfos.push('appNameValue');
  strs.push(aarName);
  const buildGradle = path.join(aarPath, 'build.gradle');
  if (fs.existsSync(buildGradle)) {
    const buildGradleInfo = fs.readFileSync(buildGradle, 'utf8').split(/\r\n|\n|\r/gm);
    let num;
    for (let i = 0; i < buildGradleInfo.length; i++) {
      if (buildGradleInfo[i] === `            abiFilters "arm64-v8a", "armeabi-v7a"`) {
        buildGradleInfo[i] = `            abiFilters "arm64-v8a"`;
      }
      if (buildGradleInfo[i] === '    sourceSets {') {
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

module.exports = createAar;
