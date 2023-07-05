/*
 * Copyright (c) 2022 Huawei Device Co., Ltd.
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
    this.noOhpmDir = `Ohpm tool is not found`;
    this.noarkuiXSdk = `ArkUI-X SDK is not installed`;
    this.noOpenHarmonySdk = `OpenHarmony SDK is not installed`;
    this.noHarmonyOsSdk = `HarmonyOS SDK is not installed`;
    this.noAndroidSdk = `Android SDK is not installed if you want to develop Android APP`;
    this.noNodejs = `Node.js Runtime Environment is not found`;
    this.noJavaSdk = `Java SDK is not found`;
    this.noDevEcoStudio = `DevEco Studio is not installed, you can install in https://devecostudio.huawei.com`;
    this.noAndroidStudio = `Android Studio is not installed, you can install in https://developer.android.google.cn/studio`;
    this.arkuiXSdkTitle = `ArkUI-X toolchains - develop for ArkUI-X devices`;
    this.openHarmonyTitle = `OpenHarmony toolchains - develop for OpenHarmony devices`;
    this.harmonyOsTitle = `HarmonyOS toolchains - develop for HarmonyOS devices`;
    this.androidTitle = `Android toolchains - develop for Android devices`;
    this.devEcoStudioTitle = `DevEco Studio [Requires DevEco Studio 3.1 Release, API Version 9+]`;
    this.androidStudioTitle = `Android Studio`;
    this.openHarmonyLicenses = `All OpenHarmony licenses accepted`;
    this.androidLicenses = `All Android licenses accepted`;
    this.iosXcodeTitle = `iOS toolchains - develop for iOS devices`;
    this.noXcodeVersion = 'xcodebuild not installed. To install, run: xcode-select --install';
    this.noIdeviceVersion = 'libimobiledevice not installed. To install, run: brew install libimobiledevice';
    this.noDeployVersion = 'ios-deploy not installed. To install, run: brew install ios-deploy';
  }

  hasOhpm(ohpmDir) {
    return `Ohpm at ${ohpmDir}`;
  }

  hasarkuiXSdk(arkuiXSdkDir) {
    return `ArkUI-X SDK at ${arkuiXSdkDir}`;
  }

  hasSdk(ohSdkDir) {
    return `OpenHarmony SDK at ${ohSdkDir}`;
  }

  hasHoSdk(hoSdkDir) {
    return `HarmonyOS SDK at ${hoSdkDir}`;
  }

  hasNodejs(nodejsDir) {
    return `Node.js Runtime Environment at ${nodejsDir}`;
  }

  hasJavaSdk(javaSdkDir) {
    return `Java Sdk at ${javaSdkDir}`;
  }

  hasAndroidSdk(androidSdkDir) {
    return `Android SDK at ${androidSdkDir}`;
  }

  hasDevEcoStudio(devEcoStudioDir) {
    return `DevEco Studio at ${devEcoStudioDir}`;
  }

  hasAndroidStudio(androidStudioDir) {
    return `Android Studio at ${androidStudioDir}`;
  }

  ohpmToolInfo(OhpmDir) {
    return OhpmDir ? this.hasOhpm(OhpmDir) : this.noOhpmDir;
  }

  arkuiXSdkInfo(arkuiXSdkDir) {
    return arkuiXSdkDir ? this.hasarkuiXSdk(arkuiXSdkDir) : this.noarkuiXSdk;
  }

  openHarmonySdkInfo(openHarmonySdkDir) {
    return openHarmonySdkDir ? this.hasSdk(openHarmonySdkDir) : this.noOpenHarmonySdk;
  }

  harmonyOsSdkInfo(harmonyOsSdkDir) {
    return harmonyOsSdkDir ? this.hasHoSdk(harmonyOsSdkDir) : this.noHarmonyOsSdk;
  }

  androidSdkInfo(androidSdkDir) {
    return androidSdkDir ? this.hasAndroidSdk(androidSdkDir) : this.noAndroidSdk;
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
