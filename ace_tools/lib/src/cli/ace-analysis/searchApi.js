/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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
const { spawn } = require('child_process');
const { Platform, platform } = require('../ace-check/platform');
const { createHtml } = require('./createHtml');
const { getDevVersion } = require('../ace-build');
const { openHarmonySdkDir, devEcoStudioDir } = require('../ace-check/configs');
let GLOBAL_SDK_PATH = '/Applications/DevEco-Studio.app/Contents/sdk';
const PATH_KIT_HMS = (platform === Platform.MacOS) ? '/default/hms/ets/kits/' : '\\default\\hms\\ets\\kits\\';
const PATH_KIT_OH = (platform === Platform.MacOS) ? '/default/openharmony/ets/kits/' : '\\default\\openharmony\\ets\\kits\\';
const PATH_TRAVERSAL_COMPONENT = (platform === Platform.MacOS) ? '/default/openharmony/ets/component/' : '\\default\\openharmony\\ets\\component\\';
const PATH_TRAVERSAL_API = (platform === Platform.MacOS) ? '/default/openharmony/ets/api/' : '\\default\\openharmony\\ets\\api\\';
const PATH_TRAVERSAL_HMS_API = (platform === Platform.MacOS) ? '/default/hms/ets/api/' : '\\default\\hms\\ets\\api\\';
const FROM_FRONT_LENGTH = 6;
const FROM_SUFFIX_LENGTH = 2;
const BUILD_COMMADN_CLOSE_CODE_SUCCESS = 0;
const BUILD_COMMADN_CLOSE_CODE_FAIL = -1;
const BUILD_UPGRADE_LOG_LENGTH = 2;

function captureLogs() {
    const buildLogPath = './analysis_build_logs.txt';
    const options = { maxBuffer: 10 * 1024 * 1024, shell: true, env: { ...process.env, CUSTOM_VAR: 'value' }, cwd: process.cwd(), encoding: 'utf-8' };
    const logFileStream = fs.createWriteStream(buildLogPath);
    const child = spawn('ace build apk', [], options);
    console.log(`start build project ...`);
    let closeCode = BUILD_COMMADN_CLOSE_CODE_SUCCESS;
    const timer = setTimeout(() => {
        if (checkBuildResult(buildLogPath)) {
            return;
        }
        closeCode = BUILD_COMMADN_CLOSE_CODE_FAIL;
        child.kill();
        logFileStream.end();
        fs.unlink(buildLogPath, (error) => {
            if (error) {
                return;
            }
        });
        console.log('\x1B[31m%s\x1B[0m', `Error: The project build fail, please run \"ace build apk\" and resolve the problem`);
    }, 8000);
    child.stdout.on('data', (data) => {
        const filteredData = data.toString().replace(/\u001b\[\d+m/g, '');
        logFileStream.write(filteredData);
    });
    child.stderr.on('data', (data) => {
        const filteredData = data.toString().replace(/\u001b\[\d+m/g, '');
        logFileStream.write(filteredData);
    });
    child.on('close', (code) => {
        if (closeCode !== BUILD_COMMADN_CLOSE_CODE_FAIL) {
            child.kill();
            logFileStream.end();
            clearTimeout(timer);
            console.log(`project build finish, start analysis log ...`);
            analysisBuildLog(buildLogPath, true);
        }
    });
    child.on('error', (error) => {
        closeCode = BUILD_COMMADN_CLOSE_CODE_FAIL;
        child.kill();
        logFileStream.end();
    });
}

function checkBuildResult(buildLogPath) {
    const data = fs.readFileSync(buildLogPath, 'utf8');
    const lines = data.split('\n');
    if (lines.length > BUILD_UPGRADE_LOG_LENGTH) {
        return true;
    }
    let isBuildResult = true;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('not find project configuration sdk') || lines[i].includes('Whether to upgrade？(Y/N)')) {
            isBuildResult = false;
        }
    }
    return isBuildResult;
}

function analysisBuildLog(buildLogPath, isDelLogFile) {
    let alldtsList = new Map();
    let moduleApiList = new Map();
    if (!(fs.existsSync(buildLogPath))) {
        console.log('\x1B[31m%s\x1B[0m', `Error: No compilation log file found`);
        return;
    }
    let isNeedAnalysis = preAnalysisBuildLog(buildLogPath);
    if (isNeedAnalysis) {
        const data = fs.readFileSync(buildLogPath, 'utf8');
        const lines = data.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const lineNextIndex = i + 1;
            if ((lines[i].includes('ArkTS:ERROR File')) || (lines[i].includes('ArkTS:WARN File'))) {
                analysisBuildLogLine(lines[i], lines[lineNextIndex], alldtsList, moduleApiList);
            }
        }
        createHtml(alldtsList, moduleApiList);
    }
    if (isDelLogFile) {
        fs.unlink(buildLogPath, (error) => {
            if (error) {
                return;
            }
        });
    }
}

function preAnalysisBuildLog(buildLogPath) {
    let isHaveSuccessLog = false;
    let isHaveApkBuiltSuc = false;
    let isHaveSupportLog = false;
    const data = fs.readFileSync(buildLogPath, 'utf8');
    const lines = data.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if ((lines[i].includes('BUILD SUCCESSFUL'))) {
            isHaveSuccessLog = true;
        }
        if ((lines[i].includes('APK file built successfully'))) {
            isHaveApkBuiltSuc = true;
        }
        if ((lines[i].includes('can\'t support crossplatform application.'))) {
            isHaveSupportLog = true;
        }
    }
    let isBuildSuccess = false;
    if (isHaveSuccessLog && isHaveApkBuiltSuc) {
        isBuildSuccess = true;
    }
    let isNeedAnalysis = true;
    if (isBuildSuccess && !isHaveSupportLog) {
        console.log(`The project is build successfully, and no APIs that do not support cross-platform are found.`);
        isNeedAnalysis = false;
    } else if (isBuildSuccess && isHaveSupportLog) {
        isNeedAnalysis = true;
    } else if (!isBuildSuccess && !isHaveSupportLog) {
        console.log('\x1B[31m%s\x1B[0m', `Error: The project build fail, please run \"ace build apk\" and resolve the problem`);
        isNeedAnalysis = false;
    } else if (!isBuildSuccess && isHaveSupportLog) {
        isNeedAnalysis = true;
    }
    return isNeedAnalysis;
}

function analysisBuildLogLine(line, nextLine, alldtsList, moduleApiList) {
    if (!line || line.length === 0 || !nextLine || nextLine.length === 0) {
        return;
    }
    const moduleName = getModuleNameFromBuildLog(line);
    const fileData = getFileDataFromBuildLog(line);
    const notSupportApi = getNotSupportApi(nextLine);
    if (!fileData || !(fileData.path) || !(fileData.line) || !(fileData.column) || !notSupportApi) {
        return;
    }
    let notSupportApiFileName = getDtsFileFromImport(fileData.path, notSupportApi);
    if (notSupportApiFileName === ' ') {
        const pointString = getPointStartName(fileData);
        if (pointString) {
            notSupportApiFileName = getDtsFileFromImport(fileData.path, pointString);
        }
    }
    if (notSupportApiFileName === ' ') {
        const componentName = getComponentName(fileData, notSupportApi);
        if (componentName && componentName !== '') {
            notSupportApiFileName = getDtsFileFromComponent(componentName, notSupportApi);
        }
    }
    if (notSupportApiFileName === ' ') {
        const allImportFileList = getImportFileList(fileData);
        notSupportApiFileName = getApiFileTraversal(notSupportApi, allImportFileList);
    }
    if (notSupportApiFileName === ' ') {
        notSupportApiFileName = getApiFileTraversalAll(notSupportApi);
    }
    if (!alldtsList.has(notSupportApiFileName)) {
        alldtsList.set(notSupportApiFileName, []);
    }
    let dtsApiArray = alldtsList.get(notSupportApiFileName);
    dtsApiArray.push(notSupportApi);
    if (!moduleApiList.has(moduleName)) {
        moduleApiList.set(moduleName, []);
    }
    let moduleApiArray = moduleApiList.get(moduleName);
    let nowApiData = initApiData();
    nowApiData.apiName = notSupportApi;
    nowApiData.dtsFile = notSupportApiFileName;
    nowApiData.selfFile = fileData.name;
    nowApiData.number = `${moduleApiArray.length + 1}`;
    moduleApiArray.push(nowApiData);
}

function initApiData(numberStr = '', apiNameStr = '', dtsFileStr = '', selfFileStr = '') {
    let apiData = { number:numberStr, apiName:apiNameStr, dtsFile:dtsFileStr, selfFile:selfFileStr };
    return apiData;
}

function getApiFileTraversalAll(notSupoortApi) {
    let apiCountList = [];
    const searchList = traversalFolderAll(`${GLOBAL_SDK_PATH}${PATH_TRAVERSAL_API}`, notSupoortApi);
    apiCountList = apiCountList.concat(searchList);
    const searchList1 = traversalFolderAll(`${GLOBAL_SDK_PATH}${PATH_TRAVERSAL_COMPONENT}`, notSupoortApi);
    apiCountList = apiCountList.concat(searchList1);
    const searchList2 = traversalFolderAll(`${GLOBAL_SDK_PATH}${PATH_TRAVERSAL_HMS_API}`, notSupoortApi);
    apiCountList = apiCountList.concat(searchList2);
    const apiFolderPath = `${GLOBAL_SDK_PATH}${PATH_TRAVERSAL_API}`;
    const files = fs.readdirSync(apiFolderPath);
    files.forEach(item => {
        const nowFolderPath = path.join(apiFolderPath, item);
        if (fs.statSync(nowFolderPath).isDirectory()) {
            const searchListNow = traversalFolderAll(nowFolderPath, notSupoortApi);
            apiCountList = apiCountList.concat(searchListNow);
        }
    });
    if (apiCountList.length === 0) {
        return ' ';
    }
    if (apiCountList.length === 1) {
        return apiCountList[0];
    }
    if (apiCountList.length > 1) {
        return getDtsFileFromComponent(notSupoortApi, notSupoortApi);
    }
    return ' ';
}

function traversalFolderAll(folderPath, notSupoortApi) {
    let searchList = [];
    const files = fs.readdirSync(folderPath);
    files.forEach(item => {
        if (item.includes('d.ts') || item.includes('d.ets')) {
            const filePath = path.join(folderPath, item);
            if (fs.statSync(filePath).isFile() && isHaveNotSupportApiInFile(notSupoortApi, filePath)) {
                searchList.push(item);
            }   
        }
    });
    return searchList;
}

function getApiFileTraversal(notSupoortApi, allImportFileList) {
    let apiCountList = [];
    const searchList = traversalFolder(`${GLOBAL_SDK_PATH}${PATH_TRAVERSAL_API}`, notSupoortApi, allImportFileList);
    apiCountList = apiCountList.concat(searchList);
    const searchList1 = traversalFolder(`${GLOBAL_SDK_PATH}${PATH_TRAVERSAL_COMPONENT}`, notSupoortApi, allImportFileList);
    apiCountList = apiCountList.concat(searchList1);
    const searchList2 = traversalFolder(`${GLOBAL_SDK_PATH}${PATH_TRAVERSAL_HMS_API}`, notSupoortApi, allImportFileList);
    apiCountList = apiCountList.concat(searchList2);
    const apiFolderPath = `${GLOBAL_SDK_PATH}${PATH_TRAVERSAL_API}`;
    const files = fs.readdirSync(apiFolderPath);
    files.forEach(item => {
        const nowFolderPath = path.join(apiFolderPath, item);
        if (fs.statSync(nowFolderPath).isDirectory()) {
            const searchListNow = traversalFolder(nowFolderPath, notSupoortApi. allImportFileList);
            apiCountList = apiCountList.concat(searchListNow);
        }
    });
    if (apiCountList.length === 0) {
        return ' ';
    }
    if (apiCountList.length === 1) {
        return apiCountList[0];
    }
    if (apiCountList.length > 1) {
        return ' ';
    }
    return ' ';
}

function traversalFolder(folderPath, notSupoortApi, importFileList) {
    let searchList = [];
    if (!importFileList || importFileList.length === 0) {
        return searchList;
    }
    const files = fs.readdirSync(folderPath);
    files.forEach(item => {
        if ((item.includes('d.ts') || item.includes('d.ets')) && isItemInList(item, importFileList)) {
            const filePath = path.join(folderPath, item);
            if (fs.statSync(filePath).isFile() && isHaveNotSupportApiInFile(notSupoortApi, filePath)) {
                searchList.push(item);
            }   
        }
    });
    return searchList;
}

function isItemInList(item, list) {
    if (list.length <= 0) {
        return true;
    }
    let isIn = false;
    for (let i = 0; i < list.length; i++) {
        if (item.includes(list[i])) {
            isIn = true;
            break;
        }
    }
    return isIn;
}

function getImportFileList(fileData) {
    let allImportFileList = [];
    const data = fs.readFileSync(fileData.path, 'utf8');
    const lines = data.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('import') &&
            lines[i].includes('{') &&
            lines[i].includes('}') &&
            lines[i].includes('from')) {
                allImportFileList = allImportFileList.concat(getOneLineImportFileList(lines[i]));
            }
    }
    return allImportFileList;
}

function getOneLineImportFileList(searchLine) {
    let fileList = [];
    const fromIndex = searchLine.indexOf('from');
    const fromFile = searchLine.slice(fromIndex + FROM_FRONT_LENGTH, searchLine.length - FROM_SUFFIX_LENGTH).trim();
    if (fromFile.includes('../') || fromFile.includes('/')) {
        return fileList;
    }
    if (fromFile.includes('kit.')) {
        const startIndex = searchLine.indexOf('{');
        const endIndex = searchLine.indexOf('}');
        const lineImport = searchLine.slice(startIndex + 1, endIndex);
        let importList = [];
        if (lineImport.includes(',')) {
            const importListNow = lineImport.split(',');
            importListNow.forEach(importFile => {
                importList.push(importFile.trim());
            });
        } else {
            importList.push(lineImport.trim());
        }
        const kitImportFileList = getKitFileImportFileList(fromFile, importList);
        fileList = fileList.concat(kitImportFileList);
    } else {
        fileList.push(fromFile);
    }
    return fileList;
}

function getKitFileImportFileList(fromKitFile, importList) {
    let fileList = [];
    let kitFilePath = `${GLOBAL_SDK_PATH}${PATH_KIT_HMS}${fromKitFile}.d.ts`;
    if (!(fs.existsSync(kitFilePath))) {
        kitFilePath = `${GLOBAL_SDK_PATH}${PATH_KIT_OH}${fromKitFile}.d.ts`;
        if (!(fs.existsSync(kitFilePath))) {
            return fileList;
        }
    }
    const data = fs.readFileSync(kitFilePath, 'utf8');
    const lines = data.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let isHave = false;
        for (let j = 0; j < importList.length; j++) {
            if ((lines[i].includes(` ${importList[j]},`) ||
                 lines[i].includes(` ${importList[j]} `) ||
                 lines[i].includes(`{ ${importList[j]}`) ||
                 lines[i].includes(`${importList[j]} }`) ||
                 lines[i].includes(` ${importList[j]},`) ||
                 lines[i].includes(`{${importList[j]}`) ||
                 lines[i].includes(`${importList[j]}}`) ||
                 lines[i].includes(`${importList[j]},`)) &&
                 lines[i].includes(`import`) &&
                 lines[i].includes(`from`)) {
                  isHave = true;
                  break;
                }
        }
        if (isHave) {
            const fromIndex = lines[i].indexOf('from');
            const fromFile = lines[i].slice(fromIndex + FROM_FRONT_LENGTH, lines[i].length - FROM_SUFFIX_LENGTH).trim();
            fileList.push(fromFile);
        }
    }
    return fileList;
}

function getDtsFileFromComponent(componentName, notSupportApi) {
    let componentFileName = componentName.charAt(0).toLowerCase();
    for (let i = 1; i < componentName.length; i++) {
        if (isUpper(componentName.charAt(i))) {
            componentFileName = `${componentFileName}_`;
        }
        componentFileName = `${componentFileName}${componentName.charAt(i).toLowerCase()}`;
    }
    let componentFileNameAddSuffix = `${componentFileName}.d.ts`;
    let componentFilePath = `${GLOBAL_SDK_PATH}${PATH_TRAVERSAL_COMPONENT}${componentFileNameAddSuffix}`;
    if (!(fs.existsSync(componentFilePath))) {
        componentFileNameAddSuffix = `${componentFileName}.d.ets`;
        componentFilePath = `${GLOBAL_SDK_PATH}${PATH_TRAVERSAL_COMPONENT}${componentFileNameAddSuffix}`;
        if (!(fs.existsSync(componentFilePath))) {
            componentFilePath = ' ';
        }
    }
    if (componentFilePath === ' ') {
        componentFileNameAddSuffix = `${componentName.toLowerCase()}.d.ts`;
        componentFilePath = `${GLOBAL_SDK_PATH}${PATH_TRAVERSAL_COMPONENT}${componentFileNameAddSuffix}`;
        if (!(fs.existsSync(componentFilePath))) {
            componentFileNameAddSuffix = `${componentFileName}.d.ets`;
            componentFilePath = `${GLOBAL_SDK_PATH}${PATH_TRAVERSAL_COMPONENT}${componentFileNameAddSuffix}`;
            if (!(fs.existsSync(componentFilePath))) {
                return ' ';
            }
        }
    }
    if (isHaveNotSupportApiInFile(notSupportApi, componentFilePath)) {
        return componentFileNameAddSuffix;
    } else {
        return ' ';
    }
}

function isHaveNotSupportApiInFile(notSupoortApi, filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(notSupoortApi)) {
            const index = lines[i].indexOf(notSupoortApi);
            const frontString = lines[i].slice(0, index);
            const previousLineValue = 1;
            const previousLineIndex = i - previousLineValue;
            const sinceLineIndex = previousLineIndex - previousLineValue;
            const deprecatedLineIndex = sinceLineIndex - previousLineValue;
            const crossplatformLineIndex = deprecatedLineIndex - previousLineValue;
            if (sinceLineIndex < 0 || deprecatedLineIndex < 0 || crossplatformLineIndex < 0) {
                continue;
            }
            const firstChar = lines[i].trim().charAt(0);
            if (firstChar === '*') {
                continue;
            }
            if (lines[sinceLineIndex].includes('@since') && 
                !(lines[sinceLineIndex].includes('@deprecatedLine')) &&
                !(lines[deprecatedLineIndex].includes('@deprecatedLine')) &&
                !(lines[sinceLineIndex].includes('@crossplatform')) &&
                !(lines[deprecatedLineIndex].includes('@crossplatform')) &&
                !(lines[crossplatformLineIndex].includes('@crossplatform')) &&
                !(frontString.includes('(')) &&
                !(frontString.includes(':'))) {
                return true;
            }
        }
    }
    return false;
}

function isUpper(str) {
    return /[A-Z]/.test(str);
}

function initComponentSearchData(indexData, isInData, findTypeData) {
    let searchData = { nowIndex:indexData, isWhileIn:isInData, whileFindType:findTypeData, componentName:' ' };
    return searchData;
}

function initSearchComponentType() {
    let searchComponentType = { pointType:0, closureType:1, propertyType:2, partmerType:3 };
    return searchComponentType;
}

function getComponentName(fileData, notSupportApi) {
    const searchComponentType = initSearchComponentType();
    let componentName = ' ';
    const data = fs.readFileSync(fileData.path, 'utf8');
    const lines = data.split('\n');
    const lineString = lines[fileData.line - 1];
    if (!(lineString.includes(notSupportApi))) {
        return componentName;
    }
    if (lineString.trim().slice(0, 1) !== '.') {
        return componentName;
    }
    let searchData = initComponentSearchData(2, true, searchComponentType.pointType);
    while (searchData.isWhileIn) {
        if (fileData.line - searchData.nowIndex < 0 || 
            fileData.line - searchData.nowIndex >= lines.length ||
            lines[fileData.line - searchData.nowIndex] === undefined) {
            break;
        }
        if (lines[fileData.line - searchData.nowIndex].trim().slice(0, 1) === '.') {
            searchData.whileFindType = searchComponentType.pointType;
            searchData.nowIndex = searchData.nowIndex + 1;
        } else if (lines[fileData.line - searchData.nowIndex].trim() === '})' || lines[fileData.line - searchData.nowIndex].trim() === '}))') {
            searchData.whileFindType = searchComponentType.closureType;
            searchData.nowIndex = searchData.nowIndex + 1;
        } else {
            let searchDataBranch = getComponentNameBranch(fileData, searchData, lines, searchComponentType);
            searchData = initComponentSearchData(searchDataBranch.nowIndex, searchDataBranch.isWhileIn, searchDataBranch.whileFindType);
            componentName = searchDataBranch.componentName;
        }
    }
    return componentName;
}

function getComponentNameBranch(fileData, searchData, lines, searchComponentType) {
    let nowSearchData = initComponentSearchData(searchData.nowIndex, searchData.isWhileIn, searchData.whileFindType);
    const nowLine = lines[fileData.line - nowSearchData.nowIndex].trim();
    if (nowSearchData.whileFindType === searchComponentType.pointType) {
        const nowLineLength = nowLine.length;
        if ((nowLine.slice(nowLineLength - 2, nowLineLength)) === '})') {
            if (nowLine.includes('({')) {
                const componentIndex = nowLine.indexOf('({');
                nowSearchData.componentName = nowLine.slice(0, componentIndex);
                nowSearchData.isWhileIn = false;
            } else {
                nowSearchData.whileFindType = searchComponentType.propertyType;
                nowSearchData.nowIndex = nowSearchData.nowIndex + 1;
            }
        } else if ((nowLine.slice(nowLineLength - 1, nowLineLength)) === ')') {
            if (nowLine.includes('(')) {
                const componentIndex = nowLine.indexOf('(');
                nowSearchData.componentName = nowLine.slice(0, componentIndex);
                nowSearchData.isWhileIn = false;
            } else {
                nowSearchData.whileFindType = searchComponentType.partmerType;
                nowSearchData.nowIndex = nowSearchData.nowIndex + 1;
            }
        } else {
            nowSearchData.isWhileIn = false;
        }
    } else if (nowSearchData.whileFindType === searchComponentType.closureType) {
        if (nowLine.includes('=> {' && nowLine.trim().slice(0, 1) === '.')) {
            nowSearchData.whileFindType = searchComponentType.pointType;
            nowSearchData.nowIndex = nowSearchData.nowIndex + 1;
        } else if (nowLine.includes('({')) {
            const componentIndex = nowLine.trim().indexOf('({');
            nowSearchData.componentName = nowLine.trim().slice(0, componentIndex);
            nowSearchData.isWhileIn = false;
        } else {
            nowSearchData.nowIndex = nowSearchData.nowIndex + 1;
        }
    } else if (nowSearchData.whileFindType === searchComponentType.propertyType && nowLine.includes('({')) {
        const componentIndex = nowLine.indexOf('({');
        nowSearchData.componentName = nowLine.slice(0, componentIndex);
        nowSearchData.isWhileIn = false;
    } else if (nowSearchData.whileFindType === searchComponentType.partmerType && nowLine.includes('(')) {
        const componentIndex = nowLine.indexOf('(');
        nowSearchData.componentName = nowLine.slice(0, componentIndex);
        nowSearchData.isWhileIn = false;
    }
    return nowSearchData;
}

function getPointStartName(fileData) {
    const data = fs.readFileSync(fileData.path, 'utf8');
    const lines = data.split('\n');
    const lineString = lines[fileData.line - 1];
    let nowApiIndex = fileData.column - 1;
    const previousCharValue = 1;
    let endIndex = nowApiIndex - previousCharValue;
    let nowIndex = endIndex - previousCharValue;
    if (!lineString || lineString === '' || lineString === undefined) {
        return ' ';
    }
    if (endIndex < 0) {
        return ' ';
    }
    if (lineString.charAt(endIndex) !== '.') {
        return ' ';
    }
    if (nowIndex < 0) {
        return ' ';
    }
    while (isAlpha(lineString.charAt(nowIndex)) || lineString.charAt(nowIndex) === '.') {
        if (lineString.charAt(nowIndex) === '.') {
            endIndex = nowIndex;
            if (nowIndex - 1 < 0) {
                return ' ';
            } else {
                nowIndex = nowIndex - 1;
            }
        } else {
            if (nowIndex - 1 < 0) {
                const findPointString = lineString.slice(nowIndex, endIndex);
                return findPointString;
            } else {
                nowIndex = nowIndex - 1;
            }
        }
    }
    const findPointString = lineString.slice(nowIndex + 1, endIndex);
    return findPointString;
}

function isAlpha(str) {
    return /^[A-Za-z]+$/.test(str);
}

function getDtsFileFromImport(filePath, notSupportApi) {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if ((lines[i].includes(` ${notSupportApi},`) ||
             lines[i].includes(` ${notSupportApi} `)) &&
             lines[i].includes(`import`) &&
             lines[i].includes(`from`)) {
            return apiInImport(lines[i], notSupportApi);
        } else if (lines[i].includes(`import {`) && !(lines[i].includes(`from`))) {
            return getMultiLineImportData(lines, i, notSupportApi);
        }
    }
    return ' ';
}

function getMultiLineImportData(lines, importIndex, notSupportApi) {
    let fromIndex = 1;
    while (!(lines[importIndex + fromIndex].includes(` from `))) {
        fromIndex = fromIndex + 1;
    }
    const fromLineIndex = importIndex + fromIndex;
    const index = lines[fromLineIndex].indexOf('from');
    const multiLineFromFile = (lines[fromLineIndex].slice(index + FROM_FRONT_LENGTH, lines[fromLineIndex].length - FROM_SUFFIX_LENGTH)).trim();
    let multiLineImportList = [];
    for (let i = 1; i < fromIndex; i++) {
        const importFileName = (lines[importIndex + i]).trim().replace(/,/g, '');
        multiLineImportList.push(importFileName);
    }
    if (multiLineImportList.includes(notSupportApi)) {
        if (multiLineFromFile.includes('kit.')) {
            return searchApiInKitFIle(multiLineFromFile, notSupportApi);
        } else {
            return `${multiLineFromFile}.d.ts`;
        }
    } else {
        return ' ';
    }
}

function apiInImport(importLine, notSupportApi) {
    const index = importLine.indexOf('from');
    const importFileName = importLine.slice(index + FROM_FRONT_LENGTH, importLine.length - FROM_SUFFIX_LENGTH);
    if (importFileName.includes('kit.')) {
        return searchApiInKitFIle(importFileName, notSupportApi);
    } else {
        return `${importFileName}.d.ts`;
    }
}

function searchApiInKitFIle(kitFileName, notSupportApi) {
    let kitFilePath = `${GLOBAL_SDK_PATH}${PATH_KIT_HMS}${kitFileName}.d.ts`;
    if (!(fs.existsSync(kitFilePath))) {
        kitFilePath = `${GLOBAL_SDK_PATH}${PATH_KIT_OH}${kitFileName}.d.ts`;
        if (!(fs.existsSync(kitFilePath))) {
            return ' ';
        }
    }
    const data = fs.readFileSync(kitFilePath, 'utf8');
    const lines = data.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if ((lines[i].includes(`{${notSupportApi}}`) ||
             lines[i].includes(`{${notSupportApi},`) ||
             lines[i].includes(` ${notSupportApi},`) ||
             lines[i].includes(` ${notSupportApi} `) ||
             lines[i].includes(` ${notSupportApi}}`)) &&
             lines[i].includes(`import`) &&
             lines[i].includes(`from`)) {
                const index = lines[i].indexOf(`from`);
                const apiFile = lines[i].slice(index + FROM_FRONT_LENGTH, lines[i].length - FROM_SUFFIX_LENGTH);
                return `${apiFile}.d.ts`;
            }
    }
    return ' ';
}

function getNotSupportApi(nextLine) {
    const notSupportLog = 'can\'t support crossplatform application.';
    let notSupportApi = '';
    if (!(nextLine.includes(notSupportLog))) {
        return notSupportApi;
    }
    const index = nextLine.indexOf(notSupportLog);
    notSupportApi = nextLine.slice(0, index).trim().replace(/'/g, '');
    return notSupportApi;
}

function getModuleNameFromBuildLog(line) {
    let index = line.indexOf('/src/main/ets');
    if (index === -1) {
        index = line.indexOf('/src/main/ts');
    }
    if (index === -1) {
        return '';
    }
    const stringArray = line.slice(0, index).split('/');
    const moduleName = stringArray[stringArray.length - 1];
    return moduleName;
}

function getFileDataFromBuildLog(line) {
    const fileName = 'File: ';
    const index = line.indexOf(fileName);
    const fileDataArray = line.slice(index + fileName.length, line.length).split(':');
    let fileData = initFileData();
    if (platform === Platform.MacOS) {
        fileData.path = fileDataArray[0];
        fileData.line = fileDataArray[1];
        fileData.column = fileDataArray[2].trim();
    } else {
        fileData.path = `${fileDataArray[0]}:${fileDataArray[1]}`;
        fileData.line = fileDataArray[2];
        fileData.column = fileDataArray[3];
    }
    const pathArray = fileData.path.split('/');
    fileData.name = pathArray[pathArray.length - 1];
    return fileData;
}

function initFileData(filePath = '', fileName = '', fileLine = '', fileColumn = '') {
    let fileData = { path:filePath, name:fileName, line:fileLine, column:fileColumn };
    return fileData;
}

function getSdkPath() {
    let localSdkPath = '';
    const filePath = './build-profile.json5';
    const data = fs.readFileSync(filePath, 'utf8');
    const jsonObj = JSON5.parse(data);
    if (jsonObj.app.products[0] === undefined) {
        return localSdkPath;
    }
    let projectRuntimeOS = jsonObj.app.products[0].runtimeOS;
    if (projectRuntimeOS === 'HarmonyOS') {
        const devVersion = getDevVersion();
        if (devVersion >= 12) {
            localSdkPath = `${devEcoStudioDir}/Contents/sdk`;
            if (platform === Platform.Windows) {
                localSdkPath = `${devEcoStudioDir}\\sdk`;
            }
        }
    }
    return localSdkPath;
}

function checkSdkPath(sdkPath) {
    if (!sdkPath || sdkPath === undefined || sdkPath === '') {
        return false;
    }
    if (fs.existsSync(path.join(sdkPath, 'default', 'sdk-pkg.json')) || fs.existsSync(path.join(sdkPath, 'sdk-pkg.json'))) {
        return true;
    }
    return false;
}

function searchApi(sdkPath, buildlog) {
    if (sdkPath && sdkPath !== undefined) {
        if (!(checkSdkPath(sdkPath))) {
            console.log('\x1B[31m%s\x1B[0m', `Error: please input the correct HarmonyOS sdk path`);
            return;
        }
        GLOBAL_SDK_PATH = sdkPath;
    } else {
        let localSdkPath = getSdkPath();
        if (!(checkSdkPath(localSdkPath))) {
            console.log('\x1B[31m%s\x1B[0m', `Error: get sdk path fail, please check ace config or input the HarmonyOS sdk path`);
            return;
        }
        GLOBAL_SDK_PATH = localSdkPath;
    }
    if (buildlog && buildlog !== '') {
        if (fs.existsSync(buildlog)) {
            console.log(`the log path is valid, start analysis log ...`);
            analysisBuildLog(buildlog, false);
        } else {
            console.log('\x1B[31m%s\x1B[0m', `Error: the log path does not exist. Please enter the correct path`);
        }
        return;
    }
    captureLogs();
}

module.exports = { searchApi };