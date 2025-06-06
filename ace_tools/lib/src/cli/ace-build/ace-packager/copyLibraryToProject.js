/*
 * Copyright (c) 2023 Huawei Device Co., Ltd.
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
const path = require('path');
const { Platform, platform } = require('../../ace-check/platform');
const { copy } = require('../../ace-create/util');
const { getAarName, getIosProjectName } = require('../../util');
const { arkuiXSdkDir } = require('../../ace-check/configs');
const { appCpu2SdkLibMap, appCpu2DestLibDir, clearLibBeforeCopy } = require('./globalConfig');
const { updateIosProjectPbxproj } = require('./adjustPbxproj4Framework');
const { getSdkVersion } = require('../../util/index');
const { getSourceArkuixPath } = require('../../ace-check/checkSource');
const { copyDat } = require('./pkgICUData');

const arkUIXSdkName = 'arkui-x';
let arkuiXSdkPath = '';
let arkUIXSdkRootLen = 0;
let projectRootLen = 0;
function getSubProjectDir(fileType, projectDir) {
  if (fileType === 'apk') {
    return ['app'];
  } else if (fileType === 'ios' || fileType === 'ios-framework' || fileType === 'ios-xcframework') {
    return ['ios'];
  } else if (fileType === 'aar') {
    return getAarName(projectDir);
  }
}

/**
 *disable log output for current module
 **/
const printLogControl = false;

function printLog() {
  if (printLogControl) {
    let info = '';
    for (const argument in arguments) {
      info = info + arguments[argument];
    }
    console.log(info);
  }
}

/*
* return process option when a lib file is not found
* current implementation ,return 2 -- ignore all
* libraryPath --- the libfile that can't be found
* return number：
* 0 --- throw exception , break current copying library process
* 1 --- ignore current error and  continue
* 2 --- ignore all not found error on libfiles and continue
 */
function processOnNotFound() {
  return 2;
}

/**
 * load a json file and return json object
 **/
function getJsonConfig(apiConfigPath) {
  if (fs.existsSync(apiConfigPath)) {
    try {
      printLog('\tload:', apiConfigPath);
      return JSON.parse(fs.readFileSync(apiConfigPath));
    } catch (err) {
      printLog('\tload error:', apiConfigPath, '::', err);
      throw new Error('load error:' + apiConfigPath + ', please check ');
    }
  } else {
    printLog('\tcould not find: ', apiConfigPath);
    throw new Error('could not find: ' + apiConfigPath + ', please check ');
  }
}

function getCpuList(buildProject, projectDir, system, cmd) {
  if (system === 'android') {
    const androidGradlePath = path.join(projectDir,
      '.arkui-x/android/' + buildProject + '/build.gradle');
    if (fs.existsSync(androidGradlePath)) {
      let gradleData = fs.readFileSync(androidGradlePath, 'utf-8');
      gradleData = gradleData.trim().split('\n');
      let ndkList;
      gradleData.some(element => {
        if (element.indexOf(`abiFilters`) >= 0) {
          ndkList = '[' + element.replace(`abiFilters`, '') + ']';
          ndkList = JSON.parse(ndkList);
        }
      });
      if (!ndkList) {
        if (!cmd.targetPlatform) {
          ndkList = ['arm64-v8a'];
        } else {
          const abiList = [];
          cmd.targetPlatform.split(',').forEach(abi => {
            if (abi === 'arm64') {
              abiList.push('arm64-v8a');
            } else if (abi === 'arm') {
              abiList.push('armeabi-v7a');
            } else if (abi === 'x86_64') {
              abiList.push('x86_64');
            }
          });
          ndkList = abiList;
        }
      }
      return ndkList;
    }
  } else {
    return ['arm64'];
  }
}

function deleteOldFile(deleteFilePath) {
  try {
    if (fs.existsSync(deleteFilePath)) {
      const files = fs.readdirSync(deleteFilePath);
      files.forEach(function(file, index) {
        const curPath = path.join(deleteFilePath, file);
        if (fs.statSync(curPath).isDirectory()) {
          deleteOldFile(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(deleteFilePath);
    }
  } catch (error) {
    printLog('deleteOldfile:', error);
  }
}

function loaderArchType(fileType, cmd, projectDir, system, depMap, apiConfigMap) {
  let compileType = 'release';
  if (cmd.debug) {
    compileType = 'debug';
  } else if (cmd.profile) {
    compileType = 'profile';
  }
  const subProjectNameList = getSubProjectDir(fileType, projectDir);
  let allCheckMap = new Map();
  let depCheckMap = new Map();
  subProjectNameList.forEach(buildProject => {
    const cpuList = getCpuList(buildProject, projectDir, system, cmd);
    printLog('\nbuildSubProject : ', buildProject, '  Cpu List : ', cpuList);
    for (const cpuIndex in cpuList) {
      const archType = appCpu2SdkLibMap[system][cpuList[cpuIndex]][compileType][0];
      const destLibDirMap = appCpu2DestLibDir[system][cpuList[cpuIndex]];
      depCheckMap = copyLibrary(projectDir, archType, depMap, depCheckMap, system,
        destLibDirMap, buildProject);
      allCheckMap = makeAllLibraryCheckMap(projectDir, archType, apiConfigMap, system,
        destLibDirMap, allCheckMap, buildProject);
    }
  });
  return {allCheckMap: allCheckMap, depCheckMap: depCheckMap};
}

let ignoreAll = false;

function autoMakeDir(projectDir, destLibDirMap, buildProject) {
  Object.keys(destLibDirMap).forEach((fileType) => {
    let filePath = path.join(projectDir, destLibDirMap[fileType]);
    filePath = filePath.replace('{subdir}', buildProject);
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }
  });
}

function copyLibrary(projectDir, archType, depMap, depFileMap, system, destLibDirMap, buildProject) {
  system = system.replace('-simulator', '');
  autoMakeDir(projectDir, destLibDirMap, buildProject);
  depMap.forEach(function(value, key) {
    const paths = value['library'][system];
    for (let libraryPath in paths) {
      libraryPath = paths[libraryPath].replace('arch_type', archType);
      libraryPath = libraryPath.replace('build_modes', archType);
      const fileType = libraryPath.split('.').pop();
      const checkResult = checkLibraryPath(libraryPath);
      if (!checkResult) {
        let guestOption = 1;
        printLog('\t', key, ':Error ==> cannot find library:', libraryPath);
        if (!ignoreAll) {
          guestOption = processOnNotFound();
        }
        if (!guestOption || guestOption === 0) {
          throw new Error('library not found: ' + libraryPath);
        } else if (guestOption === 2) {
          ignoreAll = true;
        }
      }
      if (!destLibDirMap[fileType]) {
        throw new Error('Unkown Target Path in Project for File Type:' + fileType +
        ',check appCpu2DestLibDir in configuration file :globalConfig.js ,Please!');
      }
      let filePath = path.join(projectDir, destLibDirMap[fileType]);
      filePath = filePath.replace('{subdir}', buildProject);
      let usedSet = depFileMap.get(filePath);
      if (!usedSet) {
        usedSet = new Set();
        depFileMap.set(filePath, usedSet);
      }
      filePath = filePath.replace('{subdir}', buildProject);
      let libraryName;
      if (platform === Platform.Windows) {
        libraryName = libraryPath.split('\\').pop();
      } else {
        libraryName = libraryPath.split('/').pop();
      }
      usedSet.add(libraryName);
      if (checkResult) {
        copyOneLibrary(key, libraryPath, filePath);
      }
    }
  });
  return depFileMap;
}

function makeAllLibraryCheckMap(projectDir, archType, srcMap, system, destLibDirMap, outMap, buildProject) {
  system = system.replace('-simulator', '');
  if (!outMap) {
    outMap = new Map();
  }
  srcMap.forEach(function(value, key) {
    const paths = value['library'][system];
    for (let libraryPath in paths) {
      libraryPath = paths[libraryPath].replace('arch_type', archType);
      libraryPath = libraryPath.replace('build_modes', archType);
      const fileType = libraryPath.split('.').pop();
      if (checkLibraryPath(libraryPath)) {
        let libraryName;
        if (platform === Platform.Windows) {
          libraryName = libraryPath.split('\\').pop();
        } else {
          libraryName = libraryPath.split('/').pop();
        }
        if (destLibDirMap[fileType]) {
          let filePath = path.join(projectDir, destLibDirMap[fileType]);
          filePath = filePath.replace('{subdir}', buildProject);
          let outset = outMap.get(filePath);
          if (!outset) {
            outMap.set(filePath, new Set());
            outset = outMap.get(filePath);
          }
          outset.add(libraryName);
        }
      }
    }
  });
  return outMap;
}

function checkLibraryPath(libraryPath) {
  if (fs.existsSync(libraryPath)) {
    return true;
  } else {
    return false;
  }
}

function copyOneLibrary(moduleName, src, dest) {
  if (platform === Platform.Windows) {
    dest = path.join(dest, src.split('\\').pop());
  } else {
    dest = path.join(dest, src.split('/').pop());
  }
  const src0 = src.substr(arkUIXSdkRootLen);
  const tar0 = dest.substr(projectRootLen);
  if (fs.statSync(src).isFile()) {
    try {
      printLog('\t', moduleName, ': copy {' + arkUIXSdkName + ' SDK}', src0 + '\n\t\tto ', tar0);
      fs.writeFileSync(dest, fs.readFileSync(src));
    } catch (err) {
      printLog('\t', moduleName, ': copy Librarys err:', err);
    }
  } else {
    printLog('\t', moduleName, ': copy {' + arkUIXSdkName + ' SDK}', src0 + '\n\t\tto ', tar0);
    copy(src, dest);
  }
}

function processLib(libpath, depLibSet, allLibSet, removeUnused) {
  if (fs.existsSync(libpath)) {
    const files = fs.readdirSync(libpath);
    files.forEach(function(file, index) {
      const curPath = path.join(libpath, file);
      if (!depLibSet.has(file) && allLibSet.has(file)) {
        printLog('found unused Lib Dir:[', libpath, '=>', file, '],',
          removeUnused ? ', delete this unused!' : ' and leave it unused!');
        if (removeUnused) {
          deleteOldFile(curPath);
        }
      }
    });
  }
}

/**
 * main function to copy library files into project lib directory
 **/
function copyLibraryToProject(fileType, cmd, projectDir, system) {
  const version = getSdkVersion(projectDir);
  arkuiXSdkPath = getSourceArkuixPath() || (arkuiXSdkDir + `/${version}/arkui-x`);
  const apiConfigMap = loadApiConfigJson(arkuiXSdkPath);
  const collectionSet = loadCollectionJson(projectDir);
  arkUIXSdkRootLen = arkuiXSdkPath.length;
  projectRootLen = projectDir.length;
  let moduleNameList;
  collectionSet.forEach(moduleName => {
    if (!moduleNameList) {
      moduleNameList = moduleName;
    } else {
      moduleNameList = moduleNameList + ' , ' + moduleName;
    }
  });
  if (!moduleNameList) {
    moduleNameList = '';
  }
  printLog('source dependent modules: [', moduleNameList, ']');
  let depMap = new Map();
  depMap = finddeps(collectionSet, depMap, apiConfigMap, system);
  const checkMap = loaderArchType(fileType, cmd, projectDir, system, depMap, apiConfigMap);
  checkMap.depCheckMap.forEach(function(depCheckSet, libpath) {
    const allLibSet = checkMap.allCheckMap.get(libpath);
    if (!allLibSet) {
      throw new Error('Could not find any lib for ' + system +
        ',in [' + arkuiXSdkPath + '], Check config for ArkUI-X SDK,Please!');
    }
    processLib(libpath, depCheckSet, allLibSet, clearLibBeforeCopy);
  });
  if (system === 'ios') {
    checkMap.allCheckMap.forEach(function(allLibSet, libpath) {
      updateIosProjectPbxproj(fileType, projectDir, depMap, system,
        true, function(libname) { }, allLibSet);
    });
  }
  copyDat(projectDir, system, fileType, depMap);
}

function installPodfiles(fileType, cmd, projectDir, system) {
  const version = getSdkVersion(projectDir);
  arkuiXSdkPath = getSourceArkuixPath() || (arkuiXSdkDir + `/${version}/arkui-x`);
  const apiConfigMap = loadApiConfigJson(arkuiXSdkPath);
  const collectionSet = loadCollectionJson(projectDir);
  const depMap = finddeps(collectionSet, new Map(), apiConfigMap, system);
  const sdkPaths = new Set();
  const handleLibraryPath = (libraryPath, key) => {
    const checkResult = checkLibraryPath(libraryPath);
    if (!checkResult) {
      let guestOption = 1;
      printLog('\t', key, ':Error ==> cannot find library:', libraryPath);
      if (!ignoreAll) {
        guestOption = processOnNotFound();
      }
      if (!guestOption || guestOption === 0) {
        throw new Error(`library not found: ${libraryPath}`);
      }
      if (guestOption === 2) {
        ignoreAll = true;
      }
    }
  };
  depMap.forEach((value, key) => {
    const paths = value.library?.[system] || [];
    for (const libraryPath of paths) {
      handleLibraryPath(libraryPath, key);
      sdkPaths.add(path.basename(libraryPath));
    }
  });
  createPodspec(arkuiXSdkPath, Array.from(sdkPaths));
  updatePodfile(arkuiXSdkPath, projectDir);
  copyDat(projectDir, system, fileType, depMap);
}

function createPodspec(arkuiXSdkPath, depCheckSet) {
  const libpathsArray = depCheckSet
    .map(libname => findXCFrameworkRelativePath(libname, arkuiXSdkPath))
    .filter(libpath => libpath)
    .map(libpath => `"${libpath}"`);
  const libpaths = libpathsArray.join(',');

  const podspecPath = path.join(arkuiXSdkPath, 'arkui-x.podspec');
  const content = `
Pod::Spec.new do |spec|

  spec.name          = "arkui-x"
  spec.version       = "1.0.0"
  spec.summary       = "The ArkUI-X project extends the ArkUI framework to multiple OS platforms."
  spec.description   = <<-DESC
    The ArkUI-X project extends the ArkUI framework to multiple OS platforms.
    This enables developers to use one main set of code to develop applications for multiple OS platforms.
  DESC
  spec.homepage      = "https://arkui-x.cn"
  spec.license       = { :type => "Apache" }
  spec.author        = { "ArkUI Dev Team" => "contact@mail.arkui-x.cn" }
  spec.source        = { :git => "https://gitcode.com/arkui-x", :tag => "#{spec.version}" }
  spec.ios.deployment_target = '10.0'
  spec.vendored_frameworks = ${libpaths}

end`;
  createFileWithContent(podspecPath, content);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updatePodfile(arkuiXSdkPath, projectDir) {
  try {
    const podfilePath = path.join(projectDir, '.arkui-x/ios/Podfile');
    const content = fs.readFileSync(podfilePath, 'utf8');
    const arkuixPodLine = `\n  pod 'arkui-x', :path => '${arkuiXSdkPath}'`;

    if (!content.includes(arkuixPodLine)) {
      const targetName = getIosProjectName(projectDir);
      const escapedTargetName = escapeRegExp(targetName);
      const targetRegex = new RegExp(
        `(target\\s+['"]${escapedTargetName}['"]\\s+do\\s*[\\s\\S]*?)(\\n\\s*end)`
      );
      const updatedContent = content.replace(targetRegex, `$1${arkuixPodLine}$2`);
      createFileWithContent(podfilePath, updatedContent);
    }
  } catch (error) {
    console.error(`Error updating Podfile: ${error.message}`);
    throw error;
  }
}

function findXCFrameworkRelativePath(frameworkName, searchDir) {
  if (!frameworkName.endsWith('.xcframework') || !fs.existsSync(searchDir)) {
    return null;
  }
  try {
    const dirQueue = [searchDir];
    for (let currentDir = dirQueue.shift(); currentDir; currentDir = dirQueue.shift()) {
      const foundPath = processDirectory(currentDir, frameworkName, searchDir, dirQueue);
      if (foundPath) {
        return foundPath;
      }
    }
    return null;
  } catch (error) {
    console.error(`find xcframework error: ${error.message}`);
    return null;
  }
}

function processDirectory(currentDir, targetName, baseDir, queue) {
  try {
    for (const file of fs.readdirSync(currentDir)) {
      const filePath = path.join(currentDir, file);
      const isTarget = checkAndQueue(file, filePath, targetName, baseDir, queue);
      if (isTarget) {
        return isTarget;
      }
    }
    return null;
  } catch (err) {
    console.error(`Skipping ${currentDir}: ${err.message}`);
    return null;
  }
}

function checkAndQueue(fileName, filePath, targetName, baseDir, queue) {
  try {
    if (fileName === targetName) {
      return path.relative(baseDir, filePath);
    }
    if (fs.statSync(filePath).isDirectory()) {
      queue.push(filePath);
    }
    return null;
  } catch (err) {
    console.error(`Skipping ${filePath}: ${err.message}`);
    return null;
  }
}

function createFileWithContent(filePath, content) {
  const fullPath = path.resolve(filePath);
  try {
      fs.writeFileSync(fullPath, content, { 
          encoding: 'utf-8',
          flag: 'w'
      });
      return true;
  } catch (error) {
      console.error(`write podspec file fail: ${error.message}`);
      return false;
  }
}

/*
specifications for callbackFunction
fullname ---absolute path ,
fileName ---current file or directory,
isDir   --true --directory，false file
fileProcessRule --user defined file process rule
args   ---user define argument
return true--continue traverse, false --end traversing
 callbackFunction(fullname , fileName, isDir, fileProcessRule, args)

specification for ruleCheckerFunction
fullname ---absolute path ,
fileName ---current file or directory,
isDir   --true --directory，false file
dirProcessRule --user defined file process rule
return  ---new rule for file fileName
  ruleCheckerFunction(fullname, fileName, isDir, dirProcessRule)
*/
function traversalDir(dir, callbackFunction, args, ruleCheckerFunction, dirProcessRule) {
  if (!callbackFunction) {
    return args;
  }
  const readlist = fs.readdirSync(dir);
  for (const key in readlist) {
    const fullname = path.join(dir, readlist[key]);
    const isDir = fs.statSync(fullname).isDirectory();
    let fileProcessRule = dirProcessRule;
    if (ruleCheckerFunction) {
      fileProcessRule = ruleCheckerFunction(fullname, readlist[key], isDir, dirProcessRule);
    }

    const goonProc = callbackFunction(fullname, readlist[key], isDir, fileProcessRule, args);
    if (!goonProc) {
      return args;
    }
    if (isDir) {
      args = traversalDir(fullname, callbackFunction, args, ruleCheckerFunction, fileProcessRule);
    }
  }
  return args;
}

const defaultDir = './'; // current project dir
const matchNameList = ['build', 'cache'];

function loadCollectionJson(projectDir) {
  printLog('load dependent modules from project:');
  const loadState = {};
  loadState.collectionSet = new Set();
  loadState.moduleCount = 0;
  loadState.componentCount = 0;
  const nextMatchIndex = 0;

  /**
   * start to load json file after  subdirs named 'build' and 'cache' were found
   */
  try {
    traversalDir(defaultDir, (fullname, fileName, isDir, nextMatchIndex0, loadState) => {
      if (nextMatchIndex0 < matchNameList.length) {
        return true;
      }
      if (fileName === 'component_collection.json') {
        loadState.collectionSet = loadCollection(getJsonConfig(fullname), loadState.collectionSet);
        loadState.componentCount += 1;
      } else if (fileName === 'module_collection.json') {
        loadState.collectionSet = loadCollection(getJsonConfig(fullname), loadState.collectionSet);
        loadState.moduleCount += 1;
      }
      return true;
    }, loadState,
    (fullname, fileName, isDir, nextMatchIndex0) => {
      if (nextMatchIndex0 >= matchNameList.length) {
        return nextMatchIndex0;
      } else if (fileName === matchNameList[nextMatchIndex0]) {
        return nextMatchIndex0 + 1;
      } else {
        return nextMatchIndex0;
      }
    }, nextMatchIndex);
    printLog('\t\t' + loadState.componentCount + ' component_collection.json file(s) loaded!');
    printLog('\t\t' + loadState.moduleCount + ' module_collection.json file(s) loaded!');
  } catch (err) {
    printLog('get componentCollection data failed');
  }
  return loadState.collectionSet;
}

function loadApiConfigJson(arkuiXSdkPath) {
  printLog('load apiconfig from SDK');
  const engineApiConfig = getJsonConfig(path.join(arkuiXSdkPath,
    '/engine/apiConfig.json'));
  const pluginsApiConfig = getJsonConfig(path.join(arkuiXSdkPath,
    '/plugins/api/apiConfig.json'));
  const pluginsComponentApiConfig = getJsonConfig(path.join(arkuiXSdkPath,
    '/plugins/component/apiConfig.json'));
  let apiConfigMap = new Map();
  let rootpath = {
    'android': path.join(arkuiXSdkPath, '/engine'),
    'ios': path.join(arkuiXSdkPath, '/engine'),
  };
  apiConfigMap = loadApiConfig(rootpath, engineApiConfig, apiConfigMap);
  rootpath = {
    'android': path.join(arkuiXSdkPath, '/plugins/api'),
    'ios': path.join(arkuiXSdkPath, '/plugins/api'),
  };
  apiConfigMap = loadApiConfig(rootpath, pluginsApiConfig, apiConfigMap);
  rootpath = {
    'android': path.join(arkuiXSdkPath, '/plugins/component'),
    'ios': path.join(arkuiXSdkPath, '/plugins/component'),
  };
  apiConfigMap = loadApiConfig(rootpath, pluginsComponentApiConfig, apiConfigMap);
  return apiConfigMap;
}

const baseModule = 'engine/arkui';

function finddeps(collectionSet, depMap, apiConfigMap, system) {
  depMap = findOneDep(baseModule, depMap, apiConfigMap, system);
  printLog('basic module : ', baseModule);
  depMap.forEach(function(value, key) {
    printLog('\t', key);
  });
  collectionSet.forEach(moduleName => {
    depMap = findOneDep(moduleName, depMap, apiConfigMap, system);
  });
  return depMap;
}

function findOneDep(moduleName, depMap, apiConfigMap, system) {
  if (depMap.has(moduleName)) {
    return depMap;
  }
  const moduleObj = apiConfigMap.get(moduleName);
  if (!moduleObj) {
    printLog('error: cannot find the define of [' + moduleName + ']');
    return depMap;
  }
  depMap.set(moduleName, moduleObj);
  const moduleNameDeps = moduleObj.deps;
  if (!moduleNameDeps) {
    return depMap;
  }
  if (!moduleNameDeps[system]) {
    return depMap;
  }
  const moduleNameDepsSystem = moduleNameDeps[system];
  for (const depsModuleName in moduleNameDepsSystem) {
    depMap = findOneDep(moduleNameDepsSystem[depsModuleName], depMap, apiConfigMap, system);
  }
  return depMap;
}

function loadCollection(collection, collectionSet) {
  for (const key in collection) {
    const collectionList = collection[key];
    for (const modules in collectionList) {
      collectionSet.add(collectionList[modules]);
    }
  }
  return collectionSet;
}

function loadApiConfig(RootPath, ApiConfig, apiConfigMap) {
  if (ApiConfig) {
    try {
      ApiConfig.forEach(element => {
        let temppath = element.library.android;
        for (let i = 0; i < temppath.length; i++) {
          temppath[i] = path.join(RootPath.android, temppath[i]);
        }
        element.library.android = temppath;
        apiConfigMap.set(element.module, element);
        temppath = element.library.ios;
        for (let i = 0; i < temppath.length; i++) {
          temppath[i] = path.join(RootPath.ios, temppath[i]);
        }
        element.library.ios = temppath;
        apiConfigMap.set(element.module, element);
      });
    } catch (err) {
      throw new Error('Error apiConfig:' + err);
    }
  }
  return apiConfigMap;
}

module.exports = { copyLibraryToProject, installPodfiles };

