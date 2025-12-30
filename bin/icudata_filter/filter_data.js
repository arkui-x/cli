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

const exec = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

class IO {
    constructor(srcDir) {
        this.srcDir = srcDir;
    }

    readLocaleDeps(tree) {
        return this.readJson(`${tree}/LOCALE_DEPS.json`);
    }

    readJson(filename) {
        const filepath = path.join(this.srcDir, filename);
        const data = fs.readFileSync(filepath, { encoding: 'utf-8' });
        return JSON.parse(data);
    }
}

class Filter {
    static createFromJson(jsonData, io) {
        if (!io) {
            throw new Error('io must be provided');
        }
        let filterType = jsonData.filterType || 'file-stem';
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
                console.error(`Error: Unknown filterType option: ${filterType}`);
                return null;
        }
    }

    filter(request) {
        const output = [];
        for (const file of request.inputFiles) {
            if (this.match(file)) {
                output.push(file);
            }
        }
        request.inputFiles = output;
        return request;
    }

    static fileToFileStem(filename) {
        const start = filename.lastIndexOf('/');
        const limit = filename.lastIndexOf('.');
        return filename.substring(start + 1, limit);
    }

    static FileToSubdir(filename) {
        const limit = filename.lastIndexOf('/');
        if (limit === -1) {
            return null;
        }
        return filename.substring(0, limit);
    }

    match(file) {
        throw new Error('Abstract method: must be implemented by subclass');
    }
}

class InclusionFilter extends Filter {
    match(file) {
        return true;
    }
}

class ExclusionFilter extends Filter {
    match(file) {
        return false;
    }
}

class IncludeExcludeFilter extends Filter {
    constructor(jsonData) {
        super();
        if (jsonData.whitelist !== undefined) {
            this.isIncludelist = true;
            this.includelist = jsonData.whitelist;
        } else if (jsonData.includelist !== undefined) {
            this.isIncludelist = true;
            this.includelist = jsonData.includelist;
        } else if (jsonData.blacklist !== undefined) {
            this.isIncludelist = false;
            this.excludelist = jsonData.blacklist;
        } else if (jsonData.excludelist !== undefined) {
            this.isIncludelist = false;
            this.excludelist = jsonData.excludelist;
        } else {
            throw new Error(`Need either includelist or excludelist: ${JSON.stringify(jsonData)}`);
        }
    }

    match(file) {
        const fileStem = Filter.fileToFileStem(file);
        return this.ShouldInclude(fileStem);
    }

    ShouldInclude(fileStem) {
        throw new Error('Abstract method: must be implemented by subclass');
    }
}

class FileStemFilter extends IncludeExcludeFilter {
    ShouldInclude(fileStem) {
        if (this.isIncludelist) {
            return this.includelist.includes(fileStem);
        } else {
            return !this.excludelist.includes(fileStem);
        }
    }
}

class LanguageFilter extends IncludeExcludeFilter {
    ShouldInclude(fileStem) {
        const language = fileStem.split('_')[0];
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

class RegexFilter extends IncludeExcludeFilter {
    constructor(jsonData) {
        super(jsonData);
        if (this.isIncludelist) {
            this.includelist = this.includelist.map(pat => new RegExp(pat));
        } else {
            this.excludelist = this.excludelist.map(pat => new RegExp(pat));
        }
    }

    ShouldInclude(fileStem) {
        if (this.isIncludelist) {
            return this.includelist.some(pattern => {
                const match = pattern.exec(fileStem);
                return match && match.index === 0;
            });
        } else {
            return !this.excludelist.some(pattern => {
                const match = pattern.exec(fileStem);
                return match && match.index === 0;
            });
        }
    }
}

class UnionFilter extends Filter {
    constructor(jsonData, io) {
        super();
        this.subFilters = jsonData.unionOf.map(filterJson =>
            Filter.createFromJson(filterJson, io)
        );
    }

    match(file) {
        return this.subFilters.some(filter => filter.match(file));
    }
}

const ALL_TREES = [
    'locales', 'curr', 'lang', 'region', 'zone', 'unit', 'coll', 'brkitr', 'rbnf'
];
const LANGUAGE_SCRIPT_REGEX = /^([a-z]{2,3})_[A-Z][a-z]{3}$/;
const LANGUAGE_ONLY_REGEX = /^[a-z]{2,3}$/;

class LocaleFilter extends Filter {
    constructor(jsonData, io) {
        super();
        this.localesRequested = jsonData.whitelist || jsonData.includelist;
        if (!this.localesRequested) {
            throw new Error('You must have an includelist in a locale filter');
        }
        this.includeChildren = jsonData.includeChildren !== false;
        this.includeScripts = jsonData.includeScripts || false;
        this.dependencyDataByTree = {};
        for (const tree of ALL_TREES) {
            this.dependencyDataByTree[tree] = io.readLocaleDeps(tree);
        }
        this.requiredLocalesByTree = {};
        for (const tree of ALL_TREES) {
            const set = new Set();
            for (const locale of this.localesRequired(tree)) {
                set.add(locale);
            }
            this.requiredLocalesByTree[tree] = set;
        }
    }

    *localesRequired(tree) {
        for (const locale of this.localesRequested) {
            let current = locale;
            while (current !== null && current !== undefined) {
                yield current;
                current = this.getParentLocale(current, tree);
            }
        }
    }

    getParentLocale(locale, tree) {
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
        const i = locale.lastIndexOf('_');
        if (i < 0) {
            if (locale !== 'root') {
                throw new Error(`Invalid locale: ${tree}/${locale}`);
            }
            return null;
        }
        return locale.substring(0, i);
    }

    match(file) {
        const tree = Filter.FileToSubdir(file);
        if (tree === null) {
            throw new Error('File must be in a subdirectory');
        }
        const locale = Filter.fileToFileStem(file);
        const requiredSet = this.requiredLocalesByTree[tree];
        if (requiredSet && requiredSet.has(locale)) {
            return true;
        }
        return this.matchRecursive(locale, tree);
    }

    matchRecursive(locale, tree) {
        if (locale === null || locale === undefined) {
            return false;
        }
        if (this.localesRequested.includes(locale)) {
            return true;
        }
        if (this.includeScripts) {
            const match = LANGUAGE_SCRIPT_REGEX.exec(locale);
            if (match && this.matchRecursive(match[1], tree)) {
                return true;
            }
        }
        if (this.includeChildren) {
            const parent = this.getParentLocale(locale, tree);
            if (this.matchRecursive(parent, tree)) {
                return true;
            }
        }
        return false;
    }
}

function applyFilters(requests, config, io) {
    return applyFileFilters(requests, config, io);
}

function applyFileFilters(oldRequests, config, io) {
    const filters = preprocessFileFilters(oldRequests, config, io);
    return oldRequests.map(request => {
        const category = request.category;
        if (filters[category]) {
            return filters[category].filter(request);
        }
        return request;
    });
}

function preprocessFileFilters(requests, config, io) {
    const allCategories = [...new Set(requests.map(req => req.category))].sort();
    const jsonData = config.filtersJsonData;
    const filters = {};
    const defaultFilterJson = config.strategy === 'additive' ? 'exclude' : 'include';
    for (const category of allCategories) {
        let filterJson = defaultFilterJson;
        if (jsonData.featureFilters && category in jsonData.featureFilters) {
            filterJson = jsonData.featureFilters[category];
        }
        if (filterJson === 'include' && jsonData.localeFilter && category.endsWith('_tree')) {
            filterJson = jsonData.localeFilter;
        }
        if (filterJson === 'exclude') {
            filters[category] = new ExclusionFilter();
        } else if (filterJson !== 'include') {
            const filter = Filter.createFromJson(filterJson, io);
            if (filter) {
                filters[category] = filter;
            }
        }
    }
    if (jsonData.featureFilters) {
        for (const category in jsonData.featureFilters) {
            if (!allCategories.includes(category)) {
                console.error(`Warning: category ${category} is not known`);
            }
        }
    }
    return filters;
}

function getAllResList(command) {
    const result = exec.execSync(command, { encoding: 'utf-8' });
    let resultList = [];
    if (os.type() !== 'Windows_NT') {
        resultList = result.split('\n');
    } else {
        resultList = result.split('\r\n');
    }
    return resultList.filter(res => res.trim().length > 0);
}

function getTreeAndName(filename) {
    const start = filename.lastIndexOf('/');
    const end = filename.lastIndexOf('.');
    const tree = start === -1 ? '' : filename.substring(0, start);
    const name = filename.substring(start + 1, end);
    return [tree, name];
}

function generate(config, resList) {
    const requests = [];

    if (config.strategy === 'subtractive') {
        if (!config.filtersJsonData.resourceFilters) {
            config.filtersJsonData.resourceFilters = [];
        }
        const omitCharsetCollations = {
            'categories': ['coll_tree'],
            'rules': ['-/collations/big5han', '-/collations/gb2312han']
        };
        config.filtersJsonData.resourceFilters.unshift(omitCharsetCollations);
    }

    requests.push(...generateCnvalias(resList));
    requests.push(...generateUlayout(resList));
    requests.push(...generateUemoji(resList));
    requests.push(...generateConfusables(resList));
    requests.push(...generateConversionMappings(resList));
    requests.push(...generateBrkitrBrk(resList));
    requests.push(...generateBrkitrLstm(resList));
    requests.push(...generateBrkitrAdaboost(resList));
    requests.push(...generateStringprep(resList));
    requests.push(...generateBrkitrDictionaries(resList));
    requests.push(...generateNormalization(resList));
    requests.push(...generateCollUcadata(resList));
    requests.push(...generateFullUnicoreData(resList));
    requests.push(...generateUnames(resList));
    requests.push(...generateMisc(resList));
    requests.push(...generateCurrSupplemental(resList));
    requests.push(...generateZoneSupplemental(resList));
    requests.push(...generateTranslit(resList));

    // Res Tree Files
    requests.push(...generateTree('curr', 'curr', resList));
    requests.push(...generateTree('lang', 'lang', resList));
    requests.push(...generateTree('region', 'region', resList));
    requests.push(...generateTree('zone', 'zone', resList));
    requests.push(...generateTree('unit', 'unit', resList));
    requests.push(...generateTree('coll', 'coll', resList));
    requests.push(...generateTree('brkitr', 'brkitr', resList));
    requests.push(...generateTree('rbnf', 'rbnf', resList));
    requests.push(...generateTree('locales', null, resList));

    return requests;
}

// All generate_* functions follow the same pattern:
// 1. Check for specific resources in resList
// 2. Remove found resources from resList
// 3. Return request objects
// Below are the JavaScript implementations:

function generateCnvalias(resList) {
    if (!resList.includes('cnvalias.icu')) {
        return [];
    }
    resList.splice(resList.indexOf('cnvalias.icu'), 1);
    return [{
        category: 'cnvalias',
        inputFiles: ['mappings/convrtrs.txt'],
        outputFiles: ['cnvalias.icu']
    }];
}

function generateConfusables(resList) {
    if (!resList.includes('confusables.cfu')) {
        return [];
    }
    resList.splice(resList.indexOf('confusables.cfu'), 1);
    return [{
        category: 'confusables',
        inputFiles: ['unidata/confusables.txt', 'unidata/confusablesWholeScript.txt'],
        outputFiles: ['confusables.cfu']
    }];
}

function generateConversionMappings(resList) {
    const outputFiles = resList.filter(res => /.*\.cnv$/.test(res));
    if (outputFiles.length === 0) {
        return [];
    }

    outputFiles.forEach(item => {
        resList.splice(resList.indexOf(item), 1);
    });

    const inputFiles = outputFiles.map(v => `mappings/${v.substring(0, v.length - 4)}.ucm`);
    return [{
        category: 'conversion_mappings',
        inputFiles,
        outputFiles
    }];
}

function generateBrkitrBrk(resList) {
    const outputFiles = resList.filter(res => /brkitr\/.*\.brk$/.test(res));
    if (outputFiles.length === 0) {
        return [];
    }

    outputFiles.forEach(item => {
        resList.splice(resList.indexOf(item), 1);
    });

    const inputFiles = outputFiles.map(v => `brkitr/rules/${v.substring(7, v.length - 4)}.txt`);
    return [{
        category: 'brkitr_rules',
        inputFiles,
        outputFiles
    }];
}

function generateStringprep(resList) {
    const outputFiles = resList.filter(res => /.*\.spp$/.test(res));
    if (outputFiles.length === 0) {
        return [];
    }

    outputFiles.forEach(item => {
        resList.splice(resList.indexOf(item), 1);
    });

    const inputFiles = outputFiles.map(v => `sprep/${v.substring(0, v.length - 4)}.txt`);
    return [{
        category: 'stringprep',
        inputFiles,
        outputFiles
    }];
}

function generateBrkitrDictionaries(resList) {
    const outputFiles = resList.filter(res => /brkitr\/.*\.dict$/.test(res));
    if (outputFiles.length === 0) {
        return [];
    }

    outputFiles.forEach(item => {
        resList.splice(resList.indexOf(item), 1);
    });

    const inputFiles = outputFiles.map(v => `brkitr/dictionaries/${v.substring(7, v.length - 5)}.txt`);
    return [{
        category: 'brkitr_dictionaries',
        inputFiles,
        outputFiles
    }];
}

function generateNormalization(resList) {
    const outputFiles = resList.filter(res => /.*\.nrm$/.test(res) && res !== 'nfc.nrm');
    if (outputFiles.length === 0) {
        return [];
    }

    outputFiles.forEach(item => {
        resList.splice(resList.indexOf(item), 1);
    });

    const inputFiles = outputFiles.map(v => `in/${v.substring(0, v.length - 4)}.nrm`);
    return [{
        category: 'normalization',
        inputFiles,
        outputFiles
    }];
}

function generateCollUcadata(resList) {
    if (!resList.includes('coll/ucadata.icu')) {
        return [];
    }
    resList.splice(resList.indexOf('coll/ucadata.icu'), 1);
    return [{
        category: 'coll_ucadata',
        inputFiles: ['in/coll/ucadata.icu'],
        outputFiles: ['coll/ucadata.icu']
    }];
}

function generateFullUnicoreData(resList) {
    const basenames = [
        'pnames.icu', 'uprops.icu', 'ucase.icu',
        'ubidi.icu', 'nfc.nrm'
    ];
    const outputFiles = resList.filter(res => basenames.includes(res));
    if (outputFiles.length === 0) {
        return [];
    }

    outputFiles.forEach(item => {
        resList.splice(resList.indexOf(item), 1);
    });

    const inputFiles = outputFiles.map(v => `in/${v}`);
    return [{
        category: 'unicore',
        inputFiles,
        outputFiles
    }];
}

function generateUnames(resList) {
    if (!resList.includes('unames.icu')) {
        return [];
    }
    resList.splice(resList.indexOf('unames.icu'), 1);
    return [{
        category: 'unames',
        inputFiles: ['in/unames.icu'],
        outputFiles: ['unames.icu']
    }];
}

function generateUlayout(resList) {
    if (!resList.includes('ulayout.icu')) {
        return [];
    }
    resList.splice(resList.indexOf('ulayout.icu'), 1);
    return [{
        category: 'ulayout',
        inputFiles: ['in/ulayout.icu'],
        outputFiles: ['ulayout.icu']
    }];
}

function generateUemoji(resList) {
    if (!resList.includes('uemoji.icu')) {
        return [];
    }
    resList.splice(resList.indexOf('uemoji.icu'), 1);
    return [{
        category: 'uemoji',
        inputFiles: ['in/uemoji.icu'],
        outputFiles: ['uemoji.icu']
    }];
}

function generateMisc(resList) {
    const basenames = [
        'currencyNumericCodes.res', 'genderList.res', 'icuver.res',
        'langInfo.res', 'metaZones.res', 'pluralRanges.res',
        'supplementalData.res', 'units.res', 'zoneinfo64.res',
        'dayPeriods.res', 'grammaticalFeatures.res', 'icustd.res',
        'keyTypeData.res', 'metadata.res', 'numberingSystems.res',
        'plurals.res', 'timezoneTypes.res', 'windowsZones.res', 'likelySubtags.res'
    ];
    const outputFiles = resList.filter(res => basenames.includes(res));
    if (outputFiles.length === 0) {
        return [];
    }

    outputFiles.forEach(item => {
        resList.splice(resList.indexOf(item), 1);
    });

    const inputFiles = outputFiles.map(v => `misc/${v.substring(0, v.length - 4)}.txt`);
    return [{
        category: 'misc',
        inputFiles,
        outputFiles
    }];
}

function generateCurrSupplemental(resList) {
    if (!resList.includes('curr/supplementalData.res')) {
        return [];
    }
    resList.splice(resList.indexOf('curr/supplementalData.res'), 1);
    return [{
        category: 'curr_supplemental',
        inputFiles: ['curr/supplementalData.txt'],
        outputFiles: ['curr/supplementalData.res']
    }];
}

function generateZoneSupplemental(resList) {
    if (!resList.includes('zone/tzdbNames.res')) {
        return [];
    }
    resList.splice(resList.indexOf('zone/tzdbNames.res'), 1);
    return [{
        category: 'zone_supplemental',
        inputFiles: ['zone/tzdbNames.txt'],
        outputFiles: ['zone/tzdbNames.res']
    }];
}

function generateTranslit(resList) {
    const basenames = [
        'translit/root.res',
        'translit/en.res',
        'translit/el.res'
    ];
    const outputFiles = resList.filter(res => basenames.includes(res));
    if (outputFiles.length === 0) {
        return [];
    }

    outputFiles.forEach(item => {
        resList.splice(resList.indexOf(item), 1);
    });

    const inputFiles = outputFiles.map(v => `translit/${v.substring(9, v.length - 4)}.txt`);
    return [{
        category: 'translit',
        inputFiles,
        outputFiles
    }];
}

function generateBrkitrLstm(resList) {
    const outputFiles = resList.filter(res =>
        /brkitr\/.*\.res$/.test(res) &&
        res !== 'brkitr/jaml.res' &&
        res.length > 22
    );
    if (outputFiles.length === 0) {
        return [];
    }

    outputFiles.forEach(item => {
        resList.splice(resList.indexOf(item), 1);
    });

    const inputFiles = outputFiles.map(v => `brkitr/lstm/${v.substring(7, v.length - 4)}.txt`);
    return [{
        category: 'brkitr_lstm',
        inputFiles,
        outputFiles
    }];
}

function generateBrkitrAdaboost(resList) {
    if (!resList.includes('brkitr/jaml.res')) {
        return [];
    }
    resList.splice(resList.indexOf('brkitr/jaml.res'), 1);
    return [{
        category: 'brkitr_adaboost',
        inputFiles: ['brkitr/adaboost/jaml.txt'],
        outputFiles: ['brkitr/jaml.res']
    }];
}

function generateTree(subDir, outSubDir, resList) {
    const requests = [];
    const category = `${subDir}_tree`;
    const outPrefix = outSubDir ? `${outSubDir}/` : '';

    // Create regex pattern for matching files
    const pattern = new RegExp(`^${outPrefix.replace(/\//g, '\\/')}.*\\.res$`);

    const outputFiles = resList.filter(res =>
        pattern.test(res) &&
        res !== `${outPrefix}pool.res` &&
        res !== `${outPrefix}res_index.res`
    );

    outputFiles.forEach(item => {
        resList.splice(resList.indexOf(item), 1);
    });

    const inputFiles = outputFiles.map(v =>
        `${subDir}/${v.substring(outPrefix.length, v.length - 4)}.txt`
    );

    // Remove pool and index files if present
    const poolRes = `${outPrefix}pool.res`;
    const indexRes = `${outPrefix}res_index.res`;
    if (resList.includes(poolRes)) {
        resList.splice(resList.indexOf(poolRes), 1);
    }
    if (resList.includes(indexRes)) {
        resList.splice(resList.indexOf(indexRes), 1);
    }

    if (outputFiles.length > 0) {
        requests.push({
            category,
            inputFiles,
            outputFiles
        });
    }

    return requests;
}

class Config {
    constructor(filtersJsonData) {
        this.filtersJsonData = filtersJsonData;
        this.strategy = 'subtractive';
        if ('strategy' in this.filtersJsonData) {
            this.strategy = this.filtersJsonData.strategy;
        }
    }
}

function filterRequest(requests, config, resDir) {
    const io = new IO(resDir);
    let filteredRequests = applyFilters(requests, config, io);

    filteredRequests = filteredRequests.map(request => {
        const basenames = new Set();
        request.inputFiles.forEach(file => {
            const [tree, filename] = getTreeAndName(file);
            basenames.add(filename);
        });

        const newOutputFiles = request.outputFiles.filter(file => {
            const [tree, filename] = getTreeAndName(file);
            return !basenames.has(filename);
        });

        return {
            ...request,
            outputFiles: newOutputFiles
        };
    });

    return filteredRequests;
}

function parseArguments() {
    const args = process.argv.slice(2);
    const configs = {};
    let i = 0;

    while (i < args.length) {
        if (args[i].startsWith('--')) {
            const key = args[i].substring(2);
            const value = i + 1 < args.length ? args[i + 1] : '';
            configs[key] = value;
            i += 2;
        } else {
            i++;
        }
    }

    // Ensure required keys exist
    const keys = ['res_dir', 'dat_file', 'filter', 'module', 'tool_dir', 'out_dir'];
    keys.forEach(key => {
        if (!(key in configs)) {
            configs[key] = null;
        }
    });

    return configs;
}

function findIcuDataFile(directory) {
    if (!directory) {
        directory = '.';
    }
    const files = fs.readdirSync(directory);
    const pattern = /^icudt(\d+)l\.dat$/i;

    for (const filename of files) {
        if (pattern.test(filename)) {
            const filePath = path.join(directory, filename);
            if (fs.statSync(filePath).isFile()) {
                return path.resolve(filePath);
            }
        }
    }
    return null;
}

function getValidLocaleList(localeStr) {
    const locales = JSON.parse(localeStr);
    const result = [];

    for (const locale of locales) {
        const index = locale.indexOf('_');
        const localeStr = index !== -1 ? locale.substring(0, index) : locale;

        if (LANGUAGE_ONLY_REGEX.test(localeStr)) {
            result.push(locale);
        } else {
            result.push('root');
        }
    }
    return JSON.stringify(result);
}

function getFilterJsonData(filterFile, resDir, module) {
    if (filterFile !== null) {
        let filePath = path.join(resDir, 'filter_pattern.json');
        const filterData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        let localeListStr = fs.readFileSync(filterFile, 'utf-8').trim();
        const localeList = JSON.parse(getValidLocaleList(localeListStr));
        if (localeList.length === 0) {
            localeList.push('root');
        }
        let filterString = JSON.stringify(filterData);
        filterString = filterString.replace(/"replace locale"/g, JSON.stringify(localeList));
        return JSON.parse(filterString);
    }

    if (module === null) {
        let filePath = path.join(resDir, 'default_filter.json');
        const filterData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return filterData;
    }

    if (module !== 'i18n' && module !== 'intl' && module !== 'both') {
        throw new Error(`parameter module is error value`);
    }
    return null;
}

const icuVersion = 74;

function getIcuVersion(datFile) {
    const preciseMatch = datFile.match(/icudt(\d+)l\.dat/);
    const preciseNumber = preciseMatch ? parseInt(preciseMatch[1], 10) : null;
    return preciseNumber;
}

// Main execution
async function main() {
    const args = parseArguments();

    const resDir = args.res_dir;
    const datFileDir = path.dirname(args.dat_file);
    const datFile = findIcuDataFile(datFileDir);

    if (!datFile) {
        throw new Error(`ICU data file not found`);
    }

    const datFileName = path.basename(datFile);
    let toolDir = path.join(args.tool_dir, 'icupkg');
    const outDir = args.out_dir;
    const removeFile = path.join(outDir, 'remove.txt');
    const outFile = path.join(outDir, datFileName);

    const nowIcuVersion = getIcuVersion(datFileName);
    if (nowIcuVersion > icuVersion) {
        throw new Error(`Error: use ${icuVersion} tools to crop ${nowIcuVersion} data`);
    }

    // Create output directory
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    const filterJsonData = getFilterJsonData(args.filter, resDir, args.module);
    if (filterJsonData === null) {
        fs.copyFileSync(datFile, outFile);
        return;
    }

    if (os.type() !== 'Windows_NT') {
        fs.chmodSync(toolDir, 0o755);
    } else {
        toolDir = path.join(args.tool_dir, 'icupkg.exe');
    }

    const resList = getAllResList(`${toolDir} -l ${datFile}`);
    const config = new Config(filterJsonData);

    let requests = generate(config, resList);
    let requestsNew = filterRequest(requests, config, resDir);

    // Collect all output files for removal
    let removeList = [];
    requestsNew.forEach(request => {
        removeList.push(...request.outputFiles);
    });

    // Write removal list
    fs.writeFileSync(removeFile, removeList.join('\n'), 'utf-8');

    // Execute icupkg command
    try {
        exec.execSync(`${toolDir} -r ${removeFile} ${datFile} ${outFile}`, { stdio: 'inherit' });
    } catch (error) {
        throw new Error(`Error executing icupkg: ${error.message}`);
    }
}

if (require.main === module) {
    main().catch(err => {
        console.error(`[ICUData] gen icud data file failed: ${err}`);
        process.exit(1);
    });
}
