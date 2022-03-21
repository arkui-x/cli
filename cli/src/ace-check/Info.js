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
    this.noHarmonyos = `HarmonyOS SDK is not installed`;
    this.noAndroidSdk = `Android SDK is not installed if you want to develop Android APP`;
    this.noNodejs = `Node.js Runtime Environment is not found`;
    this.noJavaSdk = `Java SDK is not found`;
    this.noDevEco = `DevEco Studio is not installed, you can install in https://devecostudio.huawei.com/`;
    this.harmonyosTitle = `HarmonyOS toolchains - develop for HarmonyOS devices`;
    this.androidTitle = `Android toolchains - develop for Android devices`;
    this.devEcoTitle = `DevEco Studio`;
    this.harmonyosLiences = `All HarmonyOS licenses accepted`;
    this.androidLiences = `All Android licenses accepted`;
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

  hasDevEco(devEcoStudioDir) {
    return `DevEco Studio at ${devEcoStudioDir}`;
  }

  harmonyosSdkInfo(harmonyosSdkDir) {
    return harmonyosSdkDir ? this.hasSdk(harmonyosSdkDir) : this.noHarmonyos;
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

  devEcoInfo(devEcoStudioDir) {
    return devEcoStudioDir ? this.hasDevEco(devEcoStudioDir) : this.noDevEco;
  }
}

module.exports = new Info();
