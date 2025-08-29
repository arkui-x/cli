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
const { copy, replaceInfo } = require('../util');
const { isNativeCppTemplate } = require('../../util');
let projectDir;

function createFramework(projectPath, frameworkName) {
  try {
    projectDir = projectPath;
    const libraryPath = path.join(projectDir, '.arkui-x/ios');
    fs.mkdirSync(libraryPath, { recursive: true });
    findFrameworkTemplate(libraryPath, frameworkName);
    return true;
  } catch (error) {
    console.error('\x1B[31m%s\x1B[0m', 'framework created failed! Target directory: ' + projectPath + '.' + error);
    return false;
  }
}

function findFrameworkTemplate(libraryPath, frameworkName) {
  let templatePath = path.join(__dirname, 'template');
  if (fs.existsSync(templatePath)) {
    copyTemplate(templatePath, libraryPath);
    replaceFrameworkInfo(libraryPath, frameworkName);
  } else {
    templatePath = globalThis.templatePath;
    if (fs.existsSync(templatePath)) {
      copyTemplate(templatePath, libraryPath);
      replaceFrameworkInfo(libraryPath, frameworkName);
    } else {
      console.error('\x1B[31m%s\x1B[0m', 'Error: Template is not exist!');
    }
  }
}

function copyTemplate(templatePath, libraryPath) {
  try {
    const files = ['AppDelegate_stage.h', 'AppDelegate_stage.m',
      'EntryEntryAbilityViewController.h', 'EntryEntryAbilityViewController.m'];
    copy(path.join(templatePath, 'framework'), path.join(libraryPath));
    files.forEach(fileName => {
      fs.copyFileSync(path.join(templatePath, 'ios/app', fileName),
        path.join(libraryPath, 'MyFramework', fileName));
    });
  } catch (err) {
    console.error('\x1B[31m%s\x1B[0m', 'Error: Copy template failed!\n', err);
  }
}

function replaceFrameworkInfo(frameworkPath, frameworkName) {
  const files = [];
  const replaceInfos = [];
  const strs = [];
  const frameworkDir = 'myframework';
  try {
    files.push(path.join(frameworkPath, 'MyFramework.xcodeproj/project.pbxproj'));
    replaceInfos.push('MyFramework');
    strs.push(frameworkDir);
    files.push(path.join(frameworkPath, 'MyFramework/MyFramework.h'));
    replaceInfos.push('MyFramework');
    strs.push(frameworkDir);
    fs.renameSync(path.join(frameworkPath, 'MyFramework/AppDelegate_stage.h'),
      path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.h'));
    fs.renameSync(path.join(frameworkPath, 'MyFramework/AppDelegate_stage.m'),
      path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.m'));
    fs.writeFileSync(path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.m'),
      fs.readFileSync(path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.m')).toString()
        .replace('BUNDLE_DIRECTORY];',
          ` [NSString stringWithFormat:@"%@%@",@"/Frameworks/${frameworkDir}.framework/",BUNDLE_DIRECTORY]];`));
    files.push(path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.m'));
    replaceInfos.push('packageName');
    strs.push(frameworkName);

    files.push(path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.h'));
    replaceInfos.push('AppDelegate');
    strs.push('ArkUIAppDelegate');
    files.push(path.join(frameworkPath, 'MyFramework/ArkUIAppDelegate.m'));
    replaceInfos.push('AppDelegate');
    strs.push('ArkUIAppDelegate');
    replaceInfo(files, replaceInfos, strs);

    modifyXcodeProj(frameworkPath);
    fs.renameSync(path.join(frameworkPath, 'MyFramework/MyFramework.h'),
      path.join(frameworkPath, `MyFramework/${frameworkDir}.h`));
    fs.renameSync(path.join(frameworkPath, 'MyFramework.xcodeproj'),
      path.join(frameworkPath, `${frameworkDir}.xcodeproj`));
    fs.renameSync(path.join(frameworkPath, 'MyFramework'), path.join(frameworkPath, frameworkDir));
  } catch (err) {
    console.error('\x1B[31m%s\x1B[0m', err);
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
