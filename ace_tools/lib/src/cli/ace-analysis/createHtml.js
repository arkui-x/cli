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
const process = require('process');
const { Platform, platform } = require('../ace-check/platform');
const {
  CHART_WIDTH_MODULE_BASE,
  CHART_WIDTH_MODULE_PER_ITEM,
  CHART_WIDTH_DTS,
  CHART_HEIGHT_BASE,
  CHART_HEIGHT_PER_ITEM,
  CHART_HEIGHT_MODULE,
  ECHARTS_CDN_URL,
  CHART_OUTPUT_FILENAME,
} = require('./constants');
const { safeModuleName } = require('./utils');

function sanitizeOption(option) {
  return JSON.stringify(option, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function createHtmlData(htmlString = '', jsString = '') {
  return { htmlStr: htmlString, jsStr: jsString };
}

function buildBarOption(title, subtext, categoryData, seriesData, horizontal) {
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    title: { text: title, subtext: subtext || '' },
  };

  if (horizontal) {
    option.xAxis = { type: 'value' };
    option.yAxis = { type: 'category', data: categoryData };
  } else {
    option.xAxis = { type: 'category', data: categoryData };
    option.yAxis = { type: 'value' };
  }

  option.series = [{
    data: seriesData,
    type: 'bar',
    label: { show: true, position: 'inside', formatter: '{c}' },
  }];

  return option;
}

function buildChartJsInitScript(elementId, optionStr, onClickHandler) {
  let script = `var chartDom = document.getElementById('${elementId}');
    var chart = echarts.init(chartDom);
    var option = ${optionStr};
    chart.setOption(option);`;
  if (onClickHandler) {
    script += onClickHandler;
  }
  return script;
}

function createAllModuleHtml(moduleApiList) {
  const keyArray = [];
  const apiNumberArray = [];
  let apiCount = 0;

  for (const key of moduleApiList.keys()) {
    keyArray.push(key);
    const count = moduleApiList.get(key).length;
    apiNumberArray.push(count);
    apiCount += count;
  }

  const option = buildBarOption(
    `模块不支持Api统计（共${apiCount}）`,
    '',
    keyArray,
    apiNumberArray,
    false
  );

  const optionStr = sanitizeOption(option);
  const clickHandler = `chart.on('click', function(params) {
    let targetElement = document.getElementById(\`\${params.name}dtsChart\`);
    targetElement.scrollIntoView();
  });`;
  const jsStr = buildChartJsInitScript('allModuleChart', optionStr, clickHandler);

  const width = CHART_WIDTH_MODULE_BASE + CHART_WIDTH_MODULE_PER_ITEM * keyArray.length;
  const htmlStr = `<div id="allModuleChart" style="width: ${width}px; height: ${CHART_HEIGHT_MODULE}px;"></div>`;

  return createHtmlData(htmlStr, jsStr);
}

function createAllDtsHtml(allDtsList) {
  const dtsFileArray = [];
  const dtsApiNumberArray = [];

  for (const key of allDtsList.keys()) {
    dtsFileArray.push(key);
    dtsApiNumberArray.push(allDtsList.get(key).length);
  }

  const option = buildBarOption('不支持Api文件分布', '', dtsFileArray, dtsApiNumberArray, true);
  const optionStr = sanitizeOption(option);
  const jsStr = buildChartJsInitScript('allApiChart', optionStr);
  const height = CHART_HEIGHT_BASE + CHART_HEIGHT_PER_ITEM * dtsFileArray.length;
  const htmlStr = `<div id="allApiChart" style="width: ${CHART_WIDTH_DTS}px; height: ${height}px;"></div>`;

  return createHtmlData(htmlStr, jsStr);
}

function groupApiByField(apiArray, field) {
  const map = new Map();
  for (const apiData of apiArray) {
    const key = apiData[field];
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(apiData.apiName);
  }
  return map;
}

function getModuleDtsMap(moduleApiArray) {
  return groupApiByField(moduleApiArray, 'dtsFile');
}

function getModuleSelfMap(moduleApiArray) {
  return groupApiByField(moduleApiArray, 'selfFile');
}

function createOneModuleDtsHtml(moduleDtsMap, moduleName) {
  const dtsFileArray = [];
  const dtsApiNumberArray = [];

  for (const key of moduleDtsMap.keys()) {
    dtsFileArray.push(key);
    dtsApiNumberArray.push(moduleDtsMap.get(key).length);
  }

  const option = buildBarOption(
    `模块${moduleName}不支持Api文件分布`,
    '分布在如下arkui-x接口文件中',
    dtsFileArray,
    dtsApiNumberArray,
    true
  );

  const optionStr = sanitizeOption(option);
  const htmlId = `${moduleName}dtsChart`;
  const jsStr = buildChartJsInitScript(htmlId, optionStr);
  const height = CHART_HEIGHT_BASE + CHART_HEIGHT_PER_ITEM * dtsFileArray.length;
  const htmlStr = `<div id="${htmlId}" style="width: ${CHART_WIDTH_DTS}px; height: ${height}px;"></div>`;

  return createHtmlData(htmlStr, jsStr);
}

function createOneModuleSelfHtml(moduleSelfMap, moduleName) {
  const selfFileArray = [];
  const selfApiNumberArray = [];

  for (const key of moduleSelfMap.keys()) {
    selfFileArray.push(key);
    selfApiNumberArray.push(moduleSelfMap.get(key).length);
  }

  const option = buildBarOption(
    '',
    '分布在如下自研开发文件中',
    selfFileArray,
    selfApiNumberArray,
    true
  );

  const optionStr = sanitizeOption(option);
  const htmlId = `${moduleName}selfChart`;
  const jsStr = buildChartJsInitScript(htmlId, optionStr);
  const height = CHART_HEIGHT_BASE + CHART_HEIGHT_PER_ITEM * selfFileArray.length;
  const htmlStr = `<div id="${htmlId}" style="width: ${CHART_WIDTH_DTS}px; height: ${height}px;"></div>`;

  return createHtmlData(htmlStr, jsStr);
}

function createOneModuleTableHtml(moduleApiArray, moduleName) {
  const safeName = safeModuleName(moduleName);
  const tableId = `${safeName}table`;
  const htmlStr = `<div id="${tableId}"></div>`;
  const dataStr = sanitizeOption(moduleApiArray);

  const jsStr = `let ${safeName}data = ${dataStr};
    let ${safeName}table = document.createElement('table');
    ${safeName}table.style.width = '80%';
    ${safeName}table.setAttribute('border', '1');
    ${safeName}table.setAttribute('cellpadding', '5');
    ${safeName}table.setAttribute('cellspacing', '0');
    let ${safeName}thead = ${safeName}table.createTHead();
    let ${safeName}row = ${safeName}thead.insertRow();
    let ${safeName}cell1 = ${safeName}row.insertCell(0);
    let ${safeName}cell2 = ${safeName}row.insertCell(1);
    let ${safeName}cell3 = ${safeName}row.insertCell(2);
    let ${safeName}cell4 = ${safeName}row.insertCell(3);
    ${safeName}cell1.innerHTML = "序号";
    ${safeName}cell2.innerHTML = "接口名";
    ${safeName}cell3.innerHTML = "api文件";
    ${safeName}cell4.innerHTML = "自研开发类文件";
    let ${safeName}tbody = document.createElement('tbody');
    ${safeName}data.forEach(rowData => {
        let row = document.createElement('tr');
        Object.values(rowData).forEach(cellText => {
            let td = document.createElement('td');
            td.textContent = cellText;
            row.appendChild(td);
        });
        ${safeName}tbody.appendChild(row);
    });
    ${safeName}table.appendChild(${safeName}tbody);
    document.getElementById('${tableId}').appendChild(${safeName}table);`;

  return createHtmlData(htmlStr, jsStr);
}

function createEveryModuleHtml(moduleApiList) {
  let everyModuleHtmlStr = '';
  let everyModuleJsStr = '';

  for (const moduleName of moduleApiList.keys()) {
    const moduleApiArray = moduleApiList.get(moduleName);
    const dtsMap = getModuleDtsMap(moduleApiArray);
    const selfMap = getModuleSelfMap(moduleApiArray);

    const dtsHtmlData = createOneModuleDtsHtml(dtsMap, moduleName);
    const selfHtmlData = createOneModuleSelfHtml(selfMap, moduleName);
    const tableHtmlData = createOneModuleTableHtml(moduleApiArray, moduleName);

    everyModuleHtmlStr += `
      ${dtsHtmlData.htmlStr}
      ${selfHtmlData.htmlStr}
      ${tableHtmlData.htmlStr}
      <div style="margin-top: 40px; margin-bottom: 40px;"></div>`;

    everyModuleJsStr += `
      ${dtsHtmlData.jsStr}
      ${selfHtmlData.jsStr}
      ${tableHtmlData.jsStr}`;
  }

  return createHtmlData(everyModuleHtmlStr, everyModuleJsStr);
}

function buildHtmlContent(allModuleHtml, allDtsHtml, everyModuleHtml) {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>ECharts 图表</title>
    <script src="${ECHARTS_CDN_URL}"></script>
  </head>
  <body>
    ${allModuleHtml.htmlStr}
    ${allDtsHtml.htmlStr}
    ${everyModuleHtml.htmlStr}
    <script type="text/javascript">
      ${allModuleHtml.jsStr}
      ${allDtsHtml.jsStr}
      ${everyModuleHtml.jsStr}
    </script>
  </body>
</html>`;
}

function createHtml(allDtsList, moduleApiList) {
  const allModuleHtml = createAllModuleHtml(moduleApiList);
  const allDtsHtml = createAllDtsHtml(allDtsList);
  const everyModuleHtml = createEveryModuleHtml(moduleApiList);
  const htmlContent = buildHtmlContent(allModuleHtml, allDtsHtml, everyModuleHtml);

  fs.writeFileSync(`./${CHART_OUTPUT_FILENAME}`, htmlContent, 'utf-8');

  const nowPath = process.cwd();
  const separator = (platform === Platform.Windows) ? '\\' : '/';
  const chartHtmlPath = `${nowPath}${separator}${CHART_OUTPUT_FILENAME}`;
  console.log(`Analysis success! Please view ${CHART_OUTPUT_FILENAME}(${chartHtmlPath})`);
}

module.exports = {
  createHtml,
  createHtmlData,
  buildBarOption,
  buildChartJsInitScript,
  buildHtmlContent,
  sanitizeOption,
  createAllModuleHtml,
  createAllDtsHtml,
  createEveryModuleHtml,
  createOneModuleDtsHtml,
  createOneModuleSelfHtml,
  createOneModuleTableHtml,
  groupApiByField,
  getModuleDtsMap,
  getModuleSelfMap,
};
