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

const appCpu2SdkLibMap = {
  'android': {
    'arm64-v8a': {
      'debug': ['android-arm64-release'],
      'release': ['android-arm64-release']
    },
    'armeabi-v7a': {
      'debug': ['android-arm-release'],
      'release': ['android-arm-release', 'android-arm']
    },
    'x86_64': {
      'debug': ['android-x86_64-release'],
      'release': ['android-x86_64-release', 'android-x86_64']
    }
  },
  'ios': {
    'arm64': {
      'debug': ['ios-release'],
      'release': ['ios-release']
    }
  },
  'ios-simulator': {
    'arm64': {
      'debug': ['ios-release'],
      'release': ['ios-release']
    },
    'x86_64': {
      'debug': ['ios-release'],
      'release': ['ios-release']
    }
  }
};

const appCpu2DestLibDir = {
  'android': {
    'arm64-v8a': {'so': '.arkui-x/android/{subdir}/libs/arm64-v8a', 'jar': '.arkui-x/android/{subdir}/libs'},
    'armeabi-v7a': {'so': '.arkui-x/android/{subdir}/libs/armeabi-v7a', 'jar': '.arkui-x/android/{subdir}/libs'},
    'x86_64': {'so': '.arkui-x/android/{subdir}/libs/x86_64', 'jar': '.arkui-x/android/{subdir}/libs'}
  },
  'ios': {
    'arm64': {'xcframework': '.arkui-x/{subdir}/frameworks'},
    'x86_64': {'xcframework': '.arkui-x/{subdir}/frameworks'}
  },
  'ios-simulator': {
    'arm64': {'xcframework': '.arkui-x/{subdir}/frameworks'},
    'x86_64': {'xcframework': '.arkui-x/{subdir}/frameworks'}
  }
};

const clearLibBeforeCopy = false;

module.exports = { appCpu2SdkLibMap, appCpu2DestLibDir, clearLibBeforeCopy };

