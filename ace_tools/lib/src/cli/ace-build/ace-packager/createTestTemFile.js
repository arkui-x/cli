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
const JSON5 = require('json5');
const { getModuleList } = require('../../util');
const { createStageAbilityInAndroid, createStageAbilityInIOS } = require('../../ace-create/ability');
let projectDir;

function recoverStageAbilityInAndroid(moduleName, abilityName) {
  try {
    const manifestPath = path.join(projectDir, 'AppScope/app.json5');
    const manifestJsonObj = JSON5.parse(fs.readFileSync(manifestPath));
    const packageArray = manifestJsonObj.app.bundleName.split('.');
    let dest = path.join(projectDir, '.arkui-x/android/app/src/main/java');
    packageArray.forEach(pkg => {
      dest = path.join(dest, pkg);
    });
    const destClassName = getDestName(moduleName, abilityName, 'apk');
    const destFileName = destClassName + '.java';
    const destFilePath = path.join(dest, destFileName);
    if (fs.existsSync(destFilePath)) {
      fs.unlinkSync(destFilePath);
    }
    const createActivityXmlInfo =
      '    <activity \n' +
      '            android:name=".' + destClassName + '"\n' +
      '        android:exported="true" android:configChanges="uiMode|orientation|screenSize|density" />\n    ';
    const curManifestXmlInfo =
      fs.readFileSync(path.join(projectDir, '.arkui-x/android/app/src/main/AndroidManifest.xml')).toString();
    if (!curManifestXmlInfo.includes(createActivityXmlInfo)) {
      return false;
    }
    const insertIndex = curManifestXmlInfo.lastIndexOf(createActivityXmlInfo);
    const createActivityXmlInfoLength = createActivityXmlInfo.length;
    const updateManifestXmlInfo = curManifestXmlInfo.slice(0, insertIndex) +
      curManifestXmlInfo.slice(insertIndex + createActivityXmlInfoLength);
    fs.writeFileSync(path.join(projectDir, '.arkui-x/android/app/src/main/AndroidManifest.xml'), updateManifestXmlInfo);
    return true;
  } catch (error) {
    console.error('Error occurs when recover in android');
    return false;
  }
}

function recoverStageAbilityInIOS(moduleName, abilityName) {
  try {
    const destClassName = getDestName(moduleName, abilityName, 'app');
    const viewControllerh = path.join(projectDir, '.arkui-x/ios/app/' + destClassName + '.h');
    const viewControllerm = path.join(projectDir, '.arkui-x/ios/app/' + destClassName + '.m');
    if (fs.existsSync(viewControllerh)) {
      fs.unlinkSync(viewControllerh);
    }
    if (fs.existsSync(viewControllerm)) {
      fs.unlinkSync(viewControllerm);
    }
    const curManifestXmlInfo =
      fs.readFileSync(path.join(projectDir, '.arkui-x/ios/app/AppDelegate.m')).toString();
    const createViewControlInfo =
      '} else if ([moduleName isEqualToString:@"' + moduleName + '"] && [abilityName ' +
      'isEqualToString:@"' + abilityName + '"]) {\n' +
      '        NSString *instanceName = [NSString stringWithFormat:@"%@:%@:%@",bundleName, ' +
      'moduleName, abilityName];\n' +
      '        ' + destClassName + ' *entryOtherVC = [[' + destClassName + ' alloc] ' +
      'initWithInstanceName:instanceName];\n' +
      '        entryOtherVC.params = params;\n' +
      '        subStageVC = (' + destClassName + ' *)entryOtherVC;\n' +
      '    ';
    if (!curManifestXmlInfo.includes(createViewControlInfo)) {
      return false;
    }
    const createViewControlInfoLength = createViewControlInfo.length;
    const createViewControlInfoLengthIndex = curManifestXmlInfo.lastIndexOf(createViewControlInfo);
    const insertImportString = '#import "' + destClassName + '.h"\n';
    const insertImportLength = insertImportString.length;
    const insertImportIndex = curManifestXmlInfo.lastIndexOf(insertImportString);
    const updateManifestXmlInfo = curManifestXmlInfo.slice(0, insertImportIndex) +
      curManifestXmlInfo.slice(insertImportIndex + insertImportLength, createViewControlInfoLengthIndex) +
      curManifestXmlInfo.slice(createViewControlInfoLengthIndex + createViewControlInfoLength);
    fs.writeFileSync(path.join(projectDir, '.arkui-x/ios/app/AppDelegate.m'), updateManifestXmlInfo);
    const pbxprojFilePath = path.join(projectDir, '.arkui-x/ios/app.xcodeproj/project.pbxproj');
    if (!recoverFileToPbxproj(pbxprojFilePath, destClassName + '.h', 'headfile') ||
      !recoverFileToPbxproj(pbxprojFilePath, destClassName + '.m', 'sourcefile')) {
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error occurs when recover in ios');
    return false;
  }
}

function recoverFileToPbxproj(pbxprojFilePath, fileName, fileType) {
  if (fileType === 'headfile') {
    const pbxprojFileInfo = fs.readFileSync(pbxprojFilePath).toString();
    if (!pbxprojFileInfo.includes(' /* ' + fileName + ' */ = {isa')) {
      return false;
    }
    const pBXBuildPreIndex = pbxprojFileInfo.lastIndexOf(' /* ' + fileName + ' */ = {isa');
    const pBXBuildSufString = fileName + '; sourceTree = "<group>"; };';
    const pBXBuildSufLength = pBXBuildSufString.length;
    const pBXBuildSufIndex = pbxprojFileInfo.lastIndexOf(pBXBuildSufString);
    const pBXGroupString = ' /* ' + fileName + ' */,';
    const pBXGroupLength = pBXGroupString.length;
    const pBXGroupIndex = pbxprojFileInfo.lastIndexOf(pBXGroupString);
    const updatepbxprojFileInfo = pbxprojFileInfo.slice(0, pBXBuildPreIndex - 27) +
      pbxprojFileInfo.slice(pBXBuildSufIndex + pBXBuildSufLength, pBXGroupIndex - 29) +
      pbxprojFileInfo.slice(pBXGroupIndex + pBXGroupLength);
    fs.writeFileSync(pbxprojFilePath, updatepbxprojFileInfo);
  } else if (fileType === 'sourcefile') {
    const pbxprojFileInfo = fs.readFileSync(pbxprojFilePath).toString();
    if (!pbxprojFileInfo.includes(' /* ' + fileName + ' in Sources */ = {isa')) {
      return false;
    }
    const addPBXBuildInfoPreIndex = pbxprojFileInfo.lastIndexOf(' /* ' + fileName + ' in Sources */ = {isa');
    const addPBXBuildInfoSufString = ' /* ' + fileName + ' */; };';
    const addPBXBuildInfoSufLength = addPBXBuildInfoSufString.length;
    const addPBXBuildInfoSufIndex = pbxprojFileInfo.lastIndexOf(addPBXBuildInfoSufString);
    const addPBXFileReferencePreIndex = pbxprojFileInfo.lastIndexOf(' /* ' + fileName + ' */ = {isa');
    const addPBXFileReferenceSufString = fileName + '; sourceTree = "<group>"; };';
    const addPBXFileReferenceSufLength = addPBXFileReferenceSufString.length;
    const addPBXFileReferenceSufIndex = pbxprojFileInfo.lastIndexOf(addPBXFileReferenceSufString);
    const addchildrenString = ' /* ' + fileName + ' */,';
    const addchildrenLength = addchildrenString.length;
    const addchildrenIndex = pbxprojFileInfo.lastIndexOf(addchildrenString);
    const addPBXSourcesBuildPhaseString = ' /* ' + fileName + ' in Sources */,';
    const addPBXSourcesBuildPhaseLength = addPBXSourcesBuildPhaseString.length;
    const addPBXSourcesBuildPhaseIndex = pbxprojFileInfo.lastIndexOf(addPBXSourcesBuildPhaseString);
    const updatepbxprojFileInfo = pbxprojFileInfo.slice(0, addPBXBuildInfoPreIndex - 27) +
      pbxprojFileInfo.slice(addPBXBuildInfoSufIndex + addPBXBuildInfoSufLength, addPBXFileReferencePreIndex - 27) +
      pbxprojFileInfo.slice(addPBXFileReferenceSufIndex + addPBXFileReferenceSufLength, addchildrenIndex - 29) +
      pbxprojFileInfo.slice(addchildrenIndex + addchildrenLength, addPBXSourcesBuildPhaseIndex - 29) +
      pbxprojFileInfo.slice(addPBXSourcesBuildPhaseIndex + addPBXSourcesBuildPhaseLength);
    fs.writeFileSync(pbxprojFilePath, updatepbxprojFileInfo);
  } else {
    console.log('filetype error');
    return false;
  }
  return true;
}

function getDestName(moduleName, abilityName, fileType) {
  if (fileType === 'apk') {
    return moduleName.replace(/\b\w/g, function(l) {
      return l.toUpperCase();
    }) + abilityName + 'Activity';
  }
  return moduleName.replace(/\b\w/g, function(l) {
    return l.toUpperCase();
  }) + abilityName + 'ViewController';
}

function createTestTem(fileType) {
  projectDir = process.cwd();
  const moduleList = getModuleList(path.join(projectDir, '/build-profile.json5'));
  const templateDir = globalThis.templatePath;
  const curManifestXmlInfo =
    fs.readFileSync(path.join(projectDir, '.arkui-x/android/app/src/main/AndroidManifest.xml')).toString();
  const curAppDelegateInfo =
    fs.readFileSync(path.join(projectDir, '.arkui-x/ios/app/AppDelegate.m')).toString();
  moduleList.forEach(module => {
    const testModule = module + '_test';
    const abilityName = 'TestAbility';
    if (fileType === 'apk') {
      if (!curManifestXmlInfo.includes(getDestName(testModule, abilityName, fileType))) {
        createStageAbilityInAndroid(testModule, abilityName, templateDir, path.join(projectDir, 'entry'));
      }
    } else {
      if (!curAppDelegateInfo.includes(getDestName(testModule, abilityName, fileType))) {
        createStageAbilityInIOS(testModule, abilityName, templateDir, path.join(projectDir, 'entry'));
      }
    }
  });
  return true;
}

function recoverTestTem(fileType) {
  const moduleList = getModuleList(path.join(projectDir, '/build-profile.json5'));
  moduleList.forEach(module => {
    const testModule = module + '_test';
    const abilityName = 'TestAbility';
    if (fileType === 'apk') {
      recoverStageAbilityInAndroid(testModule, abilityName);
    } else {
      recoverStageAbilityInIOS(testModule, abilityName);
    }
  });
  return true;
}
module.exports = { createTestTem, recoverTestTem };
