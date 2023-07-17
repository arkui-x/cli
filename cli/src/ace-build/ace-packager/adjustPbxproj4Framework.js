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

const fs = require('fs');
const path = require('path');
const { Platform, platform } = require('../../ace-check/platform');
const xBuildFileStart = '/* Begin PBXBuildFile section */';
const xBuildFileEnd = '/* End PBXBuildFile section */';
const xCopyFilesBuildPhaseStart = '/* Begin PBXCopyFilesBuildPhase section */';
const xFileReferenceStart = '/* Begin PBXFileReference section */';
const xFileReferenceEnd = '/* End PBXFileReference section */';
const xFrameworksBuildPhaseStart = '/* Begin PBXFrameworksBuildPhase section */';
const xGroupStart = '/* Begin PBXGroup section */';
const itemLineStartTab = '\t\t';
const {getFrameworkName, generateUUID } = require('../../util');

function getTypeSettingSection(sectionDefStartList, sectionDefEnd, pbxprojFileInfo,
  existProcessor) {
  const result = {};
  let startInd = 0;
  let found;
  for (const i in sectionDefStartList) {
    startInd = pbxprojFileInfo.indexOf(sectionDefStartList[i], startInd);
    if (startInd < 0) {
      if (!found) {
        found = '"' + sectionDefStartList[i] + '"';
      } else {
        found += '>>"' + sectionDefStartList[i] + '"';
      }
      throw new Error('could not found:' + found);
    }
    if (!found) {
      found = '"' + sectionDefStartList[i] + '"';
    } else {
      found += '>>"' + sectionDefStartList[i] + '"';
    }
    startInd += sectionDefStartList[i].length;
  }
  const endInd = pbxprojFileInfo.indexOf(sectionDefEnd, startInd);
  if (endInd < 0) {
    throw new Error('could not found end(' + sectionDefEnd + ') for start of:' + found);
  }
  startInd = ignoreWhiteCharInline(startInd, pbxprojFileInfo);
  const data = '' + pbxprojFileInfo.slice(startInd, endInd);
  result.startInd = startInd;
  result.endInd = endInd;
  result.checkIfLibExists = existProcessor.checkIfLibExists;
  result.existData = existProcessor.parserForExist(data, existProcessor.libNameRange);
  result.existRebuilder = existProcessor.existRebuilder;
  result.lineHeader = getItemLineHeader(data);
  return result;
}

function ignoreWhiteCharInline(startInd, pbxprojFileInfo) {
  let i = startInd;
  while (i < pbxprojFileInfo.length) {
    const ch = pbxprojFileInfo.slice(i, i + 1);
    if (ch === '\n') {
      startInd = i + 1;
      break;
    } else if (ch === ' ' || ch === '\t') {
      i = i + 1;
    } else {
      break;
    }
  }
  return startInd;
}

function getItemLineHeader(data) {
  let lineHeader = '';
  if (data && data.length > 0) {
    let k = 0;
    for (k = 0; k < data.length; k++) {
      const ch = data.slice(data.length - 1 - k, data.length - k);
      if (ch !== ' ' && ch !== '\t') {
        if (k > 0) {
          k = k - 1;
        }
        break;
      }
    }
    if (k > 0) {
      lineHeader = data.slice(data.length - 1 - k);
    }
  }
  return lineHeader;
}

function pbxGetExistLibsFromList(existLibList, removeUnused, depLibMap, allLibMap, funcOnRemoved) {
  let existLibData = '';
  existLibList.some(lib => {
    if (removeUnused && !depLibMap.has(lib.libname) && allLibMap.has(lib.libname)) {
      if (funcOnRemoved) {
        funcOnRemoved(lib.libname);
      }
    } else {
      if (lib.lineData) {
        existLibData = existLibData + lib.lineData + '\n';
      }
    }
  });
  return existLibData;
}

function pbxListParserForExistFromText(existLibData, libNameRange) {
  if (!libNameRange || !libNameRange.startOf || !libNameRange.endOf) {
    throw new Error('Error Param==>libNameRange,Example: {startOf:\'/* \',endOf:\' */\'}');
  }
  const existLibList = [];
  const liblist = existLibData.split('\n');
  liblist.some(libline => {
    let start = libline.indexOf(libNameRange.startOf);
    let libName;
    if (start >= 0) {
      start = start + libNameRange.startOf.length;
      const end = libline.indexOf(libNameRange.endOf, start + 1);
      if (end > 0) {
        libName = libline.slice(start, end);
      }
    }
    let i = 0;
    for (; i < libline.length; i++) {
      const ch = libline.slice(i, i + 1);
      if (ch !== ' ' && ch !== '\t' && ch !== '\n') {
        i = -1;
        break;
      }
    }
    if (i < 0 && libline && libline.length > 0) {
      existLibList.push({ lineData: libline, libname: libName });
    }
  });
  return existLibList;
}

function pbxCheckIfLibExistsFromList(existLibList, checkForLib) {
  if (!existLibList || !checkForLib || checkForLib === '') {
    return false;
  }
  let found = false;
  existLibList.some(lib => {
    if (checkForLib === lib.libname) {
      found = true;
    }
  });
  return found;
}

function adjustLibInfoInPbxproj(indResult, pbxprojFileInfo, addContent,
  removeUnused, depLibMap, allLibMap, funcOnRemoved) {
  let existContent = indResult.existRebuilder(indResult.existData,
    removeUnused, depLibMap, allLibMap, funcOnRemoved);
  if (!existContent) {
    existContent = '';
  }
  if (!addContent) {
    addContent = '';
  }
  let part1 = pbxprojFileInfo.slice(0, indResult.startInd);
  if (part1.slice(-1) !== '\n') {
    part1 = part1 + '\n';
  }
  pbxprojFileInfo = part1 + existContent + addContent +
    pbxprojFileInfo.slice(indResult.endInd);
  return pbxprojFileInfo;
}

function getXcframeworkList(depMap, system, pbxprojFileContent) {
  const xcframeworkMap = new Map();
  const generatedUUIDSet = new Set();
  depMap.forEach(function(value, key) {
    const paths = value['library'][system];
    for (let libraryPath in paths) {
      libraryPath = paths[libraryPath];
      let libraryName;
      if (platform === Platform.Windows) {
        libraryName = libraryPath.split('\\').pop();
      } else {
        libraryName = libraryPath.split('/').pop();
      }
      xcframeworkMap.set(libraryName, {
        embedUuid: generateUUID(pbxprojFileContent, generatedUUIDSet),
        uuid: generateUUID(pbxprojFileContent, generatedUUIDSet),
        fileRefUuid: generateUUID(pbxprojFileContent, generatedUUIDSet)
      });
    }
  });
  return xcframeworkMap;
}

function makeXBuildFileContent(fileType, xcframeworkMap, existData) {
  let lines = '{buildfileuuid} /* {xcframework} in Frameworks */ = ';
  lines = lines + '{isa = PBXBuildFile; fileRef = {fileRefUuid} /* {xcframework} */; };\n';
  let embedLines = '{buildembeduuid} /* {xcframework} in Embed Frameworks */ = ';
  embedLines = embedLines + '{isa = PBXBuildFile; fileRef = {fileRefUuid} /* {xcframework} */; ';
  embedLines = embedLines + 'settings = {ATTRIBUTES = (CodeSignOnCopy, RemoveHeadersOnCopy, ); }; };\n';
  let content = '';
  xcframeworkMap.forEach(function(value, key) {
    if (!existData.checkIfLibExists(existData.existData, key)) {
      const updateLines = lines.replace(/{buildfileuuid}/g, value.uuid).replace(/{fileRefUuid}/g, value.fileRefUuid)
        .replace(/{xcframework}/g, key);
      if (fileType === 'app') {
        const updateembedLines = embedLines.replace(/{buildembeduuid}/g, value.embedUuid).replace(/{fileRefUuid}/g,
          value.fileRefUuid).replace(/{xcframework}/g, key);
        content = content + existData.lineHeader + itemLineStartTab + updateLines +
        existData.lineHeader + itemLineStartTab + updateembedLines;
      } else {
        content = content + existData.lineHeader + itemLineStartTab + updateLines;
      }
    }
  });
  if (content.length === 0) {
    content = existData.lineHeader;
  }
  return content;
}

function makeXCopyFilesBuildPhaseContent(xcframeworkMap, existData) {
  const lines = '{buildembeduuid} /* {xcframework} in Embed Frameworks */,\n';
  let content = '';
  xcframeworkMap.forEach(function(value, key) {
    if (!existData.checkIfLibExists(existData.existData, key)) {
      const updateembedLines = lines.replace(/{buildembeduuid}/g, value.embedUuid).replace(/{xcframework}/g, key);
      content = content + existData.lineHeader + itemLineStartTab + updateembedLines;
    }
  });
  if (content.length === 0) {
    content = existData.lineHeader;
  }
  return content;
}

function makeXFileReferenceContent(fileType, xcframeworkMap, existData) {
  let line = '{fileRefUuid} /* {xcframework} */ = {isa = PBXFileReference; lastKnownFileType = ';
  line = line + 'wrapper.xcframework; name = {xcframework}; ';
  if (fileType === 'app') {
    line = line + 'path = frameworks/{xcframework}; sourceTree = "<group>"; };\n';
  } else {
    line = line + 'path = ../frameworks/{xcframework}; sourceTree = "<group>"; };\n';
  }
  let content = '';
  xcframeworkMap.forEach(function(value, key) {
    if (!existData.checkIfLibExists(existData.existData, key)) {
      const updateembedLines = line.replace(/{fileRefUuid}/g, value.fileRefUuid).replace(/{xcframework}/g, key);
      content = content + existData.lineHeader + itemLineStartTab + updateembedLines;
    }
  });
  if (content.length === 0) {
    content = existData.lineHeader;
  }
  return content;
}

function makeXFrameworksBuildPhaseContent(xcframeworkMap, existData) {
  const line = '{buildfileuuid} /* {xcframework} in Frameworks */,\n';
  let content = '';
  xcframeworkMap.forEach(function(value, key) {
    if (!existData.checkIfLibExists(existData.existData, key)) {
      const updateLines = line.replace(/{buildfileuuid}/g, value.uuid).replace(/{xcframework}/g, key);
      content = content + existData.lineHeader + itemLineStartTab + updateLines;
    }
  });
  if (content.length === 0) {
    content = existData.lineHeader;
  }
  return content;
}

function makeXGroupContent(xcframeworkMap, existData) {
  const line = '{fileRefUuid} /* {xcframework} */,\n';
  let content = '';
  xcframeworkMap.forEach(function(value, key) {
    if (!existData.checkIfLibExists(existData.existData, key)) {
      const updateLines = line.replace(/{fileRefUuid}/g, value.fileRefUuid).replace(/{xcframework}/g, key);
      content = content + existData.lineHeader + itemLineStartTab + updateLines;
    }
  });
  if (content.length === 0) {
    content = existData.lineHeader;
  }
  return content;
}

const existLibInfoProcessor = {
  parserForExist: pbxListParserForExistFromText,
  checkIfLibExists: pbxCheckIfLibExistsFromList,
  existRebuilder: pbxGetExistLibsFromList,
  libNameRange: { startOf: '/* ', endOf: ' in ' }
};
const existLibInfoProcessor2 = {
  parserForExist: pbxListParserForExistFromText,
  checkIfLibExists: pbxCheckIfLibExistsFromList,
  existRebuilder: pbxGetExistLibsFromList,
  libNameRange: { startOf: '/* ', endOf: ' */' }
};

function updateXBuildFileContent(fileType, xcframework, pbxprojFileInfo,
  removeUnused, allLibSet, funcOnRemoved) {
  const result = getTypeSettingSection([xBuildFileStart], xBuildFileEnd, pbxprojFileInfo,
    existLibInfoProcessor);
  const content = makeXBuildFileContent(fileType, xcframework, result);
  return adjustLibInfoInPbxproj(result, pbxprojFileInfo, content,
    removeUnused, xcframework, allLibSet, funcOnRemoved);
}

function updateXCopyFilesBuildPhaseContent(xcframework, pbxprojFileInfo,
  removeUnused, allLibSet, funcOnRemoved) {
  const result = getTypeSettingSection([xCopyFilesBuildPhaseStart, 'files = ('], ');',
    pbxprojFileInfo,
    existLibInfoProcessor);
  const content = makeXCopyFilesBuildPhaseContent(xcframework, result);
  return adjustLibInfoInPbxproj(result, pbxprojFileInfo, content,
    removeUnused, xcframework, allLibSet, funcOnRemoved);
}

function updateXFileReferenceContent(fileType, xcframework, pbxprojFileInfo,
  removeUnused, allLibSet, funcOnRemoved) {
  const result = getTypeSettingSection([xFileReferenceStart], xFileReferenceEnd,
    pbxprojFileInfo, existLibInfoProcessor2);
  const content = makeXFileReferenceContent(fileType, xcframework, result);
  return adjustLibInfoInPbxproj(result, pbxprojFileInfo, content,
    removeUnused, xcframework, allLibSet, funcOnRemoved);
}

function updateXFrameworksBuildPhaseContent(xcframework, pbxprojFileInfo,
  removeUnused, allLibSet, funcOnRemoved) {
  const result = getTypeSettingSection([xFrameworksBuildPhaseStart, 'files = ('], ');',
    pbxprojFileInfo, existLibInfoProcessor);
  const content = makeXFrameworksBuildPhaseContent(xcframework, result);
  return adjustLibInfoInPbxproj(result, pbxprojFileInfo, content,
    removeUnused, xcframework, allLibSet, funcOnRemoved);
}

function updateXGroupContent(xcframework, pbxprojFileInfo, removeUnused, allLibSet, funcOnRemoved) {
  const result = getTypeSettingSection([xGroupStart, '/* Frameworks */ = {', 'children = ('], ');',
    pbxprojFileInfo, existLibInfoProcessor2);
  const content = makeXGroupContent(xcframework, result);
  return adjustLibInfoInPbxproj(result, pbxprojFileInfo, content,
    removeUnused, xcframework, allLibSet, funcOnRemoved);
}

function readPbxprojFile(pbxprojFilePath) {
  if (fs.existsSync(pbxprojFilePath)) {
    try {
      return fs.readFileSync(pbxprojFilePath);
    } catch (err) {
      throw new Error('load error:' + pbxprojFilePath + ', please check ');
    }
  } else {
    throw new Error('could not find: ' + pbxprojFilePath + ', please check ');
  }
}

function savePbxprojConfig(pbxprojFilePath, updatepbxprojFileInfo) {
  fs.writeFileSync(pbxprojFilePath, updatepbxprojFileInfo);
}

function updateIosProjectPbxproj(fileType, projectDir, depMap, system,
  removeUnused, funcOnRemoved, allLibSet) {
  if (fileType === 'app') {
    const pbxprojFilePath = path.join(projectDir, '.arkui-x/ios', 'app.xcodeproj/project.pbxproj');
    let pbxprojFileInfo = readPbxprojFile(pbxprojFilePath);
    const xcframeworkList = getXcframeworkList(depMap, system, pbxprojFileInfo);
    pbxprojFileInfo = updateXBuildFileContent(fileType, xcframeworkList, pbxprojFileInfo,
      removeUnused, allLibSet, funcOnRemoved);
    pbxprojFileInfo = updateXCopyFilesBuildPhaseContent(xcframeworkList, pbxprojFileInfo,
      removeUnused, allLibSet, funcOnRemoved);
    pbxprojFileInfo = updateXFileReferenceContent(fileType, xcframeworkList, pbxprojFileInfo,
      removeUnused, allLibSet, funcOnRemoved);
    pbxprojFileInfo = updateXFrameworksBuildPhaseContent(xcframeworkList, pbxprojFileInfo,
      removeUnused, allLibSet, funcOnRemoved);
    pbxprojFileInfo = updateXGroupContent(xcframeworkList, pbxprojFileInfo,
      removeUnused, allLibSet, funcOnRemoved);
    savePbxprojConfig(pbxprojFilePath, pbxprojFileInfo);
  } else if (fileType === 'framework' || fileType === 'xcframework') {
    const frameworkNameList = getFrameworkName(projectDir);
    frameworkNameList.forEach(frameworkName => {
      const pbxprojFilePath = path.join(projectDir, '.arkui-x/ios', frameworkName + '.xcodeproj/project.pbxproj');
      let pbxprojFileInfo = readPbxprojFile(pbxprojFilePath);
      const xcframeworkList = getXcframeworkList(depMap, system, pbxprojFileInfo);
      pbxprojFileInfo = updateXBuildFileContent(fileType, xcframeworkList, pbxprojFileInfo,
        removeUnused, allLibSet, funcOnRemoved);
      pbxprojFileInfo = updateXFileReferenceContent(fileType, xcframeworkList, pbxprojFileInfo,
        removeUnused, allLibSet, funcOnRemoved);
      pbxprojFileInfo = updateXFrameworksBuildPhaseContent(xcframeworkList, pbxprojFileInfo,
        removeUnused, allLibSet, funcOnRemoved);
      pbxprojFileInfo = updateXGroupContent(xcframeworkList, pbxprojFileInfo,
        removeUnused, allLibSet, funcOnRemoved);
      savePbxprojConfig(pbxprojFilePath, pbxprojFileInfo);
    });
  }
}

module.exports = { updateIosProjectPbxproj };
