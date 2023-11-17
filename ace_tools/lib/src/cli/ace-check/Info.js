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

const {
  openHarmonySdkVersion,
  arkuiXSdkVersion,
  nodejsVersion,
  androidSdkVersion,
  harmonyOsSdkVersion,
  devEcoStudioVersion,
  androidStudioVersion
} = require('./configs');
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
    this.arkuiXSdkTitle = `ArkUI-X (ArkUI-X SDK version ${arkuiXSdkVersion})`;
    this.openHarmonyTitle = `OpenHarmony toolchains - develop for OpenHarmony devices (OpenHarmony SDK version ${openHarmonySdkVersion})`;
    this.harmonyOsTitle = `HarmonyOS toolchains - develop for HarmonyOS devices (HarmonyOS SDK version ${harmonyOsSdkVersion})`;
    this.androidTitle = `Android toolchains - develop for Android devices (Android SDK version ${androidSdkVersion})`;
    this.devEcoStudioTitle = `DevEco Studio (version ${devEcoStudioVersion})`;
    this.androidStudioTitle = `Android Studio (version ${androidStudioVersion})`;
    this.openHarmonyLicenses = `All OpenHarmony licenses accepted`;
    this.androidLicenses = `All Android licenses accepted`;
    this.iosXcodeTitle = `iOS toolchains - develop for iOS devices`;
    this.XcodeTitle = `Xcode - develop for iOS`;
    this.noXcodeVersion = 'xcodebuild not installed. To install, run: xcode-select --install';
    this.noIdeviceVersion = 'libimobiledevice not installed. To install, run: brew install libimobiledevice';
    this.noDeployVersion = 'ios-deploy not installed. To install, run: brew install ios-deploy';
    this.noXcodedir = 'Xcode is not installed, you can install in app store';

    this.warnOpenHarmonySdk =
      'OpenHarmony sdk is required, please refer to the HarmonyOS Developer to download and install it.';
    this.warnHarmonyOsSdk =
      'HarmonyOS Sdk is required, please refer to the HarmonyOS Developer to download and install it.';
    this.warnNodejs =
      'Node is required, please download versions between v14.19.1 and v16.';
    this.warnOhpm =
      'Ohpm is required, please download it with DevEco Studio or Command Line Tools.';
    this.warnJavaSdk =
      'Java Sdk is required, JAVA_HOME is not set and no \'java\' command could be found in your PATH. JDK 17 or later is recommended.';
    this.warnArkuiXSdk =
      'ArkUI-X Sdk is required, please download the latest version.';
    this.warnAndroidSdk =
      'Android Sdk is required, please download it with Android Studio.';
    this.warnAndroidStudio =
      'Android Studio is required, visit https://developer.android.google.cn/studio to download it.';
    this.warnDevEcoStudio =
      'DevEco Studio is required, visit https://developer.harmonyos.com/cn/develop/deveco-studio to download latest.';
    this.warnMacTools =
      'Xcode, libimobiledevice, ios-deploy tools is required, please download and install them by yourself.';
    this.warnXcodeVersion = 
      'Xcode version should be greater than or equal to 15.0.1, unless IOS17 is not supported.';
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
    return `Node.js (${nodejsVersion}) Runtime Environment at ${nodejsDir}`;
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

  hasXcode(xCodeDir) {
    return `Xcode at ${xCodeDir}`;
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

  javaSdkVersionInfo(javaSdkVersion) {
    return javaSdkVersion;
  }

  iosXcodeVersionInfo(xCodeVersion) {
    return xCodeVersion || this.noXcodeVersion;
  }

  iosXcodeDirInfo(xCodeDir) {
    return xCodeDir ? this.hasXcode(xCodeDir) : this.noXcodedir;
  }

  iosIdeviceVersionInfo(iDeviceVersion) {
    return iDeviceVersion || this.noIdeviceVersion;
  }

  iosDeployVersionInfo(deployVersion) {
    return deployVersion || this.noDeployVersion;
  }
}

module.exports = new Info();
