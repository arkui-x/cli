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
const { logInfo, logError } = require('./utils');
const { validateAndSetSdkPath } = require('./sdkResolver');
const { captureLogs, analysisBuildLog } = require('./buildRunner');

function searchApi(sdkPath, buildlog) {
  if (!validateAndSetSdkPath(sdkPath)) {
    return;
  }

  if (buildlog && buildlog !== '') {
    if (fs.existsSync(buildlog)) {
      logInfo('the log path is valid, start analysis log ...');
      analysisBuildLog(buildlog, false);
    } else {
      logError('Error: the log path does not exist. Please enter the correct path');
    }
    return;
  }

  captureLogs();
}

function analysisProject(sdkPath, buildlog) {
  searchApi(sdkPath, buildlog);
}

module.exports = { analysisProject, searchApi };
