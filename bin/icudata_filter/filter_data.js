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
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const ALL_TREES = [
  "locales",
  "curr",
  "lang",
  "region",
  "zone",
  "unit",
  "coll",
  "brkitr",
  "rbnf",
];

// 类 IO
class IO {
  constructor(srcDir) {
    this.srcDir = srcDir;
  }

  // 读取 locale 依赖文件
  readLocaleDeps(tree) {
    const filename = path.join(tree, 'LOCALE_DEPS.json');
    return this._readJson(filename);
  }

  // 读取 JSON 文件
  _readJson(filename) {
    const fullPath = path.join(this.srcDir, filename);
    return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  }
}

// 抽象基类 Filter
class Filter {
  static createFromJson(jsonData, io) {
    if (!io) throw new Error('IO instance cannot be null');

    const filterType = (jsonData && jsonData.filterType) || 'file-stem';

    switch (filterType) {
      case 'file-stem':
        return new FileStemFilter(jsonData);
      case 'language':
        return new LanguageFilter(jsonData);
      case 'regex':
        return new RegexFilter(jsonData);
      case 'exclude':
        return new ExclusionFilter();
      case 'union':
        return new UnionFilter(jsonData, io);
      case 'locale':
        return new LocaleFilter(jsonData, io);
      default:
        throw new Error(`Error: Unknown filterType option: ${filterType}`)
    }
  }

  filter(request) {
    if (!request.applyFileFilter(this)) {
      return [];
    }
    for (const file of request.allInputFiles()) {
      this.match(file);
    }
    return [request];
  }

  static _fileToFileStem(file) {
    const start = file.lastIndexOf('/');
    const limit = file.lastIndexOf('.');
    return file.slice(start + 1, limit);
  }

  static _fileToSubdir(file) {
    const limit = file.lastIndexOf('/');
    return limit !== -1 ? file.slice(0, limit) : null;
  }

  match(file) {
    throw new Error("Must be implemented by subclass");
  }
}

// InclusionFilter 类
class InclusionFilter extends Filter {
  match() {
    return true;
  }
}

// ExclusionFilter 类
class ExclusionFilter extends Filter {
  match() {
    return false;
  }
}

// IncludeExcludeFilter 抽象类
class IncludeExcludeFilter extends Filter {
  constructor(jsonData) {
    super();

    this.isIncludelist = false;
    this.includelist = undefined;
    this.excludelist = undefined;

    if (jsonData.whitelist || jsonData.includelist) {
      this.isIncludelist = true;
      this.includelist = jsonData.whitelist || jsonData.includelist;
    } else if (jsonData.blacklist || jsonData.excludelist) {
      this.isIncludelist = false;
      this.excludelist = jsonData.blacklist || jsonData.excludelist;
    } else {
      throw new Error("Need either includelist or excludelist");
    }
  }

  match(file) {
    const fileStem = Filter._fileToFileStem(file);
    return this._shouldInclude(fileStem);
  }

  _shouldInclude() {
    throw new Error("Must be implemented by subclass");
  }
}

// FileStemFilter 类
class FileStemFilter extends IncludeExcludeFilter {
  _shouldInclude(fileStem) {
    if (this.isIncludelist) {
      return this.includelist.includes(fileStem);
    } else {
      return !this.excludelist.includes(fileStem);
    }
  }
}

// LanguageFilter 类
class LanguageFilter extends IncludeExcludeFilter {
  _shouldInclude(fileStem) {
    const parts = fileStem.split('_');
    const language = parts[0];
    if (language === 'root') {
      return true;
    }
    if (this.isIncludelist) {
      return this.includelist.includes(language);
    } else {
      return !this.excludelist.includes(language);
    }
  }
}

// RegexFilter 类
class RegexFilter extends IncludeExcludeFilter {
  constructor(...args) {
    super(...args);

    if (this.isIncludelist) {
      this.includelist = this.includelist.map(pat => new RegExp(pat));
    } else {
      this.excludelist = this.excludelist.map(pat => new RegExp(pat));
    }
  }

  _shouldInclude(fileStem) {
    if (this.isIncludelist) {
      return this.includelist.some(pattern => pattern.test(fileStem));
    } else {
      return !this.excludelist.some(pattern => pattern.test(fileStem));
    }
  }
}

// UnionFilter 类
class UnionFilter extends Filter {
  constructor(jsonData, io) {
    super();
    this.subFilters = [];
    for (const filterJson of jsonData.unionOf) {
      const filter = Filter.createFromJson(filterJson, io);
      if (filter) {
        this.subFilters.push(filter);
      } else {
        throw new Error("Invalid filter configuration");
      }
    }
  }

  match(file) {
    return this.subFilters.some(filter => filter.match(file));
  }
}

// LocaleFilter 类
const LANGUAGE_SCRIPT_REGEX = /^([a-z]{2,3})_[A-Z][a-z]{3}$/;
const LANGUAGE_ONLY_REGEX = /^[a-z]{2,3}$/;

class LocaleFilter extends Filter {
  constructor(jsonData, io) {
    super();

    this.localesRequested = (jsonData.whitelist || jsonData.includelist).map(String);
    this.includeChildren = jsonData.includeChildren !== undefined ? jsonData.includeChildren : true;
    this.includeScripts = jsonData.includeScripts !== undefined ? jsonData.includeScripts : false;

    this.dependencyDataByTree = {};
    for (const tree of ALL_TREES) {
      this.dependencyDataByTree[tree] = io.readLocaleDeps(tree);
    }
  }

  match(file) {
    const tree = Filter._fileToSubdir(file);
    if (!tree) {
        return false;
    }
    const locale = Filter._fileToFileStem(file);

    const requiredLocales = this._localesRequired(tree);

    if (requiredLocales.includes(locale)) {
      return true;
    }

    return this._matchRecursive(locale, tree);
  }

  _localesRequired(tree) {
    const locales = [];
    for (const locale of this.localesRequested) {
      let currentLocale = locale;
      while (currentLocale) {
        locales.push(currentLocale);
        currentLocale = this._getPrevParentLocale(currentLocale, tree);
      }
    }
    return locales;
  }

  _matchRecursive(locale, tree) {
    if (!locale) {
        return false;
    }
    if (this.localesRequested.includes(locale)) {
        return true;
    }

    if (this.includeScripts) {
      const match = locale.match(LANGUAGE_SCRIPT_REGEX);
      if (match) {
        return this._matchRecursive(match[1], tree);
      }
    }

    if (this.includeChildren) {
      const parent = this._getPrevParentLocale(locale, tree);
      if (parent) {
        return this._matchRecursive(parent, tree);
      }
    }

    return false;
  }

  _getPrevParentLocale(locale, tree) {
    const dependencyData = this.dependencyDataByTree[tree];
    if (!dependencyData) {
        return null;
    }

    if (dependencyData.parents && dependencyData.parents[locale]) {
      return dependencyData.parents[locale];
    }
    if (dependencyData.aliases && dependencyData.aliases[locale]) {
      return dependencyData.aliases[locale];
    }

    if (LANGUAGE_ONLY_REGEX.test(locale)) {
      return 'root';
    }

    const idx = locale.lastIndexOf('_');
    if (idx < 0) {
      return locale === 'root' ? null : locale;
    }
    return locale.slice(0, idx);
  }
}

async function applyFilters(requests, config, io) {
  const fileFilteredRequests = await _applyFileFilters(requests, config, io);
  const resourceFilteredRequests = await _applyResourceFilters(fileFilteredRequests, config, io);
  return resourceFilteredRequests;
}

async function _applyFileFilters(oldRequests, config, io) {
  const allCategories = [...oldRequests].map(req => req.category);
  const filters = await _preprocessFileFilters(allCategories, config, io);
  const newRequests = [];

  for (const request of oldRequests) {
    const category = request.category;
    if (category in filters) {
      newRequests.push(...filters[category].filter(request));
    } else {
      newRequests.push(request);
    }
  }

  return newRequests;
}

async function _preprocessFileFilters(allCategories, jsonData, io) {
  allCategories.sort();

  const filters = {};
  const defaultFilter = jsonData.strategy === 'additive' ? 'exclude' : 'include';

  for (const category of allCategories) {
    let filterJson = defaultFilter;

    if (jsonData.featureFilters && category in jsonData.featureFilters) {
      filterJson = jsonData.featureFilters[category];
    }

    if (filterJson === 'include' && jsonData.localeFilter && category.endsWith('_tree')) {
      filterJson = jsonData.localeFilter;
    }

    if (filterJson === 'exclude') {
      filters[category] = new ExclusionFilter();
    } else if (filterJson === 'include') {
      filters[category] = new InclusionFilter();
    } else {
      const filter = Filter.createFromJson(filterJson, io);
      if (filter) {
        filters[category] = filter;
      } else {
        console.error(`Error: Invalid filter configuration for category ${category}`);
      }
    }
  }

  if (jsonData.featureFilters) {
    Object.keys(jsonData.featureFilters).forEach(category => {
      if (!allCategories.includes(category)) {
        console.warn(`Warning: category ${category} is not known`);
      }
    });
  }

  return filters;
}

function removePrefix(filename) {
  const prefixMap = {
    "unidata/": "",
    "mappings/": "",
    "locales/": "",
    "brkitr/lstm/": "brkitr/",
    "sprep/": "",
    "brkitr/dictionaries/": "brkitr/",
    "in/": "",
    "misc/": "",
  };

  let result = filename;
  Object.keys(prefixMap).forEach(p => {
    result = result.replace(p, prefixMap[p]);
  });

  const idx = result.lastIndexOf('.');
  result = result.replace(result.slice(idx), ".*");
  return result;
}

function parseArguments() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const current = process.argv[i];
    if (current.startsWith('--')) {
      const key = current.slice(2); // remove '--'
      const value = process.argv[i + 1]; // next argument as value
      args[key] = value || '';
      i++;
    }
  }
 
  return {
    resDir: args.res_dir || 'data',
    datFile: args.dat_file || 'icudt72l.dat',
    filterFile: args.filter || 'deafault_filter.json',
    module: args.module || 'deafault',
    toolDir: args.tool_dir || 'linux',
    outDir: args.out_dir || 'out',
  };
}

function removePrefix(filename) {
  const prefixMap = {
    "unidata/": "",
    "mappings/": "",
    "locales/": "",
    "brkitr/lstm/": "brkitr/",
    "sprep/": "",
    "brkitr/dictionaries/": "brkitr/",
    "in/": "",
    "misc/": "",
  };
 
  let result = filename;
  Object.keys(prefixMap).forEach(p => {
    result = result.replace(p, prefixMap[p]);
  });
 
  const idx = result.lastIndexOf('.');
  if (idx !== -1) {
    result = result.replace(result.slice(idx), ".*");
  }
 
  return result;
}

async function main() {
  const args = parseArguments();
  const resDir = args.resDir || '';
  const datFile = args.datFile || '';
  const filterFile = args.filterFile || '';
  const module = args.module || '';
  const toolDir = args.toolDir || '';
  const outDir = args.outDir || '';

  let jsonConfig, icuData, io, allCategories, filters, includeList, removeList, finalFilterFile;

  try {
    if (filterFile === `deafault_filter.json` || module === `deafault`) {
      finalFilterFile = path.join(resDir, `deafault_filter.json`);
      jsonConfig = JSON.parse(await fs.promises.readFile(finalFilterFile, 'utf8'));
    } else {
      if (module === 'intl') {
        finalFilterFile = path.join(resDir, `intl_filter_pattern.json`);
      } else if (module === 'i18n') {
        finalFilterFile = path.join(resDir, `i18n_filter_pattern.json`);
      } else if (module === 'both') {
        finalFilterFile = path.join(resDir, `filter_pattern.json`);
      } else {
        throw new Error(`param --module should be intl/i18n/both.`);
      }
      let filterPattern = await fs.promises.readFile(finalFilterFile, 'utf8');
      let locale = await fs.promises.readFile(filterFile, 'utf8');
      filterPattern = filterPattern.replace(/"replace locale"/g, locale);
      jsonConfig = JSON.parse(filterPattern);
    }
  } catch (err) {
    console.error(`Error reading filter file: ${err.message}`);
    process.exit(1);
  }

  try {
    const icuDataPath = path.join(resDir, 'icudata.json');
    icuData = JSON.parse(await fs.promises.readFile(icuDataPath, 'utf8'));
  } catch (err) {
    console.error(`Error reading icudata.json: ${err.message}`);
    process.exit(1);
  }

  io = new IO(resDir);
  allCategories = Object.keys(icuData);

  try {
    filters = await _preprocessFileFilters(allCategories, jsonConfig, io);
  } catch (err) {
    throw new Error(`Error preprocessing filters: ${err.message}`);
  }

  includeList = [];
  removeList = [];

  for (const category of Object.keys(icuData)) {
    if (!(category in filters)) continue;

    const filter = filters[category];
    for (const file of icuData[category]) {
      const isMatch = await filter.match(file);
      if (isMatch) {
        includeList.push(file);
      } else {
        removeList.push(file);
      }
    }
  }

  // 创建输出目录
  await fs.promises.mkdir(outDir, { recursive: true });

  // 生成 remove.txt
  const removeFile = path.join(outDir, 'remove.txt');
  await fs.promises.writeFile(removeFile, removeList.map(removePrefix).join('\n') + '\n');

  // 执行 icupkg 命令
  let icuToolsPath = path.join(toolDir, 'icupkg');
  const outFilePath = path.join(outDir, 'icudt72l.dat');

  if (os.type() !== 'Windows_NT') {
    // 赋予可执行权限
    fs.chmodSync(icuToolsPath, 0o755);
  } else {
    icuToolsPath = path.join(toolDir, 'icupkg.exe');
  }

  const cmd = `${icuToolsPath} -r ${removeFile} ${datFile} ${outFilePath}`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      throw new Error(`Error executing icupkg: ${error.message}`);
    }
  });
}

if (require.main === module) {
  main().catch(err => {
    console.error(`[ICUData] gen icudt72l.dat failed: ${err}`);
    process.exit(1);
  });
}