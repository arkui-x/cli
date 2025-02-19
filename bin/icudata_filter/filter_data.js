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

// 引入必要的模块
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 定义 IO 类
class IO {
  constructor(srcDir) {
    this.srcDir = srcDir;
  }

  // 读取 locale 依赖文件
  readLocaleDeps(tree) {
    return this._readJSON(path.join(tree, 'LOCALE_DEPS.json'));
  }

  // 读取 JSON 文件
  _readJSON(filename) {
    const fullPath = path.join(this.srcDir, filename);
    return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  }
}

// 定义 Filter 类
class Filter {
  static _fileToStem(file) {
    let lastSlash = file.lastIndexOf('/');
    let lastDot = file.lastIndexOf('.');
    return file.slice(lastSlash + 1, lastDot);
  }

  static _fileToSubdir(file) {
    let lastSlash = file.lastIndexOf('/');
    if (lastSlash === -1) {
      return null;
    }
    return file.slice(0, lastSlash);
  }

  match(file) {
    return false;
  }
}

// 定义 locale 正则表达式
const LANGUAGE_SCRIPT_REGEX = /^(?<language>[a-z]{2,3})_[A-Z][a-z]{3}$/;
const LANGUAGE_ONLY_REGEX = /^[a-z]{2,3}$/;

// 定义所有 locale tree
const ALL_TREES = [
  'locales',
  'curr',
  'lang',
  'region',
  'zone',
  'unit',
  'coll',
  'brkitr',
  'rbnf',
];

// 定义 LocaleFilter 类
class LocaleFilter extends Filter {
  constructor(jsonData, io) {
    super();
    if (jsonData.whitelist) {
      this.localesRequested = jsonData.whitelist;
    } else if (jsonData.includelist) {
      this.localesRequested = jsonData.includelist;
    } else {
      throw new Error('You must have an includelist in a locale filter');
    }
    this.includeChildren = jsonData.includeChildren !== undefined ? jsonData.includeChildren : true;
    this.includeScripts = jsonData.includeScripts !== undefined ? jsonData.includeScripts : false;

    // 加载依赖数据
    this.dependencyDataByTree = {};
    for (const tree of ALL_TREES) {
      this.dependencyDataByTree[tree] = io.readLocaleDeps(tree);
    }
  }

  match(file) {
    let tree = Filter._fileToSubdir(file);
    if (!tree) {
      return false;
    }
    let locale = Filter._fileToStem(file);

    // 检查是否是必选 locale
    if (this._localesRequired(tree).includes(locale)) {
      return true;
    }

    // 匹配递归规则
    return this._matchRecursive(locale, tree);
  }

  _matchRecursive(locale, tree) {
    if (!locale) {
      return false;
    }
    if (this.localesRequested.includes(locale)) {
      return true;
    }

    // 检查语言脚本规则
    if (this.includeScripts) {
      const scriptMatch = locale.match(LANGUAGE_SCRIPT_REGEX);
      if (scriptMatch) {
        const [, baseLocale] = scriptMatch;
        return this._matchRecursive(baseLocale, tree);
      }
    }

    // 检查是否是子树
    if (this.includeChildren) {
      const parent = this._getParentLocale(locale, tree);
      return this._matchRecursive(parent, tree);
    }

    return false;
  }

  _getParentLocale(locale, tree) {
    const dependencyData = this.dependencyDataByTree[tree];
    if (dependencyData.parents && locale in dependencyData.parents) {
      return dependencyData.parents[locale];
    }
    if (dependencyData.aliases && locale in dependencyData.aliases) {
      return dependencyData.aliases[locale];
    }
    if (LANGUAGE_ONLY_REGEX.test(locale)) {
      return 'root';
    }
    const lastUnderscore = locale.lastIndexOf('_');
    if (lastUnderscore < 0) {
      if (locale === 'root') {
        return null;
      } else {
        throw new Error(`Invalid locale: ${tree}/${locale}`);
      }
    }
    return locale.slice(0, lastUnderscore);
  }

  _localesRequired(tree) {
    const requiredLocales = [];
    for (const locale of this.localesRequested) {
      let currentLocale = locale;
      while (currentLocale !== null) {
        requiredLocales.push(currentLocale);
        currentLocale = this._getParentLocale(currentLocale, tree);
      }
    }
    return requiredLocales;
  }
}

function executor({ toolDir = '', removeFile = '', allDatFile = '', outDir = '' }) {
  let outFile = path.join(outDir, 'icudt72l.dat');
  let icuTool = path.join(toolDir, 'icupkg');
  if (toolDir !== 'windows') {
    // 赋予可执行权限
    fs.chmodSync(icuTool, 0o755);
  }
  // execPath 写入需要执行的命令
  let execPath = `${icuTool} -r ${removeFile} ${allDatFile} ${outFile}`;

  // 执行函数
  let child = exec(execPath, (error, stdout, stderr) => {
    if (error) {
      throw new Error(error);
    }
  });
}

// 主程序
(async () => {
  // 解析命令行参数
  const args = {};

  // 找到所有以 -- 开头的参数
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('--')) {
      const key = process.argv[i].replace('--', '');
      const value = process.argv[i + 1];
      args[key] = value;
      i++; // 跳过下一个值
    }
  }

  // 检查必要的参数
  let isValid = args.res_dir && args.dat_file && args.filter && args.tool_dir && args.out_dir;
  if (!isValid) {
    throw new Error('Usage: --res_dir <path> --dat_file <path> --filter <path> --tool_dir <path> --out_dir <path>');
    process.exit(1);
  }

  const toolDir = args.tool_dir;
  const dataDir = args.res_dir;
  const filterFile = args.filter;
  const resListFile = path.join(dataDir, 'res_list.json');

  // 读取 filter 文件
  const filterData = JSON.parse(fs.readFileSync(filterFile, 'utf-8'));

  // 读取 res_list 文件
  const allResFile = JSON.parse(fs.readFileSync(resListFile, 'utf-8'));

  // 初始化 IO 和 LocaleFilter
  const io = new IO(dataDir);
  const localeFilter = new LocaleFilter(filterData, io);

  // 处理文件列表
  const deleteFile = [];

  for (const [tree, locales] of Object.entries(allResFile)) {
    for (const locale of locales) {
      const file = `${tree}/${locale}`;
      const resPath = tree !== 'locales' ? `${tree}/${locale.slice(0, -4)}.res` : `${locale.slice(0, -4)}.res`;

      if (!localeFilter.match(file)) {
        deleteFile.push(resPath);
      }
    }
  }

  try {
    // 使用 { recursive: true } 参数来递归创建文件夹
    fs.mkdirSync(args.out_dir, { recursive: true });
  } catch (err) {
    // 如果文件夹已存在，捕获异常并忽略
    if (err.code !== 'EEXIST') {
      throw new Error(`创建文件夹时出错：${err}`);
    }
  }
  // 写入删除文件
  const removeFile = path.join(args.out_dir, 'remove.txt');
  fs.writeFileSync(removeFile, deleteFile.join('\n'), 'utf-8');

  executor({
    toolDir: args.tool_dir,
    removeFile,
    allDatFile: args.dat_file,
    outDir: args.out_dir,
  });
})();