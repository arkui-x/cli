/*
 * Copyright (c) 2026 Huawei Device Co., Ltd.
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

const fs = require('fs-extra');
const path = require('path');
const JSON5 = require('json5');
const fontkit = require('fontkit');
const { createFont } = require('fonteditor-core');
const { getSourceArkuixPath } = require('../../ace-check/checkSource');
const { arkuiXSdkDir } = require('../../ace-check/configs');
const { getSdkVersion } = require('../../util/index');
const { isAppProject } = require('../../util');
const { getUsedModuleSet } = require('./copyLibraryToProject');

const FONT_EDITOR_READ_OPTIONS = {
  type: 'ttf',
  subset: false,
  hinting: false,
  compound2simple: false
};

const FONT_EDITOR_WRITE_OPTIONS = {
  type: 'ttf',
  hinting: false
};

const REQUIRED_GLYPHS = ['.notdef', '.null', 'nonmarkingreturn', 'space'];
const VARIABLE_FONT_TABLE_TAGS = ['STAT', 'fvar', 'gvar', 'HVAR', 'MVAR', 'VVAR', 'avar'];
const CORE_REPLACED_TABLE_TAGS = ['glyf', 'loca', 'cmap', 'head', 'maxp', 'OS/2', 'hhea'];
const SYMBOL_LAYERS_GROUPING_KEY = 'symbol_layers_grouping';
const SFNT_CHECKSUM_ADJUSTMENT_BASE = 0xB1B0AFBA;

function isValidPathPart(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = value.trim();
  return normalized !== '' && normalized !== 'undefined' && normalized !== 'null';
}

function resolveSdkArkUIXPath(projectDir) {
  const sourcePath = getSourceArkuixPath();
  if (isValidPathPart(sourcePath)) {
    return sourcePath;
  }

  if (!isValidPathPart(arkuiXSdkDir)) {
    return '';
  }

  return path.join(arkuiXSdkDir, String(getSdkVersion(projectDir)), 'arkui-x');
}

/**
 * Normalize a symbol reference field into a string array.
 */
function normalizeSymbolRefs(symbolField) {
  if (!symbolField) {
    return [];
  }
  const refs = Array.isArray(symbolField) ? symbolField : [symbolField];
  return refs
    .map((item) => {
      if (item == null) {
        return '';
      }
      if (typeof item === 'object') {
        return item.value || item.symbol || item.name || item.symbolName || '';
      }
      return item;
    })
    .map((v) => String(v || '').trim())
    .filter(Boolean);
}

function parseSymbolValue(value) {
  if (typeof value === 'string') {
    const radix = value.startsWith('0x') ? 16 : 10;
    return parseInt(value, radix);
  }
  return value;
}

function buildSymbolDict(symbolsData) {
  const symbolDict = new Map();
  const symbolList = Array.isArray(symbolsData && symbolsData.symbol) ? symbolsData.symbol : [];
  for (const item of symbolList) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const parsedValue = parseSymbolValue(item.value);
    if (item.name && !isNaN(parsedValue)) {
      symbolDict.set(item.name, parsedValue);
    }
  }
  return symbolDict;
}

function getSymbolRefsFromConfig(configData) {
  const buildOption = configData.buildOption || configData.buildOptions || {};
  let symbolRefs = buildOption.symbol || configData.symbol || (configData.resource || {}).symbol || [];
  if (!Array.isArray(symbolRefs)) {
    symbolRefs = [symbolRefs].filter(Boolean);
  }
  return symbolRefs;
}

function normalizeSymbolName(symbolRef) {
  let symbolName = symbolRef;
  if (typeof symbolRef === 'object' && symbolRef) {
    symbolName = symbolRef.name || symbolRef.symbol || symbolRef.symbolName || '';
  }
  if (typeof symbolName !== 'string') {
    symbolName = String(symbolName || '');
  }
  if (symbolName.startsWith('sys.symbol.')) {
    symbolName = symbolName.slice(11);
  }
  const dotIdx = symbolName.lastIndexOf('.');
  if (dotIdx !== -1) {
    symbolName = symbolName.slice(dotIdx + 1);
  }
  return symbolName;
}

function appendTargetSymbol(targetSymbols, symbolDict, symbolName) {
  const unicodeValue = symbolDict.get(symbolName);
  if (unicodeValue === undefined) {
    return;
  }
  targetSymbols.push({
    name: symbolName,
    unicode: unicodeValue,
    hex: `U+${unicodeValue.toString(16).toUpperCase().padStart(4, '0')}`
  });
}

/**
 * Read and parse a JSON5 file, returning null on failure.
 */
function readJson5File(filePath) {
  if (!fs.pathExistsSync(filePath)) {
    console.log(`Config file does not exist: ${filePath}`);
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON5.parse(content);
  } catch (error) {
    console.log(`Failed to parse config file: ${filePath}, ${error.message}`);
    return null;
  }
}

/**
 * Merge project and SDK symbol configs into a temporary config file.
 */
function createMergedTempConfig(projectDir, resourcesConfigPath, apiSymbolConfigPath, system) {
  const resourcesConfig = readJson5File(resourcesConfigPath);
  if (!resourcesConfig || typeof resourcesConfig !== 'object') {
    return { shouldSkip: true, reason: `Failed to read resources config: ${resourcesConfigPath}`, tempConfigPath: '' };
  }

  const resourceSymbolRefs = normalizeSymbolRefs(resourcesConfig.symbol);
  if (resourceSymbolRefs.length === 0) {
    return { shouldSkip: true, reason: 'symbol field in resources-config.json is empty', tempConfigPath: '' };
  }

  if (!fs.pathExistsSync(apiSymbolConfigPath)) {
    return { shouldSkip: true, reason: `SDK symbol config file does not exist: ${apiSymbolConfigPath}`, tempConfigPath: '' };
  }

  const apiConfig = readJson5File(apiSymbolConfigPath);
  if (!apiConfig) {
    return { shouldSkip: true, reason: `Failed to read SDK symbol config: ${apiSymbolConfigPath}`, tempConfigPath: '' };
  }
  let apiSymbolRefs = [];
  if (Array.isArray(apiConfig)) {
    let usedModuleSet = new Set();
    let hasUsedModuleSet = false;
    try {
      usedModuleSet = getUsedModuleSet(projectDir, system);
      hasUsedModuleSet = true;
    } catch (error) {
      console.log(`Failed to resolve dependency modules. Fallback to all SDK symbol modules: ${error.message}`);
    }
    apiConfig.forEach((item) => {
      if (!item || typeof item !== 'object') {
        return;
      }
      if (hasUsedModuleSet && !usedModuleSet.has(item.module)) {
        return;
      }
      const currentSymbols = normalizeSymbolRefs(item.symbol);
      apiSymbolRefs = apiSymbolRefs.concat(currentSymbols);
    });
  } else {
    apiSymbolRefs = normalizeSymbolRefs(apiConfig.symbol);
  }

  const mergedRefs = Array.from(new Set([...resourceSymbolRefs, ...apiSymbolRefs]));
  const uniqueSuffix = `${system || 'target'}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const tempConfigPath = path.join(projectDir, '.arkui-x', `resources-config.symbol.merged.tmp.${uniqueSuffix}.json`);
  fs.ensureDirSync(path.dirname(tempConfigPath));
  fs.writeJsonSync(tempConfigPath, { symbol: mergedRefs }, { spaces: 2 });

  return {
    shouldSkip: false,
    reason: '',
    tempConfigPath,
    mergedCount: mergedRefs.length
  };
}

/**
 * Read config files and extract target symbol information.
 */
function readConfigAndExtractSymbols(options) {
  const symbolsData = fs.readJsonSync(options.symbolFile);
  const configContent = fs.readFileSync(options.projectConfig, 'utf8');

  const symbolDict = buildSymbolDict(symbolsData);
  const configData = JSON5.parse(configContent);
  const symbolRefs = getSymbolRefsFromConfig(configData);
  const seen = new Set();
  const targetSymbols = [];

  for (const symbolRef of symbolRefs) {
    const symbolName = normalizeSymbolName(symbolRef);
    if (!symbolName || seen.has(symbolName)) {
      continue;
    }
    seen.add(symbolName);
    appendTargetSymbol(targetSymbols, symbolDict, symbolName);
  }

  return targetSymbols;
}

/**
 * Return the first existing file from a list of candidates.
 */
function resolveFirstExisting(candidates) {
  for (const candidate of candidates) {
    if (candidate && fs.pathExistsSync(candidate)) {
      return candidate;
    }
  }
  return '';
}

/**
 * Resolve glyph ids by Unicode and return the fontkit font instance.
 */
function findGlyphIdsByUnicode(fontBuffer, targetSymbols) {
  const font = fontkit.create(fontBuffer);

  const unicodeToGlyphId = {};

  for (const symbol of targetSymbols) {
    const unicodeVal = symbol.unicode;

    if (!font.hasGlyphForCodePoint(unicodeVal)) {
      console.log(`Warning: symbol '${symbol.name}' (${symbol.hex}) was not found in the font`);
      continue;
    }

    const glyph = font.glyphForCodePoint(unicodeVal);
    if (glyph && Number.isInteger(glyph.id) && glyph.id >= 0 && glyph.id < font.numGlyphs) {
      unicodeToGlyphId[unicodeVal] = glyph.id;
    } else {
      console.log(`Warning: symbol '${symbol.name}' (${symbol.hex}) resolved to an invalid glyph`);
    }
  }

  return { unicodeToGlyphId, font };
}

/**
 * Resolve the built-in glyphs that must always be kept.
 */
function resolveRequiredGlyphIds(font) {
  const keepSet = new Set();

  if (font && Number.isInteger(font.numGlyphs) && font.numGlyphs > 0) {
    keepSet.add(0);
  }

  for (let glyphId = 0; glyphId < font.numGlyphs; glyphId++) {
    const glyph = font.getGlyph(glyphId);
    if (!glyph || typeof glyph.name !== 'string') {
      continue;
    }
    if (REQUIRED_GLYPHS.includes(glyph.name)) {
      keepSet.add(glyphId);
    }
  }

  return keepSet;
}

function isValidGlyphId(font, glyphId) {
  return Number.isInteger(glyphId) && glyphId >= 0 && glyphId < font.numGlyphs;
}

function getCompositeComponentGlyphIds(font, glyphId) {
  if (!isValidGlyphId(font, glyphId)) {
    return [];
  }

  const glyph = font.getGlyph(glyphId);
  if (!glyph || typeof glyph._decode !== 'function') {
    return [];
  }

  const decodedGlyph = glyph._decode();
  if (!decodedGlyph || decodedGlyph.numberOfContours >= 0 || !Array.isArray(decodedGlyph.components)) {
    return [];
  }

  const componentIds = [];
  decodedGlyph.components.forEach((component) => {
    if (component && Number.isInteger(component.glyphID)) {
      componentIds.push(component.glyphID);
    }
  });
  return componentIds;
}

/**
 * Recursively collect composite glyph dependencies so component glyphs are kept.
 */
function collectCompositeGlyphDependencies(font, glyphId, keepSet, visiting = new Set()) {
  if (!isValidGlyphId(font, glyphId)) {
    return;
  }

  const stack = [glyphId];
  while (stack.length > 0) {
    const currentGlyphId = stack.pop();
    if (!isValidGlyphId(font, currentGlyphId)) {
      continue;
    }
    if (keepSet.has(currentGlyphId) || visiting.has(currentGlyphId)) {
      keepSet.add(currentGlyphId);
      continue;
    }

    visiting.add(currentGlyphId);
    keepSet.add(currentGlyphId);

    const componentIds = getCompositeComponentGlyphIds(font, currentGlyphId);
    componentIds.forEach((componentGlyphId) => {
      if (!keepSet.has(componentGlyphId)) {
        stack.push(componentGlyphId);
      }
    });

    visiting.delete(currentGlyphId);
  }
}

/**
 * Collect the final glyph ids to keep, including required glyphs and composite dependencies.
 */
function collectGlyphIdsForSubsetting(font, keepGlyphIds) {
  const keepSet = resolveRequiredGlyphIds(font);

  keepGlyphIds.forEach((glyphId) => {
    collectCompositeGlyphDependencies(font, glyphId, keepSet);
  });

  return Array.from(keepSet).sort((a, b) => a - b);
}

/**
 * Deep-clone a glyph data object.
 */
function deepCloneValue(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return seen.get(value);
  }

  if (Array.isArray(value)) {
    const clonedArray = new Array(value.length);
    seen.set(value, clonedArray);
    for (let index = 0; index < value.length; index++) {
      clonedArray[index] = deepCloneValue(value[index], seen);
    }
    return clonedArray;
  }

  const clonedObject = {};
  seen.set(value, clonedObject);
  Object.keys(value).forEach((key) => {
    clonedObject[key] = deepCloneValue(value[key], seen);
  });
  return clonedObject;
}

function cloneGlyphData(glyph) {
  if (!glyph) {
    return glyph;
  }

  if (typeof structuredClone === 'function') {
    return structuredClone(glyph);
  }

  return deepCloneValue(glyph);
}

/**
 * Create a missing-glyph reference glyph using a lightweight compound reference.
 */
function createMissingGlyphReferenceData(glyph, fallbackGlyphId, fallbackGlyph) {
  if (!glyph) {
    return glyph;
  }

  if (!Number.isInteger(fallbackGlyphId) || fallbackGlyphId < 0) {
    return cloneGlyphData(glyph);
  }

  const fallback = fallbackGlyph || glyph;

  return {
    ...cloneGlyphData(glyph),
    compound: true,
    glyfs: [
      {
        glyphIndex: fallbackGlyphId,
        useMyMetrics: true,
        overlapCompound: false,
        transform: {
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: 0,
          f: 0
        }
      }
    ],
    contours: [],
    instructions: [],
    xMin: fallback && Number.isFinite(fallback.xMin) ? fallback.xMin : 0,
    yMin: fallback && Number.isFinite(fallback.yMin) ? fallback.yMin : 0,
    xMax: fallback && Number.isFinite(fallback.xMax) ? fallback.xMax : 0,
    yMax: fallback && Number.isFinite(fallback.yMax) ? fallback.yMax : 0
  };
}

/**
 * Rebuild a subset cmap and optionally remap misses to a fallback glyph.
 */
function rebuildSubsetCmap(cmap, oldToNewIdMap, fallbackGlyphId) {
  const newCmap = Object.create(null);
  for (const [unicodeStr, oldId] of Object.entries(cmap || {})) {
    const normalizedOldId = Number(oldId);
    const newId = oldToNewIdMap[normalizedOldId];
    if (newId !== undefined) {
      newCmap[unicodeStr] = newId;
    } else if (fallbackGlyphId !== undefined) {
      newCmap[unicodeStr] = fallbackGlyphId;
    }
  }
  return newCmap;
}

/**
 * Parse the SFNT table directory and extract table data.
 */
function parseSfntTables(fontBuffer) {
  if (!Buffer.isBuffer(fontBuffer) || fontBuffer.length < 12) {
    console.log('Invalid SFNT font buffer');
    return null;
  }

  const numTables = fontBuffer.readUInt16BE(4);
  const directoryEnd = 12 + numTables * 16;
  if (directoryEnd > fontBuffer.length) {
    console.log('SFNT table directory exceeds font buffer length');
    return null;
  }

  const tables = {};

  for (let index = 0; index < numTables; index++) {
    const recordOffset = 12 + index * 16;
    const tag = fontBuffer.toString('ascii', recordOffset, recordOffset + 4);
    const checkSum = fontBuffer.readUInt32BE(recordOffset + 4);
    const offset = fontBuffer.readUInt32BE(recordOffset + 8);
    const length = fontBuffer.readUInt32BE(recordOffset + 12);

    if (offset > fontBuffer.length || length > fontBuffer.length - offset) {
      console.log(`SFNT table '${tag}' exceeds font buffer length`);
      return null;
    }

    tables[tag] = {
      tag,
      checkSum,
      offset,
      length,
      data: Buffer.from(fontBuffer.slice(offset, offset + length))
    };
  }

  return tables;
}

/**
 * Calculate the checksum of a single table.
 */
function calculateTableChecksum(tableBuffer) {
  const paddedLength = Math.ceil(tableBuffer.length / 4) * 4;
  const paddedBuffer = Buffer.alloc(paddedLength);
  tableBuffer.copy(paddedBuffer);

  let sum = 0;
  for (let offset = 0; offset < paddedLength; offset += 4) {
    sum = (sum + paddedBuffer.readUInt32BE(offset)) >>> 0;
  }

  return sum >>> 0;
}

/**
 * Build SFNT font binary data from a table map.
 */
function buildSfntFont(tableMap) {
  const tags = Object.keys(tableMap).sort();
  const numTables = tags.length;
  const maxPowerOf2 = 2 ** Math.floor(Math.log2(Math.max(numTables, 1)));
  const searchRange = maxPowerOf2 * 16;
  const entrySelector = Math.log2(maxPowerOf2) | 0;
  const rangeShift = numTables * 16 - searchRange;
  const directorySize = 12 + numTables * 16;

  let currentOffset = directorySize;
  const records = [];
  const chunks = [Buffer.alloc(directorySize)];

  tags.forEach((tag) => {
    const tableBuffer = Buffer.from(tableMap[tag]);
    const paddedLength = Math.ceil(tableBuffer.length / 4) * 4;
    const paddedBuffer = Buffer.alloc(paddedLength);
    tableBuffer.copy(paddedBuffer);

    records.push({
      tag,
      checkSum: calculateTableChecksum(tableBuffer),
      offset: currentOffset,
      length: tableBuffer.length
    });

    chunks.push(paddedBuffer);
    currentOffset += paddedLength;
  });

  const fontBuffer = Buffer.concat(chunks);
  fontBuffer.writeUInt32BE(0x00010000, 0);
  fontBuffer.writeUInt16BE(numTables, 4);
  fontBuffer.writeUInt16BE(searchRange, 6);
  fontBuffer.writeUInt16BE(entrySelector, 8);
  fontBuffer.writeUInt16BE(rangeShift, 10);

  records.forEach((record, index) => {
    const recordOffset = 12 + index * 16;
    fontBuffer.write(record.tag, recordOffset, 4, 'ascii');
    fontBuffer.writeUInt32BE(record.checkSum >>> 0, recordOffset + 4);
    fontBuffer.writeUInt32BE(record.offset >>> 0, recordOffset + 8);
    fontBuffer.writeUInt32BE(record.length >>> 0, recordOffset + 12);
  });

  return fontBuffer;
}

/**
 * Calculate the checksum of the entire font.
 */
function calculateFontChecksum(fontBuffer) {
  const paddedLength = Math.ceil(fontBuffer.length / 4) * 4;
  const paddedBuffer = Buffer.alloc(paddedLength);
  fontBuffer.copy(paddedBuffer);

  let sum = 0;
  for (let offset = 0; offset < paddedLength; offset += 4) {
    sum = (sum + paddedBuffer.readUInt32BE(offset)) >>> 0;
  }

  return sum >>> 0;
}

/**
 * Recalculate checkSumAdjustment and produce the final SFNT font.
 */
function finalizeSfntFont(tableMap) {
  const zeroedTables = { ...tableMap };
  if (zeroedTables.head) {
    zeroedTables.head = Buffer.from(zeroedTables.head);
    zeroedTables.head.writeUInt32BE(0, 8);
  }

  let fontBuffer = buildSfntFont(zeroedTables);
  const adjustment = (SFNT_CHECKSUM_ADJUSTMENT_BASE - calculateFontChecksum(fontBuffer)) >>> 0;

  if (zeroedTables.head) {
    zeroedTables.head.writeUInt32BE(adjustment, 8);
  }

  fontBuffer = buildSfntFont(zeroedTables);
  return fontBuffer;
}

function parseGvarLayout(gvarBuffer) {
  if (!Buffer.isBuffer(gvarBuffer) || gvarBuffer.length < 20) {
    return null;
  }

  const flags = gvarBuffer.readUInt16BE(14);
  const glyphCount = gvarBuffer.readUInt16BE(12);
  const offsetToData = gvarBuffer.readUInt32BE(16);
  const longOffsets = (flags & 0x0001) !== 0;
  const offsetEntrySize = longOffsets ? 4 : 2;
  const offsetsStart = 20;
  const offsetsEnd = offsetsStart + (glyphCount + 1) * offsetEntrySize;

  if (offsetToData < offsetsEnd || offsetToData > gvarBuffer.length) {
    return null;
  }

  return {
    glyphCount,
    offsetToData,
    longOffsets,
    offsetEntrySize,
    offsetsStart
  };
}

function readGvarOffsets(gvarBuffer, layout) {
  const originalOffsets = new Array(layout.glyphCount + 1);
  const maxDataLength = gvarBuffer.length - layout.offsetToData;
  for (let index = 0; index <= layout.glyphCount; index++) {
    const offsetPos = layout.offsetsStart + index * layout.offsetEntrySize;
    originalOffsets[index] = layout.longOffsets
      ? gvarBuffer.readUInt32BE(offsetPos)
      : gvarBuffer.readUInt16BE(offsetPos) * 2;

    if (originalOffsets[index] < 0 || originalOffsets[index] > maxDataLength) {
      return null;
    }
    if (index > 0 && originalOffsets[index] < originalOffsets[index - 1]) {
      return null;
    }
  }
  return originalOffsets;
}

function buildSubsetGvarData(gvarBuffer, layout, originalOffsets, keepSet) {
  const newOffsets = new Array(layout.glyphCount + 1);
  const dataChunks = [];
  let currentOffset = 0;

  for (let glyphId = 0; glyphId < layout.glyphCount; glyphId++) {
    newOffsets[glyphId] = currentOffset;
    const start = originalOffsets[glyphId];
    const end = originalOffsets[glyphId + 1];
    if (!keepSet.has(glyphId) || end <= start) {
      continue;
    }

    dataChunks.push(gvarBuffer.slice(layout.offsetToData + start, layout.offsetToData + end));
    currentOffset += end - start;

    if (!layout.longOffsets && currentOffset % 2 !== 0) {
      dataChunks.push(Buffer.alloc(1));
      currentOffset += 1;
    }

    if (!layout.longOffsets && currentOffset / 2 > 0xFFFF) {
      return null;
    }
  }

  newOffsets[layout.glyphCount] = currentOffset;
  return { newOffsets, dataChunks };
}

function rewriteGvarOffsetsPrefix(gvarBuffer, layout, newOffsets) {
  const prefix = Buffer.from(gvarBuffer.slice(0, layout.offsetToData));
  for (let index = 0; index <= layout.glyphCount; index++) {
    const offsetPos = layout.offsetsStart + index * layout.offsetEntrySize;
    if (layout.longOffsets) {
      prefix.writeUInt32BE(newOffsets[index] >>> 0, offsetPos);
    } else {
      prefix.writeUInt16BE((newOffsets[index] / 2) >>> 0, offsetPos);
    }
  }
  return prefix;
}

/**
 * Subset the gvar table by removing variation data for glyphs that are not kept.
 */
function subsetGvarTable(gvarBuffer, keepGlyphIds) {
  if (!Array.isArray(keepGlyphIds) || keepGlyphIds.length === 0) {
    return gvarBuffer;
  }

  const layout = parseGvarLayout(gvarBuffer);
  if (!layout) {
    return gvarBuffer;
  }

  const originalOffsets = readGvarOffsets(gvarBuffer, layout);
  if (!originalOffsets) {
    return gvarBuffer;
  }

  const keepSet = new Set(keepGlyphIds);
  const subsetData = buildSubsetGvarData(gvarBuffer, layout, originalOffsets, keepSet);
  if (!subsetData) {
    return gvarBuffer;
  }

  const prefix = rewriteGvarOffsetsPrefix(gvarBuffer, layout, subsetData.newOffsets);
  return Buffer.concat([prefix, ...subsetData.dataChunks]);
}

/**
 * Merge rewritten core tables with original variable-font tables.
 */
function mergeSubsetTables(originalFontBuffer, rewrittenFontBuffer, keepGlyphIds) {
  try {
    const mergedTables = {};
    const originalTables = parseSfntTables(originalFontBuffer);
    const rewrittenTables = parseSfntTables(rewrittenFontBuffer);

    if (!originalTables || !rewrittenTables) {
      console.log('Variable font table merge skipped due to invalid SFNT table data.');
      return rewrittenFontBuffer;
    }

    Object.keys(originalTables).forEach((tag) => {
      mergedTables[tag] = originalTables[tag].data;
    });

    CORE_REPLACED_TABLE_TAGS.forEach((tag) => {
      if (rewrittenTables[tag]) {
        mergedTables[tag] = rewrittenTables[tag].data;
      }
    });

    VARIABLE_FONT_TABLE_TAGS.forEach((tag) => {
      if (originalTables[tag]) {
        mergedTables[tag] = originalTables[tag].data;
      }
    });

    if (originalTables.gvar) {
      mergedTables.gvar = subsetGvarTable(originalTables.gvar.data, keepGlyphIds);
    }

    return finalizeSfntFont(mergedTables);
  } catch (error) {
    console.log(`Variable font table merge failed, falling back to rewritten core font only: ${error.message}`);
    return rewrittenFontBuffer;
  }
}

/**
 * Determine whether the font contains key variable-font tables.
 */
function hasVariableFontTables(fontBuffer) {
  const tables = parseSfntTables(fontBuffer);
  if (!tables) {
    console.log('Failed to inspect SFNT tables, treat font as non-variable.');
    return false;
  }
  return VARIABLE_FONT_TABLE_TAGS.some((tag) => !!tables[tag]);
}

/**
 * Find nodes in the font config that match target native glyph ids.
 */
function findConfigNodesByNativeGlyphIds(fontConfig, targetNativeIds) {
  const configData = fs.readJsonSync(fontConfig);
  const grouping = Array.isArray(configData && configData[SYMBOL_LAYERS_GROUPING_KEY])
    ? configData[SYMBOL_LAYERS_GROUPING_KEY]
    : [];
  if (grouping.length === 0) {
    return { matchedNodes: [], keepGlyphIds: [], configData };
  }

  const targetSet = new Set(targetNativeIds);
  const matchedNodes = [];
  const allGlyphIds = new Set();

  for (const node of grouping) {
    if (!node || typeof node !== 'object') {
      continue;
    }
    const nativeId = node.native_glyph_id;
    if (!Number.isInteger(nativeId) || !targetSet.has(nativeId)) {
      continue;
    }

    matchedNodes.push(node);
    allGlyphIds.add(nativeId);

    const symbolId = node.symbol_glyph_id;
    if (Number.isInteger(symbolId) && symbolId !== nativeId) {
      allGlyphIds.add(symbolId);
    }
  }

  const keepGlyphIds = Array.from(allGlyphIds).sort((a, b) => a - b);
  return { matchedNodes, keepGlyphIds, configData };
}

function buildVariableSubsetGlyphData(glyphs, keepIndices, missingGlyph) {
  const oldToNewIdMap = Object.create(null);
  keepIndices.forEach((glyphId) => {
    oldToNewIdMap[glyphId] = glyphId;
  });
  const keepSet = new Set(keepIndices);
  const newGlyfs = glyphs.map((glyph, glyphId) => (
    keepSet.has(glyphId)
      ? cloneGlyphData(glyph)
      : createMissingGlyphReferenceData(glyph, 0, missingGlyph)
  ));
  return { oldToNewIdMap, newGlyfs };
}

function buildStaticSubsetGlyphData(glyphs, keepIndices) {
  const oldToNewIdMap = Object.create(null);
  keepIndices.forEach((glyphId, newId) => {
    oldToNewIdMap[glyphId] = newId;
  });
  const newGlyfs = keepIndices.map((glyphId) => cloneGlyphData(glyphs[glyphId]));
  return { oldToNewIdMap, newGlyfs };
}

function updateOs2UnicodeRange(data, newCmap) {
  const unicodeValues = Object.keys(newCmap)
    .map((k) => parseInt(k, 10))
    .filter((v) => !isNaN(v));
  if (unicodeValues.length === 0) {
    return;
  }

  let minUnicode = unicodeValues[0];
  let maxUnicode = unicodeValues[0];
  for (let index = 1; index < unicodeValues.length; index++) {
    const value = unicodeValues[index];
    if (value < minUnicode) {
      minUnicode = value;
    }
    if (value > maxUnicode) {
      maxUnicode = value;
    }
  }

  data['OS/2'].usFirstCharIndex = minUnicode;
  data['OS/2'].usLastCharIndex = maxUnicode;
}

function buildSubsetFontData(data, glyphs, fontkitFont, keepGlyphIds, isVariableFont) {
  const missingGlyph = glyphs[0] ? cloneGlyphData(glyphs[0]) : null;
  const cmap = (data && data.cmap && typeof data.cmap === 'object') ? data.cmap : {};
  const glyphCount = glyphs.length;
  const keepIndices = collectGlyphIdsForSubsetting(fontkitFont, keepGlyphIds)
    .filter((glyphId) => glyphId < glyphCount);

  if (keepIndices.length === 0) {
    return null;
  }

  const subsetGlyphData = isVariableFont
    ? buildVariableSubsetGlyphData(glyphs, keepIndices, missingGlyph)
    : buildStaticSubsetGlyphData(glyphs, keepIndices);
  const newCmap = rebuildSubsetCmap(cmap, subsetGlyphData.oldToNewIdMap, isVariableFont ? 0 : undefined);

  return {
    ...subsetGlyphData,
    newCmap,
    keepIndices,
    glyphCount
  };
}

/**
 * Subset the font while preserving Unicode mappings for target symbols.
 */
function cropFont(fontBuffer, fontkitFont, keepGlyphIds, outputDir) {
  try {
    const isVariableFont = hasVariableFontTables(fontBuffer);
    const newFont = createFont(fontBuffer, FONT_EDITOR_READ_OPTIONS);
    const data = newFont.get();
    const glyphs = Array.isArray(data && data.glyf) ? data.glyf : [];
    if (glyphs.length === 0) {
      console.log('No glyph data found in font');
      return null;
    }

    const subsetData = buildSubsetFontData(data, glyphs, fontkitFont, keepGlyphIds, isVariableFont);
    if (!subsetData) {
      console.log('No valid glyphs selected for subsetting');
      return null;
    }

    data.glyf = subsetData.newGlyfs;
    data.cmap = subsetData.newCmap;

    if (data.maxp) {
      data.maxp.numGlyphs = isVariableFont ? subsetData.glyphCount : subsetData.newGlyfs.length;
    }

    if (data['OS/2']) {
      updateOs2UnicodeRange(data, subsetData.newCmap);
    }

    newFont.set(data);

    const rewrittenCoreFontBuffer = Buffer.from(newFont.write(FONT_EDITOR_WRITE_OPTIONS));
    const outputFontBuffer = isVariableFont
      ? mergeSubsetTables(fontBuffer, rewrittenCoreFontBuffer, subsetData.keepIndices)
      : rewrittenCoreFontBuffer;
    fs.ensureDirSync(outputDir);
    const outputFontPath = path.join(outputDir, 'HMSymbolVF.ttf');
    fs.writeFileSync(outputFontPath, outputFontBuffer);

    const originalSize = fontBuffer.length;
    const croppedSize = outputFontBuffer.length;
    const compressionRate = ((1 - croppedSize / originalSize) * 100).toFixed(1);

    return {
      outputFontPath,
      originalSize,
      croppedSize,
      compressionRate,
      originalGlyphCount: subsetData.glyphCount,
      croppedGlyphCount: subsetData.keepIndices.length,
      oldToNewIdMap: subsetData.oldToNewIdMap
    };
  } catch (error) {
    console.log(`Font subsetting failed: ${error.message}`);
    return null;
  }
}

/**
 * Update the config file using the glyph remapping result.
 */
function updateConfigByUnicodeMapping(configData, matchedNodes, oldToNewIdMap, outputDir) {
  const remapId = (id) => {
    if (id != null && oldToNewIdMap[id] !== undefined) {
      return oldToNewIdMap[id];
    }
    return id;
  };

  const updatedNodes = matchedNodes.map((node) => ({
    ...node,
    'native_glyph_id': remapId(node.native_glyph_id),
    'symbol_glyph_id': remapId(node.symbol_glyph_id)
  }));

  const updatedConfig = { ...configData, [SYMBOL_LAYERS_GROUPING_KEY]: updatedNodes };
  const updatedConfigPath = path.join(outputDir, 'hm_symbol_config_next.json');
  fs.writeJsonSync(updatedConfigPath, updatedConfig, { spaces: 2 });
  return { updatedConfigPath };
}

/**
 * Generate the output directory path for subset fonts.
 */
function generateDestDatPath(projectDir, system) {
  const androidDir = isAppProject(projectDir) ? 'app' : 'library';
  let destPath = path.join(projectDir, `.arkui-x/android/${androidDir}/src/main/assets/arkui-x/systemres/fonts`);
  if (system === 'ios') {
    destPath = path.join(projectDir, '.arkui-x/ios/arkui-x/systemres/fonts');
  } else if (system === 'bundle') {
    destPath = path.join(projectDir, '.arkui-x/build/ace_assets/systemres/fonts');
  }
  return destPath;
}

function resolveResourcesConfigPath(projectDir) {
  const resourcesConfigCandidates = [
    path.join(projectDir, '.arkui-x/resources-config.json'),
    path.join(projectDir, '.arkui-x/build/ace_assets/resources-config.json'),
    path.join(projectDir, 'resources-config.json')
  ];
  return resolveFirstExisting(resourcesConfigCandidates);
}

function resolveFontSubsetInputPaths(sdkArkUIXPath) {
  const symbolFileCandidates = [
    path.join(sdkArkUIXPath, 'engine/extras/symbol/symbol.json')
  ];

  const fontFileCandidates = [
    path.join(sdkArkUIXPath, 'engine/systemres/fonts/HMSymbolVF.ttf')
  ];

  const fontConfigCandidates = [
    path.join(sdkArkUIXPath, 'engine/systemres/fonts/hm_symbol_config_next.json')
  ];

  return {
    symbolFile: resolveFirstExisting(symbolFileCandidates),
    fontFile: resolveFirstExisting(fontFileCandidates),
    fontConfig: resolveFirstExisting(fontConfigCandidates)
  };
}

function cleanupTempConfig(tempConfigPath) {
  if (tempConfigPath && fs.pathExistsSync(tempConfigPath)) {
    fs.removeSync(tempConfigPath);
  }
}

function executeFontSubset(defaultOptions) {
  const targetSymbols = readConfigAndExtractSymbols(defaultOptions);
  const fontBuffer = fs.readFileSync(defaultOptions.fontFile);

  if (targetSymbols.length === 0) {
    return { success: false, error: 'no symbols found for subsetting' };
  }

  const { unicodeToGlyphId, font } = findGlyphIdsByUnicode(fontBuffer, targetSymbols);
  if (Object.keys(unicodeToGlyphId).length === 0) {
    return { success: false, error: 'no matching glyph IDs found' };
  }

  const targetNativeIds = Object.values(unicodeToGlyphId);
  const { matchedNodes, keepGlyphIds, configData } = findConfigNodesByNativeGlyphIds(
    defaultOptions.fontConfig,
    targetNativeIds
  );

  if (matchedNodes.length === 0) {
    return { success: false, error: 'no matched config nodes found' };
  }

  const cropResult = cropFont(fontBuffer, font, keepGlyphIds, defaultOptions.outputDir);
  if (!cropResult) {
    return { success: false, error: 'font subsetting failed' };
  }

  const configFiles = updateConfigByUnicodeMapping(
    configData,
    matchedNodes,
    cropResult.oldToNewIdMap,
    defaultOptions.outputDir
  );

  return {
    success: true,
    targetSymbols,
    matchedNodes: matchedNodes.length,
    originalGlyphs: cropResult.originalGlyphCount,
    keptGlyphs: cropResult.croppedGlyphCount,
    compressionRate: cropResult.compressionRate,
    outputFiles: {
      hmSymbolVfTtf: cropResult.outputFontPath,
      hmSymbolConfigNextJson: configFiles.updatedConfigPath
    }
  };
}

function normalizeFontSubsetOutput(result) {
  if (!result || result.success !== true) {
    return result;
  }
  return {
    ...result,
    outputFiles: {
      'HMSymbolVF.ttf': result.outputFiles.hmSymbolVfTtf,
      'hm_symbol_config_next.json': result.outputFiles.hmSymbolConfigNextJson
    }
  };
}

/**
 * Main font subsetting flow.
 */
function fontSubset(projectDir, system) {
  const sdkArkUIXPath = resolveSdkArkUIXPath(projectDir);
  if (!sdkArkUIXPath) {
    console.log('ArkUI-X SDK path is invalid. Please check arkuiXSdkDir configuration.');
    return { success: false, error: 'invalid ArkUI-X SDK path' };
  }
  const resourcesConfigPath = resolveResourcesConfigPath(projectDir);
  const apiSymbolConfigPath = path.join(sdkArkUIXPath, 'engine/extras/symbol/apiSymbolConfig.json');

  let mergedTempConfigPath = '';

  if (!resourcesConfigPath) {
    console.log('resources-config.json was not found. Skip font subsetting.');
    return { success: true, skipped: true, reason: 'resources-config.json was not found' };
  }

  const mergeResult = createMergedTempConfig(projectDir, resourcesConfigPath, apiSymbolConfigPath, system);
  if (mergeResult.shouldSkip) {
    console.log(`${mergeResult.reason}. Skip font subsetting.`);
    return { success: true, skipped: true, reason: mergeResult.reason };
  }
  mergedTempConfigPath = mergeResult.tempConfigPath;

  const resolvedInputPaths = resolveFontSubsetInputPaths(sdkArkUIXPath);
  const defaultOptions = {
    projectConfig: mergedTempConfigPath,
    symbolFile: resolvedInputPaths.symbolFile,
    fontFile: resolvedInputPaths.fontFile,
    fontConfig: resolvedInputPaths.fontConfig,
    outputDir: generateDestDatPath(projectDir, system),
  };

  if (!defaultOptions.symbolFile || !defaultOptions.fontFile || !defaultOptions.fontConfig) {
    console.log('Invalid font or symbol resource path.');
    cleanupTempConfig(mergedTempConfigPath);
    return { success: false, error: 'invalid font or symbol resource path' };
  }

  try {
    const result = executeFontSubset(defaultOptions);
    if (!result.success) {
      console.log(result.error === 'no symbols found for subsetting' ? 'No symbols found for subsetting.' :
        result.error === 'no matching glyph IDs found' ? 'No matching glyph IDs found.' :
          result.error === 'no matched config nodes found' ? 'No matched config nodes found.' :
            'Font subsetting failed.');
    }
    return normalizeFontSubsetOutput(result);
  } catch (error) {
    console.error('Error occurred during processing:', error.message);
    return { success: false, error: error.message };
  } finally {
    cleanupTempConfig(mergedTempConfigPath);
  }
}

function runFontSubsetForTarget(projectDir, system, targetName, options = {}) {
  const { failOnSkip = false } = options;
  const subsetResult = fontSubset(projectDir, system);

  if (!subsetResult || subsetResult.success === false) {
    console.error(`Build failed: hwSymbol subset failed for ${targetName}.`);
    return false;
  }

  if (failOnSkip && subsetResult.skipped) {
    console.error(`Build failed: hwSymbol subset was skipped for ${targetName} (${subsetResult.reason || 'unknown reason'}).`);
    return false;
  }

  return true;
}

module.exports = { fontSubset, runFontSubsetForTarget };