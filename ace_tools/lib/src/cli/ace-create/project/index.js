/*
 * Copyright (c) 2022-2023 Huawei Device Co., Ltd.
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
const createAar = require('../aar');
const createFramework = require('../framework');
const { getSdkVersion, getCompileSdkVersionWithSdkVersion } = require('../../util/index');
const { getConfig } = require('../../ace-config');
const { copy, createPackageFile, replaceInfo, modifyHarmonyOSConfig,
  modifyOpenHarmonyOSConfig, modifyNativeCppConfig, signIOS, copyTemp,
  getFileList, getTempPath, createAndroidAndIosBuildArkTSShell,
  createAndroidTaskInBuildGradle, createIosScriptInPbxproj,
  updateCrossPlatformConfig } = require('../util');
const { addFileToPbxproj, getUUID } = require('../../util');
const JSON5 = require('json5');
const aceHarmonyOS = '2';
const acePluginNapiProType = 'plugin_napi';
const aceLibraryProType = 'library';
const aceFfiProType = 'ffi';
const acePluginProType = 'plugin';
const acePackageProType = 'package';
const crossplatformTypes = [aceFfiProType, acePluginProType, acePackageProType];
const exec = require('child_process').execSync;
let useCocoapods = false;

function create(args) {
  const { projectAbsolutePath, outputDir, project, bundleName, runtimeOS, template,
    currentProjectPath, sdkVersion, integrationApproach, platform: targetPlatform } = args;
  useCocoapods = (integrationApproach === '2');
  const platforms = (targetPlatform || 'both').toLowerCase();
  const projectTempPath = getTempPath(outputDir);
  if (useCocoapods && (platforms === 'ios' || platforms === 'both')) {
    if (!checkCocoaPodsInstalled()) {
      console.error('\x1B[31m%s\x1B[0m', 'Project created failed!');
      console.info('\x1B[33m%s\x1B[0m', 'CocoaPods is not installed. Please install CocoaPods(brew install cocoapods) and try again.');
      return;
    }
    createProject(projectAbsolutePath, projectTempPath, bundleName, project, runtimeOS, template, currentProjectPath, sdkVersion, platforms);
    if (!createPodfile(projectTempPath)) {
      console.error('\x1B[31m%s\x1B[0m', 'create Podfile failed.');
      return;
    }
  } else {
    createProject(projectAbsolutePath, projectTempPath, bundleName, project, runtimeOS, template, currentProjectPath, sdkVersion, platforms);
  }
  if (template !== aceLibraryProType) {
    createAndroidAndIosShell(projectTempPath, platforms);
  }
  copyTemp(projectTempPath, projectAbsolutePath);
  const projectInfo = {
    projectTemplate: template,
    moduleInfo: [],
    abilityInfo: [],
    platforms: platforms === 'both' ? ['android', 'ios'] : [platforms],
  };
  fs.writeFileSync(path.join(projectAbsolutePath, '.projectInfo'), JSON.stringify(projectInfo, '', '  '), 'utf8');
  updateCrossPlatformConfig(projectAbsolutePath, platforms);
}

function createPodfile(projectTempPath) {
  try {
    exec('pod init', {
      cwd: path.join(projectTempPath, '.arkui-x/ios'),
      stdio: 'inherit',
    });
    return true;
  } catch (error) {
    return false;
  }
}

function checkCocoaPodsInstalled() {
  try {
    const output = exec('pod --version', { stdio: 'pipe' });
    return output.toString().trim().length > 0;
  } catch (error) {
    return false;
  }
}

function createAndroidAndIosShell(projectTempPath, targetPlatforms) {
  const platforms = (targetPlatforms || 'both').toString().toLowerCase();
  if (platforms === 'both' || platforms === 'android') {
    createAndroidTaskInBuildGradle(projectTempPath);
  }
  if (platforms === 'both' || platforms === 'ios') {
    createIosScriptInPbxproj(projectTempPath);
  }
  const version = getSdkVersion(projectTempPath);
  const configContent = getConfig();
  let ohpmPath = '';
  let arkuixPath = '';
  if (configContent['ohpm-dir']) {
    ohpmPath = path.join(configContent['ohpm-dir'], 'bin/ohpm');
  }
  if (configContent['arkui-x-sdk']) {
    arkuixPath = path.join(configContent['arkui-x-sdk'], String(version), 'arkui-x');
  }
  createAndroidAndIosBuildArkTSShell(projectTempPath, ohpmPath, arkuixPath, platforms);
}

function repairProject(projectAbsolutePath, outputDir) {
  const projectTempPath = getTempPath(outputDir);
  const absoluteDir = getFileList(projectAbsolutePath);
  const tempDir = getFileList(projectTempPath);
  const absoluteDirReplace = absoluteDir.map(val => val.slice(projectAbsolutePath.length).replaceAll('\\', '/'));
  const tempDirReplace = tempDir.map(val => val.slice(projectTempPath.length).replaceAll('\\', '/'));
  const diffFile = tempDirReplace.filter(value => !absoluteDirReplace.includes(value));
  diffFile.forEach(val => copyTemp(path.join(projectTempPath, val), path.join(projectAbsolutePath, val)));
}

function createProject(projectAbsolutePath, projectTempPath, bundleName, project, runtimeOS, template,
  currentProjectPath, sdkVersion, targetPlatforms, isRepairProject) {
  fs.rmSync(projectTempPath, { recursive: true, force: true });
  try {
    fs.mkdirSync(projectTempPath, { recursive: true });
    findStageTemplate(projectTempPath, bundleName, project, runtimeOS, template, sdkVersion, targetPlatforms);
    const platforms = (targetPlatforms || 'both').toString().toLowerCase();
    if (template === aceLibraryProType) {
      let ok = true;
      if (platforms === 'both' || platforms === 'android') {
        ok = ok && createAar(projectTempPath, bundleName);
      }
      if (platforms === 'both' || platforms === 'ios') {
        ok = ok && createFramework(projectTempPath, bundleName);
      }
      if (!ok) {
        return;
      }
    }
    let createFlag = 'created';
    if (isRepairProject) {
      if (template !== aceLibraryProType) {
        createAndroidAndIosShell(projectTempPath, platforms);
      }
      createFlag = 'repaired';
    }
    if (template !== aceLibraryProType) {
      console.log(`
Project ${createFlag}. Target directory:  ${projectAbsolutePath}.
In order to run your app, type:
    
    $ cd ${currentProjectPath}
    $ ace run
      
Your app code is in ${path.join(currentProjectPath, 'entry')}.`);
      if (useCocoapods) {
        console.info('\x1B[33m%s\x1B[0m', 
          'The current project uses CocoaPods as a dependency management tool, ' +
          'and DevEco Studio does not currently support directly compiling such projects.' +
          'Please use the ACE build tool (ace tools) for building.');
      }
    } else {
      console.log(`
Project ${createFlag}. Target directory:  ${projectAbsolutePath}.
Your library code is in ${path.join(currentProjectPath, 'entry')}.`);
    }
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', `Project created failed! Target directory: ${projectAbsolutePath}. ${error}`);
  }
}

function findStageTemplate(projectTempPath, bundleName, project, runtimeOS, template, sdkVersion, targetPlatforms) {
  let pathTemplate = path.join(__dirname, 'template');
  if (fs.existsSync(pathTemplate)) {
    copyStageTemplate(pathTemplate, projectTempPath, template, sdkVersion, targetPlatforms);
    replaceStageProjectInfo(projectTempPath, bundleName, project, runtimeOS, template, sdkVersion, targetPlatforms);
  } else {
    pathTemplate = globalThis.templatePath;
    if (fs.existsSync(pathTemplate)) {
      copyStageTemplate(pathTemplate, projectTempPath, template, sdkVersion, targetPlatforms);
      replaceStageProjectInfo(projectTempPath, bundleName, project, runtimeOS, template, sdkVersion, targetPlatforms);
    } else {
      console.error('\x1B[31m%s\x1B[0m', 'Template is not exist!');
    }
  }
}

function replaceAndroidProjectInfo(projectTempPath, bundleName, project, template) {
  const packageArray = bundleName.split('.');
  const files = [];
  const replaceInfos = [];
  const strs = [];
  files.push(path.join(projectTempPath, '.arkui-x/android/settings.gradle'));
  replaceInfos.push('appName');
  strs.push(project);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/main/res/values/strings.xml'));
  replaceInfos.push('appName');
  strs.push(project);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/main/AndroidManifest.xml'));
  replaceInfos.push('packageName');
  strs.push(bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/build.gradle'));
  replaceInfos.push('packageName');
  strs.push(bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/main/java/MyApplication.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/androidTest/java/ExampleInstrumentedTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/test/java/ExampleUnitTest.java'));
  replaceInfos.push('package packageName');
  strs.push('package ' + bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('ArkUIInstanceName');
  strs.push(bundleName + ':entry:EntryAbility:');
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/main/java/MainActivity.java'));
  replaceInfos.push('MainActivity');
  strs.push('EntryEntryAbilityActivity');
  files.push(path.join(projectTempPath, '.arkui-x/android/app/src/main/AndroidManifest.xml'));
  replaceInfos.push('MainActivity');
  strs.push('EntryEntryAbilityActivity');
  replaceInfo(files, replaceInfos, strs);
  if (template === acePluginNapiProType) {
    modifyNativeCppConfig(projectTempPath, project, 'app');
  }

  fs.renameSync(path.join(projectTempPath, '.arkui-x/android/app/src/main/java/MainActivity.java'), path.join(projectTempPath,
    '.arkui-x/android/app/src/main/java/EntryEntryAbilityActivity.java'));
  const aospJavaPath = path.join(projectTempPath, '.arkui-x/android/app/src/main/java');
  const testAospJavaPath = path.join(projectTempPath, '.arkui-x/android/app/src/test/java');
  const androidTestAospJavaPath = path.join(projectTempPath, '.arkui-x/android/app/src/androidTest/java');
  const packagePaths = [aospJavaPath, testAospJavaPath, androidTestAospJavaPath];
  createPackageFile(packagePaths, packageArray);
}

function replaceiOSProjectInfo(projectTempPath, bundleName) {
  const files = [];
  const replaceInfos = [];
  const strs = [];
  const configFile = path.join(projectTempPath, '.arkui-x/ios/app.xcodeproj/project.pbxproj');
  files.push(configFile);
  replaceInfos.push('bundleIdentifier');
  strs.push(bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/ios/app/AppDelegate.m'));
  replaceInfos.push('packageName');
  strs.push(bundleName);
  files.push(path.join(projectTempPath, '.arkui-x/ios/app/Info.plist'));
  replaceInfos.push('{{CFBundleName}}');
  const iosCFBundleName = bundleName.split('.').at(-1).toLowerCase();
  strs.push(iosCFBundleName);
  files.push(path.join(projectTempPath, '.arkui-x/ios/app/Info.plist'));
  replaceInfos.push('{{CFBundleDisplayName}}');
  strs.push(iosCFBundleName.slice(0, 1).toUpperCase() + iosCFBundleName.slice(1));
  replaceInfo(files, replaceInfos, strs);
  signIOS(configFile);
}

 function findTemplatePath() {
  const localPath = path.join(__dirname, 'template');
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  if (globalThis.templatePath && fs.existsSync(globalThis.templatePath)) {
    return globalThis.templatePath;
  }
  return null;
}

function replaceStageProjectInfo(projectTempPath, bundleName, project, runtimeOS, template, sdkVersion, targetPlatforms) {
  if (!bundleName) {
    bundleName = 'com.example.arkuicross';
  }
  const files = [];
  const replaceInfos = [];
  const strs = [];

  files.push(path.join(projectTempPath, 'AppScope/resources/base/element/string.json'));
  replaceInfos.push('projectName');
  strs.push(project);
  files.push(path.join(projectTempPath, 'AppScope/app.json5'));
  replaceInfos.push('appBunduleName');
  strs.push(bundleName);
  files.push(path.join(projectTempPath, 'oh-package.json5'));
  replaceInfos.push('packageInfo');
  strs.push(project);
  files.push(path.join(projectTempPath, 'entry/src/main/resources/base/element/string.json'));
  replaceInfos.push('module_ability_name');
  strs.push('EntryAbility');
  files.push(path.join(projectTempPath, 'entry/src/main/resources/en_US/element/string.json'));
  replaceInfos.push('module_ability_name');
  strs.push('EntryAbility');
  files.push(path.join(projectTempPath, 'entry/src/main/resources/zh_CN/element/string.json'));
  replaceInfos.push('module_ability_name');
  strs.push('EntryAbility');
  files.push(path.join(projectTempPath, 'entry/src/main/module.json5'));
  replaceInfos.push('module_ability_name');
  strs.push('EntryAbility');
  files.push(path.join(projectTempPath, 'entry/src/main/module.json5'));
  replaceInfos.push('module_name');
  strs.push('entry');
  files.push(path.join(projectTempPath, 'entry/src/ohosTest/module.json5'));
  replaceInfos.push('module_test_name');
  strs.push('entry_test');
  files.push(path.join(projectTempPath, 'entry/src/ohosTest/resources/base/element/string.json'));
  replaceInfos.push('module_test_name');
  strs.push('entry_test_desc');
  files.push(path.join(projectTempPath, 'entry/oh-package.json5'));
  replaceInfos.push('module_name');
  strs.push('entry');
  if (template === aceLibraryProType) {
    files.push(path.join(projectTempPath, 'hvigorfile.ts'));
    replaceInfos.push('AppTasksForArkUIX');
    strs.push('AppTasksForArkUIXLibrary');
  }
  if (template === acePluginNapiProType) {
    files.push(path.join(projectTempPath, 'entry/src/main/cpp/CMakeLists.txt'));
    replaceInfos.push('appNameValue');
    strs.push(project);
  }
  replaceInfo(files, replaceInfos, strs);
  const platforms = (targetPlatforms || 'both').toString().toLowerCase();
  if (template !== aceLibraryProType) {
    if (platforms === 'both' || platforms === 'android') {
      replaceAndroidProjectInfo(projectTempPath, bundleName, project, template);
    }
    if (platforms === 'both' || platforms === 'ios') {
      replaceiOSProjectInfo(projectTempPath, bundleName);
    }
  }
  if (crossplatformTypes.includes(template)) {
    const templatePath = findTemplatePath();
    if (templatePath) {
      setupCrossplatformModule(templatePath, projectTempPath, project, template, sdkVersion);
    }
  }
  if (runtimeOS !== aceHarmonyOS && sdkVersion !== '10') {
    modifyOpenHarmonyOSConfig(projectTempPath, sdkVersion);
  }
  if (runtimeOS === aceHarmonyOS) {
    modifyHarmonyOSConfig(projectTempPath, 'entry', sdkVersion);
  }
}

function copyAndroidiOSTemplate(templatePath, projectTempPath, template, sdkVersion, targetPlatforms) {
  const platforms = (targetPlatforms || 'both').toString().toLowerCase();
  if (platforms === 'both' || platforms === 'android') {
    if (!copy(path.join(templatePath, '/android'), path.join(projectTempPath, '.arkui-x/android'))) {
      return false;
    }
  }
  if (platforms === 'both' || platforms === 'ios') {
    if (!copy(path.join((useCocoapods ? path.join(templatePath, 'cocoapods') : templatePath), '/ios'),
      path.join(projectTempPath, '.arkui-x/ios'))) {
      return false;
    }
  }
  if (template === acePluginNapiProType) {
    if (platforms === 'both' || platforms === 'android') {
      if (!copy(path.join(templatePath, '/cpp/cpp_android'), path.join(projectTempPath, '.arkui-x/android/app/src/main/cpp'))) {
        return false;
      }
    }
    if (platforms === 'both' || platforms === 'ios') {
      if (!copy(path.join(templatePath, '/cpp/cpp_ios'), path.join(projectTempPath, '.arkui-x/ios/app.xcodeproj'))) {
        return false;
      }
    }
    if (sdkVersion !== '10') {
      if (platforms === 'both' || platforms === 'android') {
        let data = fs.readFileSync(path.join(projectTempPath, '.arkui-x/android/app/src/main/cpp/CMakeLists.txt'), 'utf8');
        data = data.replace(`$ENV{ARKUIX_SDK_HOME}/10`, `$ENV{ARKUIX_SDK_HOME}/${sdkVersion}`);
        fs.writeFileSync(path.join(projectTempPath, '.arkui-x/android/app/src/main/cpp/CMakeLists.txt'), data);
      }
    }
  }
  if (platforms === 'both' || platforms === 'ios') {
    fs.renameSync(path.join(projectTempPath, '.arkui-x/ios/app/AppDelegate_stage.m'),
      path.join(projectTempPath, '.arkui-x/ios/app/AppDelegate.m'));
    fs.renameSync(path.join(projectTempPath, '.arkui-x/ios/app/AppDelegate_stage.h'),
      path.join(projectTempPath, '.arkui-x/ios/app/AppDelegate.h'));
  }
  return true;
}

function copyStageTemplate(templatePath, projectTempPath, template, sdkVersion, targetPlatforms) {
  if (!copy(path.join(templatePath, '/ohos_stage'), projectTempPath)) {
    return false;
  }
  if (template === acePluginNapiProType) {
    if (!copy(path.join(templatePath, '/cpp_ets_stage/source'), projectTempPath)) {
      return false;
    }
    if (!copy(path.join(templatePath, '/cpp/cpp_src'), path.join(projectTempPath, 'entry/src/main/cpp'))) {
      return false;
    }
    if (!copy(path.join(templatePath, '/cpp/cpp_ohos'), path.join(projectTempPath, 'entry/src/main/cpp'))) {
      return false;
    }
  } else if (crossplatformTypes.includes(template)) {
    // FFI/Plugin/Package: copy entry module from ets_stage
    if (!copy(path.join(templatePath, '/ets_stage/source'), projectTempPath)) {
      return false;
    }
    // The HAR lib module and platform-specific templates will be copied later
    // in setupCrossplatformModule() called from replaceStageProjectInfo()
  } else {
    if (!copy(path.join(templatePath, '/ets_stage/source'), projectTempPath)) {
      return false;
    }
  }
  fs.mkdirSync(path.join(projectTempPath, '.arkui-x'), { recursive: true });
  fs.writeFileSync(path.join(projectTempPath, '.arkui-x/arkui-x-config.json5'), fs.readFileSync(path.join(templatePath, 'arkui-x-config.json5').toString()));
  if (template !== aceLibraryProType) {
    if (!copyAndroidiOSTemplate(templatePath, projectTempPath, template, sdkVersion, targetPlatforms)) {
      return false;
    }
  }
  return true;
}

/**
 * Replace placeholder tokens in file contents and directory/file names.
 * Handles three patterns: module_name_lower → lower, module_name → mixed, Module_name → Pascal
 */
function replacePlaceholdersInDir(dir, moduleName) {
  if (!fs.existsSync(dir)) return;
  const lowerModuleName = moduleName.toLowerCase();
  const PascalModuleName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

  fs.readdirSync(dir).forEach(item => {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      replacePlaceholdersInDir(fullPath, moduleName);
      if (item.includes('module_name_lower') || item.includes('module_name') || item.includes('Module_name')) {
        const newName = item
          .replace(/module_name_lower/g, lowerModuleName)
          .replace(/module_name/g, moduleName)
          .replace(/Module_name/g, PascalModuleName);
        fs.renameSync(fullPath, path.join(dir, newName));
      }
    } else {
      let content = fs.readFileSync(fullPath).toString();
      let modified = false;
      if (content.includes('module_name_lower')) {
        content = content.replace(/module_name_lower/g, lowerModuleName);
        modified = true;
      }
      if (content.includes('module_name')) {
        content = content.replace(/module_name/g, moduleName);
        modified = true;
      }
      if (content.includes('Module_name')) {
        content = content.replace(/Module_name/g, PascalModuleName);
        modified = true;
      }
      if (item.includes('module_name_lower') || item.includes('module_name') || item.includes('Module_name')) {
        const newName = item
          .replace(/module_name_lower/g, lowerModuleName)
          .replace(/module_name/g, moduleName)
          .replace(/Module_name/g, PascalModuleName);
        fs.writeFileSync(path.join(dir, newName), content);
        fs.unlinkSync(fullPath);
        modified = false;
      }
      if (modified) {
        fs.writeFileSync(fullPath, content);
      }
    }
  });
}

/**
 * Add module entry to build-profile.json5 using regex to preserve comments.
 */
function addModuleToBuildProfile(buildProfilePath, moduleName) {
  if (!fs.existsSync(buildProfilePath)) return;
  let content = fs.readFileSync(buildProfilePath).toString();
  const moduleEntry = `{"name": "${moduleName}", "srcPath": "./${moduleName}", "targets": [{"name": "default", "applyToProducts": ["default"]}]}`;
  content = content.replace(
    /"modules"\s*:\s*\[/,
    `"modules": [\n    ${moduleEntry},`
  );
  fs.writeFileSync(buildProfilePath, content);
}

/**
 * Copy platform templates (android/ios) for FFI/Plugin types.
 */
function copyPlatformTemplates(crossplatformTemplateDir, projectTempPath, moduleName) {
  const platforms = ['android', 'ios'];
  platforms.forEach(plat => {
    const platSrc = path.join(crossplatformTemplateDir, plat);
    if (!fs.existsSync(platSrc)) return;
    if (plat === 'android') {
      const librarySrc = path.join(platSrc, 'library');
      const platDst = path.join(projectTempPath, '.arkui-x', 'android', moduleName);
      fs.existsSync(librarySrc) ? copy(librarySrc, platDst) : copy(platSrc, platDst);
    } else if (plat === 'ios') {
      copy(platSrc, path.join(projectTempPath, '.arkui-x', 'ios'));
    }
  });
}

/**
 * Register native source files in app.xcodeproj for iOS builds.
 */
function registerNativeFilesInPbxproj(projectTempPath, moduleName, template) {
  const pbxprojPath = path.join(projectTempPath, '.arkui-x', 'ios', 'app.xcodeproj', 'project.pbxproj');
  if (!fs.existsSync(pbxprojPath)) return;

  const lowerModuleName = moduleName.toLowerCase();
  const cppDir = path.join(projectTempPath, moduleName, 'src', 'main', 'cpp');
  if (fs.existsSync(cppDir)) {
    fs.readdirSync(cppDir).forEach(file => {
      if (file.endsWith('.cpp')) {
        addFileToPbxproj(pbxprojPath, file, 'cfile', moduleName);
      }
    });
  }

  if (template === acePluginProType) {
    const bridgeDir = path.join(projectTempPath, '.arkui-x', 'ios', lowerModuleName);
    if (fs.existsSync(bridgeDir)) {
      fs.readdirSync(bridgeDir).filter(f => f.endsWith('.mm') || f.endsWith('.m')).forEach(file => {
        const ext = path.extname(file);
        const fileType = ext === '.mm' ? 'sourcecode.cpp.objcpp' : 'sourcecode.c.objc';
        const buildUUID = getUUID(pbxprojPath);
        const refUUID = getUUID(pbxprojPath);
        if (!buildUUID || !refUUID) return;
        const filePath = lowerModuleName + '/' + file;
        const pbxprojContent = fs.readFileSync(pbxprojPath).toString();
        if (pbxprojContent.includes('/* ' + file + ' in Sources */,')) return;
        const addBuildFile = '\n\t\t' + buildUUID + ' /* ' + file +
          ' in Sources */ = {isa = PBXBuildFile; fileRef = ' + refUUID + ' /* ' + file + ' */; };';
        const addFileRef = '\n\t\t' + refUUID + ' /* ' + file +
          ' */ = {isa = PBXFileReference; lastKnownFileType = ' + fileType +
          '; name = ' + file + '; path = ' + filePath + '; sourceTree = "<group>"; };';
        const addGroupChild = '\n\t\t\t\t' + refUUID + ' /* ' + file + ' */,';
        const addSourceBuild = '\n\t\t\t\t' + buildUUID + ' /* ' + file + ' in Sources */,';
        const searchBuildFile = '/* arkui-x */; };';
        const searchFileRef = 'arkui-x; sourceTree = "<group>"; };';
        const searchGroupChild = '/* arkui-x */,';
        const searchSourceBuild = 'AppDelegate.m in Sources */,';
        const idxBuild = pbxprojContent.lastIndexOf(searchBuildFile);
        const idxFileRef = pbxprojContent.lastIndexOf(searchFileRef);
        const idxGroupChild = pbxprojContent.lastIndexOf(searchGroupChild);
        const idxSourceBuild = pbxprojContent.lastIndexOf(searchSourceBuild);
        let updated = pbxprojContent.slice(0, idxBuild + searchBuildFile.length) +
          addBuildFile + pbxprojContent.slice(idxBuild + searchBuildFile.length, idxFileRef + searchFileRef.length) +
          addFileRef + pbxprojContent.slice(idxFileRef + searchFileRef.length, idxGroupChild + searchGroupChild.length) +
          addGroupChild + pbxprojContent.slice(idxGroupChild + searchGroupChild.length, idxSourceBuild + searchSourceBuild.length) +
          addSourceBuild + pbxprojContent.slice(idxSourceBuild + searchSourceBuild.length);
        fs.writeFileSync(pbxprojPath, updated);
      });
    }
  }

  let pbxprojContent = fs.readFileSync(pbxprojPath).toString();
  if (!pbxprojContent.includes('USER_HEADER_SEARCH_PATHS')) {
    pbxprojContent = pbxprojContent.replace(
      /INFOPLIST_FILE = app\/Info\.plist;/g,
      'USER_HEADER_SEARCH_PATHS = "$(SRCROOT)/frameworks/libarkui_ios.xcframework/ios-arm64/libarkui_ios.framework/Headers/include";\n\t\t\t\tINFOPLIST_FILE = app/Info.plist;'
    );
    fs.writeFileSync(pbxprojPath, pbxprojContent);
  }

  if (template === acePluginProType) {
    let pbxprojContent2 = fs.readFileSync(pbxprojPath).toString();
    if (!pbxprojContent2.includes('IOS_PLATFORM')) {
      pbxprojContent2 = pbxprojContent2.replace(
        /GCC_PREPROCESSOR_DEFINITIONS = \(/g,
        'GCC_PREPROCESSOR_DEFINITIONS = (\n\t\t\t\t\tIOS_PLATFORM,'
      );
      fs.writeFileSync(pbxprojPath, pbxprojContent2);
    }
  }
}

/**
 * Set up the cross-platform HAR module for ffi/plugin/package templates.
 */
function setupCrossplatformModule(templatePath, projectTempPath, project, template, sdkVersion) {
  const crossplatformTemplateDir = path.join(templatePath, 'crossplatform', template);
  const moduleName = project + 'lib';

  // 1. Copy HAR lib module template
  const libSrc = path.join(crossplatformTemplateDir, 'lib');
  const libDst = path.join(projectTempPath, moduleName);
  if (fs.existsSync(libSrc)) {
    copy(libSrc, libDst);
  }

  // 2. Copy platform-specific templates (android/ios for ffi/plugin)
  copyPlatformTemplates(crossplatformTemplateDir, projectTempPath, moduleName);

  // 3. Replace entry Index.ets with template verification UI
  const entryIndexSrc = path.join(crossplatformTemplateDir, 'entry', 'src', 'main', 'ets', 'pages', 'Index.ets');
  const entryIndexDst = path.join(projectTempPath, 'entry', 'src', 'main', 'ets', 'pages', 'Index.ets');
  if (fs.existsSync(entryIndexSrc)) {
    fs.writeFileSync(entryIndexDst, fs.readFileSync(entryIndexSrc));
  }

  // 4. Add HAR module to build-profile.json5 (regex to preserve comments)
  addModuleToBuildProfile(path.join(projectTempPath, 'build-profile.json5'), moduleName);

  // 5. Update root oh-package.json5 to add dependency (regex to preserve comments)
  const ohPackagePath = path.join(projectTempPath, 'oh-package.json5');
  if (fs.existsSync(ohPackagePath)) {
    let ohPackage = fs.readFileSync(ohPackagePath).toString();
    ohPackage = ohPackage.replace(
      /"dependencies":\s*\{/,
      `"dependencies": {\n    "${moduleName}": "file:./${moduleName}"`
    );
    fs.writeFileSync(ohPackagePath, ohPackage);
  }

  // 6. Create settings-plugin.gradle for ace build plugin AAR builds
  const settingsPluginPath = path.join(projectTempPath, '.arkui-x', 'android', 'settings-plugin.gradle');
  fs.writeFileSync(settingsPluginPath,
    `include ':app'\nrootProject.name = "${project}"\ninclude ':${moduleName}'\n`);

  // 7. Replace placeholders in lib module, platform dirs, and entry Index.ets
  replacePlaceholdersInDir(libDst, moduleName);

  if (fs.existsSync(entryIndexDst)) {
    let content = fs.readFileSync(entryIndexDst).toString();
    content = content.replace(/module_name/g, moduleName);
    fs.writeFileSync(entryIndexDst, content);
  }

  replacePlaceholdersInDir(path.join(projectTempPath, '.arkui-x', 'android', moduleName), moduleName);
  replacePlaceholdersInDir(path.join(projectTempPath, '.arkui-x', 'ios'), moduleName);

  // 8. Register native source files in app.xcodeproj for iOS
  if (template === aceFfiProType || template === acePluginProType) {
    registerNativeFilesInPbxproj(projectTempPath, moduleName, template);
  }

  // 9. Create crossplatform-config.json5
  const crossConfigDir = path.join(projectTempPath, '.arkui-x');
  let crossConfig = {
    name: moduleName,
    version: '1.0.0',
    type: template,
    platform: ['android', 'iOS'],
  };
  const compileSdkVersion = getCompileSdkVersionWithSdkVersion(sdkVersion);
  if (compileSdkVersion) {
    crossConfig.compatibleSdkVersion = compileSdkVersion;
  }
  if (template !== acePackageProType) {
    crossConfig.android = {
      path: 'android',
      module: moduleName,
      artifact: `${moduleName}-release.aar`,
    };
    crossConfig.ios = {
      path: 'ios',
      module: moduleName,
      frameworks: [],
    };
  }
  fs.writeFileSync(
    path.join(crossConfigDir, 'crossplatform-config.json5'),
    JSON5.stringify(crossConfig, null, 2) + '\n',
    'utf8'
  );
}

module.exports = {
  create,
  repairProject,
  createProject,
};
