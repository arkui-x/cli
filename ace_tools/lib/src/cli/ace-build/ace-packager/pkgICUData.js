/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const exec = require('child_process').execSync;
const { arkuiXSdkDir } = require('../../ace-check/configs');
const { getSdkVersion } = require('../../util/index');
const { Platform, platform } = require('../../ace-check/platform');
const { isAppProject } = require('../../util');
const { getSourceArkuixPath } = require('../../ace-check/checkSource');
const JSON5 = require('json5');

function getLangList(projectDir, newLangList) {
  let isFullCopy = false;
  const langPath = path.join(projectDir, '.arkui-x', 'arkui-x-config.json5');
  let arkuiConfig;
  try {
    arkuiConfig = JSON5.parse(fs.readFileSync(langPath));
  } catch (err) {
    return true;
  }
  const langList = arkuiConfig?.buildOption?.resConfigs;
  if (langList && langList.length !== 0) {
    for (const lang of langList) {
      newLangList.push(lang);
    }
  } else {
    isFullCopy = true;
  }
  return isFullCopy;
}

function generateDataFilterFile(dataFilterFilePath, langList) {
  if (langList.length === 0) {
    return false;
  }
  try {
    fs.writeFileSync(dataFilterFilePath, JSON.stringify(langList, null, 2));
    return true;
  } catch (err) {
    throw new Error('generate filter.json err.');
  }
}

function checkICUData(projectDir) {
  let isOk = true;
  const currentArkUIXPath = getSourceArkuixPath() || path.join(arkuiXSdkDir, String(getSdkVersion(projectDir)), 'arkui-x');
  const arkUIXToolPath = path.join(currentArkUIXPath, 'toolchains/bin');
  const icuDataToolPath = path.join(arkUIXToolPath, 'icudata_filter');
  const dataFilterPath = path.join(icuDataToolPath, 'data');
  const filterToolPath = path.join(icuDataToolPath, 'filter_data.js');
  const datFilePath = path.join(currentArkUIXPath, 'engine/systemres/icudt72l.dat');
  const dataFilterFilePath = path.join(icuDataToolPath, 'filter.json');
  let currentPaltform = path.join(icuDataToolPath, 'windows');
  let icupkgPath = path.join(currentPaltform, 'icupkg.exe');
  if (platform === Platform.Linux) {
    currentPaltform = path.join(icuDataToolPath, 'linux');
    icupkgPath = path.join(currentPaltform, 'icupkg');
  } else if (platform === Platform.MacOS) {
    currentPaltform = path.join(icuDataToolPath, 'mac');
    icupkgPath = path.join(currentPaltform, 'icupkg');
  }
  const isValid = !fs.existsSync(icuDataToolPath) || !fs.existsSync(datFilePath) || !fs.existsSync(icupkgPath) ||
    !fs.existsSync(dataFilterPath) || !fs.existsSync(filterToolPath) || !fs.existsSync(dataFilterFilePath);
  if (isValid) {
    isOk = false;
  }
  return {isOk, currentArkUIXPath, datFilePath, icuDataToolPath, dataFilterPath, filterToolPath, currentPaltform};
}

function getIntlOrI18n(depMap) {
  let pluginCount = 0;
  let pluginType = '';
  for (const value of depMap.values()) {
    for (const item of value.library.android) {
      if (item.includes('libi18n.so')) {
        pluginType = 'i18n';
        pluginCount++;
      } else if (item.includes('libintl.so')) {
        pluginType = 'intl';
        pluginCount++;
      }
    }
  }
  return {pluginCount, pluginType};
}

function createOutDir() {
  const tmpDir = os.tmpdir();
  const outDir = path.join(tmpDir, 'ace_tools', 'icudata').replaceAll('\\', '/');
  try {
    if (fs.existsSync(outDir)) {
      fs.rmSync(outDir, { recursive: true });
    }
    fs.mkdirSync(outDir, { recursive: true });
  } catch (err) {
    throw new Error('create tmp dir error, please check.');
  }
  return outDir;
}

function generateDestDatPath(projectDir, system) {
  const androidDir = isAppProject(projectDir) ? 'app' : 'library';
  let destPath = path.join(projectDir, `.arkui-x/android/${androidDir}/src/main/assets/arkui-x/systemres`, 'icudt72l.dat');
  if (system === 'ios') {
    destPath = path.join(projectDir, '.arkui-x/ios/arkui-x/systemres', 'icudt72l.dat');
  }
  return destPath;
}

function execCopyDatCmd(cmds, srcPath, destPath) {
  try {
    exec(cmds, {
      encoding: 'utf-8',
      stdio: 'inherit',
      env: process.env,
    });
    fs.writeFileSync(destPath, fs.readFileSync(srcPath));
  } catch (err) {
    throw new Error('copy icudt72l.dat error, please check.');
  }
}

function checkArkUIXVersion(sdkVersion, isOk, currentArkUIXPath) {
  if (sdkVersion < 18) {
    return false;
  }
  const versionList = [5, 1, 0, 57];
  let arkUIXVersion = '0.0.0.0';
  try {
    arkUIXVersion = JSON.parse(fs.readFileSync(path.join(currentArkUIXPath, 'arkui-x.json'))).version;
  } catch (err) {
    throw new Error('Ace get ArkUI-X version failed. please check.');
  }
  const versionWithoutDotsList = arkUIXVersion.split('.');
  for (let i = 0; i < versionWithoutDotsList.length; i++) {
    versionWithoutDotsList[i] = parseInt(versionWithoutDotsList[i], 10);
  }
  for (let i = 0; i < versionWithoutDotsList.length; i++) {
    if (versionWithoutDotsList[i] > versionList[i]) {
      break;
    } else if (versionWithoutDotsList[i] === versionList[i]) {
      continue;
    } else {
      return false;
    }
  }
  if (!isOk) {
    throw new Error('icudata tool not found, please check.');
  }
  return true;
}

function copyDat(projectDir, system, fileType, depMap) {
  const sdkVersion = getSdkVersion(projectDir);
  const {isOk, currentArkUIXPath, datFilePath, icuDataToolPath, dataFilterPath, filterToolPath, currentPaltform} = checkICUData(projectDir);
  if (!checkArkUIXVersion(sdkVersion, isOk, currentArkUIXPath)) {
    return false;
  }
  const langList = [];
  const {pluginCount, pluginType} = getIntlOrI18n(depMap);
  let type = 'both';
  const hasIntlOrI18nFlag = pluginCount > 0;
  if (pluginCount === 1) {
    type = pluginType;
  }
  const isFullCopy = getLangList(projectDir, langList);
  if (isFullCopy || !hasIntlOrI18nFlag) {
    return true;
  }
  const outDir = createOutDir();
  const destPath = generateDestDatPath(projectDir, system);
  const buildOutDir = path.join(outDir, 'out');
  let cmds = `node ${filterToolPath} --res_dir ${dataFilterPath} --dat_file ${datFilePath} --tool_dir ${currentPaltform} --out_dir ${buildOutDir}`;
  let dataFilterFilePath = path.join(outDir, 'filter.json');
  if (!generateDataFilterFile(dataFilterFilePath, langList)) {
    dataFilterFilePath = path.join(icuDataToolPath, 'filter.json');
  }
  if (hasIntlOrI18nFlag) {
    cmds += ` --filter ${dataFilterFilePath} --module ${type}`;
  }
  const srcPath = path.join(buildOutDir, 'icudt72l.dat');
  execCopyDatCmd(cmds, srcPath, destPath);
  return true;
}

module.exports = { copyDat };
