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
const uuid = require('uuid');
global.HarmonyOS = 'HarmonyOS';
global.OpenHarmony = 'OpenHarmony';
const { Platform, platform } = require('../../ace-check/platform');

/**
 * load project.pbxproj file and return content string
 **/
function getPbxprojConfig(projectDir) {
  const pbxprojFilePath = path.join(projectDir, 'ios/app.xcodeproj/project.pbxproj');
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

function setPbxprojConfig(projectDir, updatepbxprojFileInfo) {
  const pbxprojFilePath = path.join(projectDir, 'ios/app.xcodeproj/project.pbxproj');
  fs.writeFileSync(pbxprojFilePath, updatepbxprojFileInfo);
}

const addLibStart = '/* start auto copy library configs */';
const addLibEnd = '/* end auto copy library configs */';
const xBuildFileStart = '/* Begin PBXBuildFile section */';
const xBuildFileEnd = '/* End PBXBuildFile section */';
const xCopyFilesBuildPhaseStart = '/* Begin PBXCopyFilesBuildPhase section */';
const xFileReferenceStart = '/* Begin PBXFileReference section */';
const xFileReferenceEnd = '/* End PBXFileReference section */';
const xFrameworksBuildPhaseStart = '/* Begin PBXFrameworksBuildPhase section */';
const xGroupStart = '/* Begin PBXGroup section */';
const itemLineStartTab = '\t\t';
function getTypeSettingSection(sectionDefStart, sectionDefEnd, addStart, addEnd, pbxprojFileInfo,
  existProcessor) {
  const result = {};
  let startInd = 0;
  let found;
  for (const i in sectionDefStart) {
    startInd = pbxprojFileInfo.indexOf(sectionDefStart[i], startInd);
    if (startInd < 0) {
      if (!found) {
        found = '"' + sectionDefStart[i] + '"';
      } else {
        found += '>>"' + sectionDefStart[i] + '"';
      }
      throw new Error('could not found:' + found);
    }
    if (!found) {
      found = '"' + sectionDefStart[i] + '"';
    } else {
      found += '>>"' + sectionDefStart[i] + '"';
    }
    startInd += sectionDefStart[i].length;
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
  }
  );
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
      existLibList.push({lineData: libline, libname: libName});
    }
  }
  );
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
  }
  );
  return found;
}

function addLibToProjecStr(indResult, pbxprojFileInfo, addContent,
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
function getUUID(pbxprojFileInfo, uuidSet) {
  try {
    const newUUID = uuid.v4().replace(/-/g, '').slice(0, 24).toUpperCase();
    if (pbxprojFileInfo.includes(newUUID) || uuidSet.has(newUUID)) {
      return getUUID(pbxprojFileInfo, uuidSet);
    } else {
      uuidSet.add(newUUID);
      return newUUID;
    }
  } catch (error) {
    console.log('getUUID error', error);
  }
}

function getXcframeworkList(depMap, system, pbxprojFileInfo) {
  const xcframeworkMap = new Map();
  const uuidSet = new Set();
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
        embedUuid: getUUID(pbxprojFileInfo, uuidSet),
        uuid: getUUID(pbxprojFileInfo, uuidSet), fileRefUuid: getUUID(pbxprojFileInfo, uuidSet)
      });
    }
  });
  return xcframeworkMap;
}

function makeXBuildFileContent(xcframeworkMap, existData) {
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
      const updateembedLines = embedLines.replace(/{buildembeduuid}/g, value.embedUuid).replace(/{fileRefUuid}/g,
        value.fileRefUuid).replace(/{xcframework}/g, key);
      content = content + existData.lineHeader + itemLineStartTab + updateLines +
        existData.lineHeader + itemLineStartTab + updateembedLines;
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
function makeXFileReferenceContent(xcframeworkMap, existData) {
  let line = '{fileRefUuid} /* {xcframework} */ = {isa = PBXFileReference; lastKnownFileType = ';
  line = line + 'wrapper.xcframework; name = {xcframework}; ';
  line = line + 'path = frameworks/{xcframework}; sourceTree = "<group>"; };\n';
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

function updateXBuildFileContent(xcframework, pbxprojFileInfo,
  removeUnused, allLibSet, funcOnRemoved) {
  const result = getTypeSettingSection([xBuildFileStart], xBuildFileEnd,
    addLibStart, addLibEnd, pbxprojFileInfo,
    { parserForExist: pbxListParserForExistFromText,
      checkIfLibExists: pbxCheckIfLibExistsFromList,
      existRebuilder: pbxGetExistLibsFromList,
      libNameRange: {startOf: '/* ', endOf: ' in '}
    });
  const content = makeXBuildFileContent(xcframework, result);
  return addLibToProjecStr(result, pbxprojFileInfo, content,
    removeUnused, xcframework, allLibSet, funcOnRemoved);
}
function updateXCopyFilesBuildPhaseContent(xcframework, pbxprojFileInfo,
  removeUnused, allLibSet, funcOnRemoved) {
  const result = getTypeSettingSection([xCopyFilesBuildPhaseStart, 'files = ('], ');',
    addLibStart, addLibEnd, pbxprojFileInfo,
    { parserForExist: pbxListParserForExistFromText,
      checkIfLibExists: pbxCheckIfLibExistsFromList,
      existRebuilder: pbxGetExistLibsFromList,
      libNameRange: {startOf: '/* ', endOf: ' in '}
    });
  const content = makeXCopyFilesBuildPhaseContent(xcframework, result);
  return addLibToProjecStr(result, pbxprojFileInfo, content,
    removeUnused, xcframework, allLibSet, funcOnRemoved);
}
function updateXFileReferenceContent(xcframework, pbxprojFileInfo,
  removeUnused, allLibSet, funcOnRemoved) {
  const result = getTypeSettingSection([xFileReferenceStart], xFileReferenceEnd,
    addLibStart, addLibEnd, pbxprojFileInfo,
    { parserForExist: pbxListParserForExistFromText,
      checkIfLibExists: pbxCheckIfLibExistsFromList,
      existRebuilder: pbxGetExistLibsFromList,
      libNameRange: {startOf: '/* ', endOf: ' */'}
    });
  const content = makeXFileReferenceContent(xcframework, result);
  return addLibToProjecStr(result, pbxprojFileInfo, content,
    removeUnused, xcframework, allLibSet, funcOnRemoved);
}
function updateXFrameworksBuildPhaseContent(xcframework, pbxprojFileInfo,
  removeUnused, allLibSet, funcOnRemoved) {
  const result = getTypeSettingSection([xFrameworksBuildPhaseStart, 'files = ('], ');',
    addLibStart, addLibEnd, pbxprojFileInfo,
    { parserForExist: pbxListParserForExistFromText,
      checkIfLibExists: pbxCheckIfLibExistsFromList,
      existRebuilder: pbxGetExistLibsFromList,
      libNameRange: {startOf: '/* ', endOf: ' in '}
    });

  const content = makeXFrameworksBuildPhaseContent(xcframework, result);
  return addLibToProjecStr(result, pbxprojFileInfo, content,
    removeUnused, xcframework, allLibSet, funcOnRemoved);
}
function updateXGroupContent(xcframework, pbxprojFileInfo, removeUnused, allLibSet, funcOnRemoved) {
  const result = getTypeSettingSection([xGroupStart, '/* Frameworks */ = {', 'children = ('], ');',
    addLibStart, addLibEnd, pbxprojFileInfo,
    { parserForExist: pbxListParserForExistFromText,
      checkIfLibExists: pbxCheckIfLibExistsFromList,
      existRebuilder: pbxGetExistLibsFromList,
      libNameRange: {startOf: '/* ', endOf: ' */'}
    });

  const content = makeXGroupContent(xcframework, result);
  return addLibToProjecStr(result, pbxprojFileInfo, content,
    removeUnused, xcframework, allLibSet, funcOnRemoved);
}

function updateIosProjectPbxproj(project, libpath, depMap, system, removeUnused, funcOnRemoved, allLibSet) {
  let pbxprojFileInfo = getPbxprojConfig(project);
  const xcframeworkList = getXcframeworkList(depMap, system, pbxprojFileInfo);
  pbxprojFileInfo = updateXBuildFileContent(xcframeworkList, pbxprojFileInfo,
    removeUnused, allLibSet, funcOnRemoved);
  pbxprojFileInfo = updateXCopyFilesBuildPhaseContent(xcframeworkList, pbxprojFileInfo,
    removeUnused, allLibSet, funcOnRemoved);
  pbxprojFileInfo = updateXFileReferenceContent(xcframeworkList, pbxprojFileInfo,
    removeUnused, allLibSet, funcOnRemoved);
  pbxprojFileInfo = updateXFrameworksBuildPhaseContent(xcframeworkList, pbxprojFileInfo,
    removeUnused, allLibSet, funcOnRemoved);
  pbxprojFileInfo = updateXGroupContent(xcframeworkList, pbxprojFileInfo,
    removeUnused, allLibSet, funcOnRemoved);
  setPbxprojConfig(project, pbxprojFileInfo);
}

module.exports = { updateIosProjectPbxproj };
