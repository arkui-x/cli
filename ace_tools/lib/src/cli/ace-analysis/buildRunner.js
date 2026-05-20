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
const { Platform, platform } = require('../ace-check/platform');
const {
  BUILD_LOG_FILENAME,
  BUILD_COMMAND,
  BUILD_TIMEOUT_MS,
  MAX_BUFFER_SIZE,
  BUILD_CLOSE_CODE_SUCCESS,
  BUILD_CLOSE_CODE_FAIL,
  BUILD_UPGRADE_LOG_LENGTH,
  LOG_MARKER_BUILD_SUCCESS,
  LOG_MARKER_APK_BUILT,
  LOG_MARKER_NOT_SUPPORT,
  LOG_MARKER_ETS_ERROR,
  LOG_MARKER_ETS_WARN,
  LOG_MARKER_SDK_NOT_FOUND,
  LOG_MARKER_UPGRADE_PROMPT,
  FILE_MARKER,
  SRC_MAIN_ETS,
  SRC_MAIN_TS,
  SEARCH_RESULT_NOT_FOUND,
} = require('./constants');
const {
  logError,
  logInfo,
  stripAnsiEscapes,
  safeDeleteFileAsync,
  createFileData,
  readFileLines,
  readFileContent,
} = require('./utils');
const { createHtml } = require('./createHtml');

function spawnBuildProcess() {
  const { spawn } = require('child_process');
  const options = {
    maxBuffer: MAX_BUFFER_SIZE,
    shell: true,
    env: { ...process.env },
    cwd: process.cwd(),
  };
  return spawn(BUILD_COMMAND, [], options);
}

function createLogStream() {
  return fs.createWriteStream(BUILD_LOG_FILENAME);
}

function checkBuildResult(buildLogPath) {
  const data = fs.readFileSync(buildLogPath, 'utf8');
  const lines = data.split('\n');
  if (lines.length > BUILD_UPGRADE_LOG_LENGTH) {
    return true;
  }
  const blockingPatterns = [LOG_MARKER_SDK_NOT_FOUND, LOG_MARKER_UPGRADE_PROMPT];
  for (const line of lines) {
    for (const pattern of blockingPatterns) {
      if (line.includes(pattern)) {
        return false;
      }
    }
  }
  return true;
}

function handleBuildTimeout(child, logFileStream) {
  if (checkBuildResult(BUILD_LOG_FILENAME)) {
    return BUILD_CLOSE_CODE_SUCCESS;
  }
  child.kill();
  logFileStream.end();
  safeDeleteFileAsync(BUILD_LOG_FILENAME);
  logError('Error: The project build fail, please run "ace build apk" and resolve the problem');
  return BUILD_CLOSE_CODE_FAIL;
}

function captureLogs() {
  const logFileStream = createLogStream();
  const child = spawnBuildProcess();
  logInfo('start build project ...');

  let closeCode = BUILD_CLOSE_CODE_SUCCESS;

  const timer = setTimeout(() => {
    closeCode = handleBuildTimeout(child, logFileStream);
  }, BUILD_TIMEOUT_MS);

  child.stdout.on('data', (data) => {
    logFileStream.write(stripAnsiEscapes(data.toString()));
  });

  child.stderr.on('data', (data) => {
    logFileStream.write(stripAnsiEscapes(data.toString()));
  });

  child.on('close', (code) => {
    clearTimeout(timer);
    if (closeCode !== BUILD_CLOSE_CODE_FAIL) {
      child.kill();
      logFileStream.end();
      logInfo('project build finish, start analysis log ...');
      analysisBuildLog(BUILD_LOG_FILENAME, true);
    }
  });

  child.on('error', (error) => {
    closeCode = BUILD_CLOSE_CODE_FAIL;
    clearTimeout(timer);
    child.kill();
    logFileStream.end();
  });
}

function preAnalysisBuildLog(buildLogPath) {
  const lines = readFileLines(buildLogPath);
  let hasSuccessLog = false;
  let hasApkBuilt = false;
  let hasSupportLog = false;

  for (const line of lines) {
    if (line.includes(LOG_MARKER_BUILD_SUCCESS)) {
      hasSuccessLog = true;
    }
    if (line.includes(LOG_MARKER_APK_BUILT)) {
      hasApkBuilt = true;
    }
    if (line.includes(LOG_MARKER_NOT_SUPPORT)) {
      hasSupportLog = true;
    }
  }

  const isBuildSuccess = hasSuccessLog && hasApkBuilt;

  if (isBuildSuccess && !hasSupportLog) {
    logInfo('The project is build successfully, and no APIs that do not support cross-platform are found.');
    return false;
  }
  if (isBuildSuccess && hasSupportLog) {
    return true;
  }
  if (!isBuildSuccess && !hasSupportLog) {
  logError('Error: The project build failed, please run "ace build apk" and resolve the problem');

    return false;
  }
  return true;
}

function analysisBuildLog(buildLogPath, shouldDeleteLog) {
  if (!fs.existsSync(buildLogPath)) {
    logError('Error: No compilation log file found');
    return;
  }

  const allDtsList = new Map();
  const moduleApiList = new Map();

  if (preAnalysisBuildLog(buildLogPath)) {
    const lines = readFileLines(buildLogPath);
    const { analysisBuildLogLine } = require('./apiSearcher');
    for (let i = 0; i < lines.length; i++) {
      const nextIndex = i + 1;
      if (lines[i].includes(LOG_MARKER_ETS_ERROR) || lines[i].includes(LOG_MARKER_ETS_WARN)) {
        analysisBuildLogLine(lines[i], lines[nextIndex], allDtsList, moduleApiList);
      }
    }
    createHtml(allDtsList, moduleApiList);
  }

  if (shouldDeleteLog) {
    safeDeleteFileAsync(buildLogPath);
  }
}

function getModuleNameFromBuildLog(line) {
  let index = line.indexOf(SRC_MAIN_ETS);
  if (index === -1) {
    index = line.indexOf(SRC_MAIN_TS);
  }
  if (index === -1) {
    return '';
  }
  const parts = line.slice(0, index).split('/');
  return parts[parts.length - 1];
}

function getFileDataFromBuildLog(line) {
  const index = line.indexOf(FILE_MARKER);
  const fileDataArray = line.slice(index + FILE_MARKER.length, line.length).split(':');
  const fileData = createFileData();

  if (platform === Platform.MacOS) {
    fileData.path = fileDataArray[0];
    fileData.line = Number(fileDataArray[1]);
    fileData.column = Number(fileDataArray[2].trim());
  } else {
    fileData.path = `${fileDataArray[0]}:${fileDataArray[1]}`;
    fileData.line = Number(fileDataArray[2]);
    fileData.column = Number(fileDataArray[3]);
  }

  const pathArray = fileData.path.split('/');
  fileData.name = pathArray[pathArray.length - 1];
  return fileData;
}

function getNotSupportApi(nextLine) {
  if (!nextLine.includes(LOG_MARKER_NOT_SUPPORT)) {
    return '';
  }
  const index = nextLine.indexOf(LOG_MARKER_NOT_SUPPORT);
  return nextLine.slice(0, index).trim().replace(/'/g, '');
}

module.exports = {
  captureLogs,
  analysisBuildLog,
  preAnalysisBuildLog,
  checkBuildResult,
  getModuleNameFromBuildLog,
  getFileDataFromBuildLog,
  getNotSupportApi,
};
