/*
 * Copyright (c) 2021 Huawei Device Co., Ltd.
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

class Info {
  constructor() {
    this.noOpenHarmonySdk = `OpenHarmony SDK is not installed`;
    this.noAndroidSdk = `Android SDK is not installed if you want to develop Android APP`;
    this.noNodejs = `Node.js Runtime Environment is not found`;
    this.noJavaSdk = `Java SDK is not found`;
    this.noDevEcoStudio = `DevEco Studio is not installed, you can install in https://devecostudio.huawei.com`;
    this.noAndroidStudio = `Android Studio is not installed, you can install in https://developer.android.google.cn/studio`;
    this.openHarmonyTitle = `OpenHarmony toolchains - develop for OpenHarmony devices`;
    this.androidTitle = `Android toolchains - develop for Android devices`;
    this.devEcoStudioTitle = `DevEco Studio`;
    this.androidStudioTitle = `Android Studio`;
    this.openHarmonyLicenses = `All OpenHarmony licenses accepted`;
    this.androidLicenses = `All Android licenses accepted`;
    this.iosXcodeTitle = `iOS toolchains - develop for iOS devices`;
    this.noXcodeVersion = 'xcodebuild not installed. To install, run: xcode-select --install';
    this.noIdeviceVersion = 'libimobiledevice not installed. To install, run: brew install libimobiledevice';
    this.noDeployVersion = 'ios-deploy not installed. To install, run: brew install ios-deploy';
  }

  hasSdk(sdkDir) {
    return `SDK at ${sdkDir}`;
  }

  hasNodejs(nodejsDir) {
    return `Node.js Runtime Environment at ${nodejsDir}`;
  }

  hasJavaSdk(javaSdkDir) {
    return `Java Sdk at ${javaSdkDir}`;
  }

  hasDevEcoStudio(devEcoStudioDir) {
    return `DevEco Studio at ${devEcoStudioDir}`;
  }

  hasAndroidStudio(androidStudioDir) {
    return `Android Studio at ${androidStudioDir}`;
  }

  openHarmonySdkInfo(openHarmonySdkDir) {
    return openHarmonySdkDir ? this.hasSdk(openHarmonySdkDir) : this.noOpenHarmonySdk;
  }

  androidSdkInfo(androidSdkDir) {
    return androidSdkDir ? this.hasSdk(androidSdkDir) : this.noAndroidSdk;
  }

  nodejsInfo(nodejsDir) {
    return nodejsDir ? this.hasNodejs(nodejsDir) : this.noNodejs;
  }

  javaSdkInfo(javaSdkDir) {
    return javaSdkDir ? this.hasJavaSdk(javaSdkDir) : this.noJavaSdk;
  }

  devEcoStudioInfo(devEcoStudioDir) {
    return devEcoStudioDir ? this.hasDevEcoStudio(devEcoStudioDir) : this.noDevEcoStudio;
  }

  androidStudioInfo(androidStudioDir) {
    return androidStudioDir ? this.hasAndroidStudio(androidStudioDir) : this.noAndroidStudio;
  }
  iosXcodeVersionInfo(xCodeVersion) {
    return xCodeVersion ? xCodeVersion : this.noXcodeVersion;
  }

  iosIdeviceVersionInfo(iDeviceVersion) {
    return iDeviceVersion ? iDeviceVersion : this.noIdeviceVersion;
  }

  iosDeployVersionInfo(deployVersion) {
    return deployVersion ? deployVersion : this.noDeployVersion;
  }
}

module.exports = new Info();
