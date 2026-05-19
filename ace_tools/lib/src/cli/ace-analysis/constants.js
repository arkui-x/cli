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

const BUILD_LOG_FILENAME = './analysis_build_logs.txt';
const BUILD_COMMAND = 'ace build apk';
const BUILD_TIMEOUT_MS = 8000;
const MAX_BUFFER_SIZE = 10 * 1024 * 1024;

const BUILD_CLOSE_CODE_SUCCESS = 0;
const BUILD_CLOSE_CODE_FAIL = -1;
const BUILD_UPGRADE_LOG_LENGTH = 2;

const ANSI_ESCAPE_REGEX = /\u001b\[\d+m/g;
const FROM_KEYWORD_LENGTH = 6;
const FROM_SUFFIX_LENGTH = 2;

const LOG_MARKER_ETS_ERROR = 'ArkTS:ERROR File';
const LOG_MARKER_ETS_WARN = 'ArkTS:WARN File';
const LOG_MARKER_BUILD_SUCCESS = 'BUILD SUCCESSFUL';
const LOG_MARKER_APK_BUILT = 'APK file built successfully';
const LOG_MARKER_NOT_SUPPORT = "can't support crossplatform application.";
const LOG_MARKER_SDK_NOT_FOUND = 'not find project configuration sdk';
const LOG_MARKER_UPGRADE_PROMPT = 'Whether to upgrade？(Y/N)';

const FILE_MARKER = 'File: ';
const SRC_MAIN_ETS = '/src/main/ets';
const SRC_MAIN_TS = '/src/main/ts';

const DTS_SUFFIX = '.d.ts';
const DETS_SUFFIX = '.d.ets';

const KIT_PREFIX = 'kit.';
const IMPORT_KEYWORD = 'import';
const FROM_KEYWORD = 'from';

const SEARCH_RESULT_NOT_FOUND = ' ';

const CHART_OUTPUT_FILENAME = 'chart.html';

const DEFAULT_SDK_PATH_MACOS = '/Applications/DevEco-Studio.app/Contents/sdk';
const DEFAULT_SDK_PATH_WINDOWS = 'C:\\Program Files\\Huawei\\DevEco Studio\\sdk';

const PATH_KIT_HMS = (platform === Platform.MacOS)
  ? '/default/hms/ets/kits/'
  : '\\default\\hms\\ets\\kits\\';
const PATH_KIT_OH = (platform === Platform.MacOS)
  ? '/default/openharmony/ets/kits/'
  : '\\default\\openharmony\\ets\\kits\\';
const PATH_TRAVERSAL_COMPONENT = (platform === Platform.MacOS)
  ? '/default/openharmony/ets/component/'
  : '\\default\\openharmony\\ets\\component\\';
const PATH_TRAVERSAL_API = (platform === Platform.MacOS)
  ? '/default/openharmony/ets/api/'
  : '\\default\\openharmony\\ets\\api\\';
const PATH_TRAVERSAL_HMS_API = (platform === Platform.MacOS)
  ? '/default/hms/ets/api/'
  : '\\default\\hms\\ets\\api\\';

const ANNOTATION_SINCE = '@since';
const ANNOTATION_DEPRECATED = '@deprecatedLine';
const ANNOTATION_CROSSPLATFORM = '@crossplatform';

const CHART_WIDTH_MODULE_BASE = 200;
const CHART_WIDTH_MODULE_PER_ITEM = 145;
const CHART_WIDTH_DTS = 1400;
const CHART_HEIGHT_BASE = 200;
const CHART_HEIGHT_PER_ITEM = 66;
const CHART_HEIGHT_MODULE = 400;

const ECHARTS_CDN_URL = 'https://cdn.jsdelivr.net/npm/echarts@5.4.0/dist/echarts.min.js';

const SEARCH_COMPONENT_TYPE = Object.freeze({
  POINT_TYPE: 0,
  CLOSURE_TYPE: 1,
  PROPERTY_TYPE: 2,
  PARTNER_TYPE: 3,
});

const SDK_PKG_FILES = Object.freeze(['default/sdk-pkg.json', 'sdk-pkg.json']);

let globalSdkPath = DEFAULT_SDK_PATH_MACOS;

function setGlobalSdkPath(sdkPath) {
  globalSdkPath = sdkPath;
}

function getGlobalSdkPath() {
  return globalSdkPath;
}

module.exports = {
  BUILD_LOG_FILENAME,
  BUILD_COMMAND,
  BUILD_TIMEOUT_MS,
  MAX_BUFFER_SIZE,
  BUILD_CLOSE_CODE_SUCCESS,
  BUILD_CLOSE_CODE_FAIL,
  BUILD_UPGRADE_LOG_LENGTH,
  ANSI_ESCAPE_REGEX,
  FROM_KEYWORD_LENGTH,
  FROM_SUFFIX_LENGTH,
  LOG_MARKER_ETS_ERROR,
  LOG_MARKER_ETS_WARN,
  LOG_MARKER_BUILD_SUCCESS,
  LOG_MARKER_APK_BUILT,
  LOG_MARKER_NOT_SUPPORT,
  LOG_MARKER_SDK_NOT_FOUND,
  LOG_MARKER_UPGRADE_PROMPT,
  FILE_MARKER,
  SRC_MAIN_ETS,
  SRC_MAIN_TS,
  DTS_SUFFIX,
  DETS_SUFFIX,
  KIT_PREFIX,
  IMPORT_KEYWORD,
  FROM_KEYWORD,
  SEARCH_RESULT_NOT_FOUND,
  CHART_OUTPUT_FILENAME,
  DEFAULT_SDK_PATH_MACOS,
  DEFAULT_SDK_PATH_WINDOWS,
  PATH_KIT_HMS,
  PATH_KIT_OH,
  PATH_TRAVERSAL_COMPONENT,
  PATH_TRAVERSAL_API,
  PATH_TRAVERSAL_HMS_API,
  ANNOTATION_SINCE,
  ANNOTATION_DEPRECATED,
  ANNOTATION_CROSSPLATFORM,
  CHART_WIDTH_MODULE_BASE,
  CHART_WIDTH_MODULE_PER_ITEM,
  CHART_WIDTH_DTS,
  CHART_HEIGHT_BASE,
  CHART_HEIGHT_PER_ITEM,
  CHART_HEIGHT_MODULE,
  ECHARTS_CDN_URL,
  SEARCH_COMPONENT_TYPE,
  SDK_PKG_FILES,
  setGlobalSdkPath,
  getGlobalSdkPath,
};
