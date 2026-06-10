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

const { Platform, platform } = require('../ace-check/platform');
const {
  LOG_MARKER_NOT_SUPPORT,
  FILE_MARKER,
  SRC_MAIN_ETS,
  SRC_MAIN_TS,
} = require('./constants');
const { createFileData } = require('./utils');

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
  if (index === -1) {
    return null;
  }
  const fileDataArray = line.slice(index + FILE_MARKER.length, line.length).split(':');
  if (platform === Platform.MacOS) {
    if (fileDataArray.length < 3) {
      return null;
    }
  } else {
    if (fileDataArray.length < 4) {
      return null;
    }
  }

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
  getModuleNameFromBuildLog,
  getFileDataFromBuildLog,
  getNotSupportApi,
};
