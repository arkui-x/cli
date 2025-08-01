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
const { getAarName, isAppProject } = require('../../util');
const { getSourceArkuixPath } = require('../../ace-check/checkSource');

const langMap = new Map([
  ['android', new Map([
    ['zh_cn', 'zh_CN'], ['zh_hk', 'zh_HK'], ['zh_tw', 'zh_TW'], ['bo_cn', 'bo_CN'], ['bo', 'bo'], ['pt', 'pt'],
    ['it', 'it'], ['ru', 'ru'], ['fr', 'fr'], ['de', 'de'], ['ar', 'ar'], ['es', 'es'], ['cs', 'cs'], ['hr', 'hr'],
    ['ja', 'ja'], ['ko', 'ko'], ['pl', 'pl'], ['vi', 'vi'], ['ms', 'ms'], ['az_az', 'az_AZ'], ['az', 'az'],
    ['be', 'be'], ['bg', 'bg'], ['ca', 'ca'], ['da', 'da'], ['el', 'el'], ['es_us', 'es_US'], ['et', 'et'],
    ['fa', 'fa'], ['fi', 'fi'], ['hi', 'hi'], ['hu', 'hu'], ['in', 'in'], ['iw', 'iw'], ['ka_ge', 'ka_GE'],
    ['pt_pt', 'pt_PT'], ['si_lk', 'si_LK'], ['sk', 'sk'], ['ka', 'ka'], ['si', 'si'], ['sl', 'sl'], ['sv', 'sv'],
    ['th', 'th'], ['tur', 'tr'], ['tr', 'tr'], ['ur', 'ur'], ['kk_kz', 'kk_KZ'], ['kk', 'kk'], ['nl', 'nl'],
    ['sr_latn', 'sr_Latn'], ['sr', 'sr'], ['km_kh', 'km_KH'], ['km', 'km'], ['sw', 'sw'], ['lv', 'lv'],
    ['lo_la', 'lo_LA'], ['lo', 'lo'], ['lt', 'lt'], ['ro', 'ro'], ['mk', 'mk'], ['mn', 'mn'], ['my_zg', 'my_ZG'],
    ['my_mm', 'my_MM'], ['my', 'my'], ['nb', 'nb'], ['ne', 'ne'], ['tl', 'tl'], ['bn', 'bn'], ['uk', 'uk'],
    ['zz_zx', 'zz_ZX'], ['zz', 'zz'], ['en_gb', 'en_GB'], ['eu', 'eu'], ['bs', 'bs'], ['gl', 'gl'],
    ['jv_latn', 'jv_Latn'], ['jv', 'jv'], ['ml', 'ml'], ['mr', 'mr'], ['ta', 'ta'], ['uz', 'uz'], ['ug', 'ug'],
    ['mai', 'mai'], ['mi', 'mi'], ['am', 'am'], ['as', 'as'], ['gu', 'gu'], ['kn', 'kn'], ['or', 'or'], ['pa', 'pa'],
    ['te', 'te'], ['zh', 'zh'], ['en', 'en'], ['en_us', 'en_US'], ['en_ca', 'en_CA'],
  ])],
  ['ios', new Map([
    ['zh-Hans', 'zh_Hans'], ['zh-Hans-CN', 'zh_Hans_CN'], ['zh-HK', 'zh_HK'], ['zh-Hant', 'zh_Hant'], ['ug-CN', 'ug'],
    ['zh-Hant-HK', 'zh_Hant_HK'], ['zh-Hant-TW', 'zh_Hant_TW'], ['bo-CN', 'bo_CN'], ['bo', 'bo'], ['pt', 'pt'],
    ['it', 'it'], ['ru', 'ru'], ['fr', 'fr'], ['de', 'de'], ['ar', 'ar'], ['es', 'es'], ['cs', 'cs'], ['hr', 'hr'],
    ['ja', 'ja'], ['ko', 'ko'], ['pl', 'pl'], ['vi', 'vi'], ['ms', 'ms'], ['az-AZ', 'az_AZ'], ['be', 'be'],
    ['bg', 'bg'], ['ca', 'ca'], ['da', 'da'], ['el', 'el'], ['es-US', 'es_US'], ['et', 'et'], ['fa', 'fa'],
    ['fi', 'fi'], ['hi', 'hi'], ['hu', 'hu'], ['id', 'in'], ['he', 'iw'], ['ka-GE', 'ka_GE'], ['pt-PT', 'pt_PT'],
    ['si-LK', 'si_LK'], ['sk', 'sk'], ['sl', 'sl'], ['sv', 'sv'], ['th', 'th'], ['tr', 'tr'], ['ur', 'ur'],
    ['kk-KZ', 'kk_KZ'], ['nl', 'nl'], ['sr-Latn', 'sr_Latn'], ['km-KH', 'km_KH'], ['sw', 'sw'], ['lv', 'lv'],
    ['lo-LA', 'lo_LA'], ['lt', 'lt'], ['ro', 'ro'], ['mk', 'mk'], ['mn', 'mn'], ['my-MM', 'my_MM'], ['nb', 'nb'],
    ['ne', 'ne'], ['fil', 'tl'], ['bn', 'bn'], ['uk', 'uk'], ['zz-ZX', 'zz_ZX'], ['en-GB', 'en_GB'], ['eu', 'eu'],
    ['bs', 'bs'], ['gl', 'gl'], ['jv-ID', 'jv_Latn'], ['ml', 'ml'], ['mr', 'mr'], ['ta', 'ta'], ['uz', 'uz'],
    ['ug', 'ug'], ['mai', 'mai'], ['mi', 'mi'], ['am', 'am'], ['as', 'as'], ['gu', 'gu'], ['kn', 'kn'], ['or', 'or'],
    ['pa', 'pa'], ['te', 'te'], ['zh', 'zh'], ['en', 'en'], ['en-US', 'en_US'], ['en-CA', 'en_CA'],])],
]);

function getSubProjectDirName(fileType, projectDir) {
  const iosTypes = ['ios', 'ios-framework', 'ios-xcframework'];
  if (fileType === 'apk') {
    return ['app'];
  } else if (iosTypes.includes(fileType)) {
    return ['ios'];
  } else if (fileType === 'aar') {
    return getAarName(projectDir);
  } else {
    return [];
  }
}

function getLangListFromConfigFile(projectDir, langList, system, fileType) {
  const subProjectNameList = getSubProjectDirName(fileType, projectDir);
  const resConfigsReg = new RegExp(`^//.*$`);
  for (const buildProject of subProjectNameList) {
    if (system === 'android') {
      const androidGradlePath = path.join(projectDir, `.arkui-x/android/${buildProject}/build.gradle`);
      if (!fs.existsSync(androidGradlePath)) {
        return false;
      }
      let gradleData = fs.readFileSync(androidGradlePath, 'utf-8');
      gradleData = gradleData.trim().split('\n');
      for (const element of gradleData) {
        if (!resConfigsReg.test(element.trim()) && element.indexOf(`resConfigs`) >= 0) {
          let langListStr = `[${element.replace('resConfigs', '')}]`;
          langListStr = JSON.parse(langListStr);
          langList.push(...langListStr);
        } else if (!resConfigsReg.test(element.trim()) && element.indexOf(`resConfig`) >= 0) {
          langList.push(element.replace(`resConfig`, '').replaceAll('"', '').trim());
        }
      }
    } else if (system === 'ios') {
      const iosPbxprojPath = path.join(projectDir, '.arkui-x/ios/app.xcodeproj/project.pbxproj');
      if (!fs.existsSync(iosPbxprojPath)) {
        return false;
      }
      const pbxprojData = fs.readFileSync(iosPbxprojPath, 'utf-8');
      const knownRegionsRegex = /knownRegions\s*=\s*\(([^)]+)\)/;
      const match = pbxprojData.match(knownRegionsRegex);
      if (match) {
        const languages = match[1].split('\n')
          .map(line => line.replace(/[";,]/g, '').trim())
          .filter(Boolean);
        if (languages.length === 2 && languages.includes('en') && languages.includes('Base')) {
          return false;
        } else {
          languages
            .filter(lang => lang !== 'Base')
            .forEach(lang => {
              langList.push(lang);
            });
        }
      }
    }
  }
  return true;
}

function getLangList(fileType, projectDir, system, newLangList) {
  const langList = [];
  if (!getLangListFromConfigFile(projectDir, langList, system, fileType)) {
    return false;
  }
  let isFullCopy = false;
  if (system === 'android') {
    const iso6391OrIso6392Lang = new RegExp('^[a-zA-Z]{2,3}$');
    const iso6391OrIso6392LangAndLocale = new RegExp('^[a-zA-Z]{2,3}-[rR][a-zA-Z]{2}$');
    const bcp47Lang = new RegExp(`^b\\+(?<lang>[a-zA-Z]{2,3})(\\+(?<ext>[a-zA-Z0-9]{2,}))*$`);
    for (const item of langList) {
      let icuKey = '';
      if (iso6391OrIso6392Lang.test(item) && item.toLowerCase() !== 'car') {
        icuKey = item.toLowerCase();
      } else if (iso6391OrIso6392LangAndLocale.test(item)) {
        icuKey = item.toLowerCase().replace('-r', '_');
      } else if (bcp47Lang.test(item)) {
        icuKey = item.toLowerCase().replaceAll('+', '_');
        icuKey = icuKey.slice(2);
      } else {
        continue;
      }
      if (langMap.get(system).has(icuKey)) {
        newLangList.push(langMap.get(system).get(icuKey));
      } else {
        console.warn(`Warning: Unsupported language: ${item}.`);
        isFullCopy = true;
      }
    }
  } else if (system === 'ios') {
    for (const item of langList) {
      if (langMap.get(system).has(item)) {
        if (item === 'my-MM') {
          newLangList.push('my_MM', 'my_ZG');
        } else {
          newLangList.push(langMap.get(system).get(item));
        }
      } else {
        console.warn(`Warning: Unsupported language: ${item}.`);
        isFullCopy = true;
      }
    }
  }
  if (isFullCopy) {
    newLangList.length = 0;
  } else {
    const setList = Array.from(new Set(newLangList));
    newLangList.length = 0;
    newLangList.push(...setList);
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

function findIcuDataFile(directory) {
  if (!directory) {
    directory = '.';
  }
  const files = fs.readdirSync(directory);
  const pattern = /^icudt(\d+)l\.dat$/i;

  for (const filename of files) {
      if (pattern.test(filename)) {
          const filePath = path.join(directory, filename);
          if (fs.statSync(filePath).isFile()) {
              return path.resolve(filePath);
          }
      }
  }
  throw new Error('find icu data file error, please check.');
}

function checkICUData(projectDir) {
  let isOk = true;
  const currentArkUIXPath = getSourceArkuixPath() || path.join(arkuiXSdkDir, String(getSdkVersion(projectDir)), 'arkui-x');
  const arkUIXToolPath = path.join(currentArkUIXPath, 'toolchains/bin');
  const icuDataToolPath = path.join(arkUIXToolPath, 'icudata_filter');
  const dataFilterPath = path.join(icuDataToolPath, 'data');
  const filterToolPath = path.join(icuDataToolPath, 'filter_data.js');
  const datFilePath = findIcuDataFile(path.join(currentArkUIXPath, 'engine/systemres'));
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

function generateDestDatPath(projectDir, system, datName) {
  const androidDir = isAppProject(projectDir) ? 'app' : 'library';
  let destPath = path.join(projectDir, `.arkui-x/android/${androidDir}/src/main/assets/arkui-x/systemres`, datName);
  if (system === 'ios') {
    destPath = path.join(projectDir, '.arkui-x/ios/arkui-x/systemres', datName);
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
    throw new Error('copy icu data file error, please check.');
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
  const isFullCopy = getLangList(fileType, projectDir, system, langList);
  const outDir = createOutDir();
  const destPath = generateDestDatPath(projectDir, system, path.basename(datFilePath));
  if (isFullCopy) {
    try {
      fs.writeFileSync(destPath, fs.readFileSync(datFilePath));
    } catch (err) {
      throw new Error('copy icu data file error, please check.');
    }
    return true;
  }
  const buildOutDir = path.join(outDir, 'out');
  let cmds = `node ${filterToolPath} --res_dir ${dataFilterPath} --dat_file ${datFilePath} --tool_dir ${currentPaltform} --out_dir ${buildOutDir}`;
  let dataFilterFilePath = path.join(outDir, 'filter.json');
  if (!generateDataFilterFile(dataFilterFilePath, langList)) {
    dataFilterFilePath = path.join(icuDataToolPath, 'filter.json');
  }
  if (hasIntlOrI18nFlag) {
    cmds += ` --filter ${dataFilterFilePath} --module ${type}`;
  }
  const srcPath = path.join(buildOutDir, path.basename(datFilePath));
  execCopyDatCmd(cmds, srcPath, destPath);
  return true;
}

module.exports = { copyDat };
