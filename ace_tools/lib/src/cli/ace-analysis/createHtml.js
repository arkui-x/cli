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
const API_BASE_HEIGHT = 200;
const API_SHOW_HEIGHT = 66;

function createAllModuleHtml(moduleApiList) {
    let apiNumberArray = [];
    let keyArray = [];
    let apiCount = 0;
    for (let key of moduleApiList.keys()) {
        keyArray.push(key);
        let notSupportApiArray = moduleApiList.get(key);
        apiNumberArray.push(notSupportApiArray.length);
        apiCount = apiCount + notSupportApiArray.length;
    }
    let option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        title: {
          text: `模块不支持Api统计（共${apiCount}）`
        },
        xAxis: {
          type: 'category',
          data: keyArray
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          data: apiNumberArray,
          type: 'bar',
          label: {
            show: true,
            position: 'inside',
            formatter: '{c}'
          }
        }]
    };
    let optionStr = changeOption(option);
    let allModuleJsStr = createAllModuleJsStr(optionStr);
    let allModuleHtmlData = initHtmlData();
    let moduleBaseWidth = 200;
    let moduleShowWidth = 145;
    let allModuleWidth = moduleBaseWidth + moduleShowWidth * keyArray.length;
    let allModuleHtmlStr = `<div id="allModuleChart" style="width: ${allModuleWidth}px; height: 400px;"></div>`;
    allModuleHtmlData.htmlStr = allModuleHtmlStr;
    allModuleHtmlData.jsStr = allModuleJsStr;
    return allModuleHtmlData;
}

function createAllModuleJsStr(optionStr) {
    let allModuleJsStr = `var chartDom = document.getElementById('allModuleChart');
          var chart = echarts.init(chartDom);
          var option = ${optionStr};
          chart.setOption(option);
          chart.on('click', function(params) {
              let targetElement = document.getElementById(\`\${params.name}dtsChart\`);
              targetElement.scrollIntoView();
          });`;
    return allModuleJsStr;
}

function createAllDtsHtml(alldtsList) {
    let dtsApiNumberArray = [];
    let dtsFileArray = [];
    for (let key of alldtsList.keys()) {
        dtsFileArray.push(key);
        let notSupportApiArray = alldtsList.get(key);
        dtsApiNumberArray.push(notSupportApiArray.length);
    }
    let option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        title: {
          text: '不支持Api文件分布'
        },
        xAxis: {
          type: 'value'
        },
        yAxis: {
            type: 'category',
            data: dtsFileArray
        },
        series: [{
          data: dtsApiNumberArray,
          type: 'bar',
          label: {
            show: true,
            position: 'inside',
            formatter: '{c}'
          }
        }]
    };
    let optionStr = changeOption(option);
    let allApiJsStr = `var chartDom = document.getElementById('allApiChart');
          var chart = echarts.init(chartDom);
          var option = ${optionStr};
          chart.setOption(option);`;
    let allDtsHtmlData = initHtmlData();
    let allApiHeight = API_BASE_HEIGHT + API_SHOW_HEIGHT * dtsFileArray.length;
    let allApiHtmlStr = `<div id="allApiChart" style="width: 1400px; height: ${allApiHeight}px;"></div>`;
    allDtsHtmlData.htmlStr = allApiHtmlStr;
    allDtsHtmlData.jsStr = allApiJsStr;
    return allDtsHtmlData;
}

function getModuleDtsMap(nowModuleApiArray) {
    let nowModuleDtsMap = new Map();
    for (let i = 0; i < nowModuleApiArray.length; i++) {
        let nowApiData = nowModuleApiArray[i];
        if (!nowModuleDtsMap.has(nowApiData.dtsFile)) {
            nowModuleDtsMap.set(nowApiData.dtsFile, []);
        }
        let nowDtsArray = nowModuleDtsMap.get(nowApiData.dtsFile);
        nowDtsArray.push(nowApiData.apiName);
    }
    return nowModuleDtsMap;
}

function getModuleSelfMap(nowModuleApiArray) {
    let nowModuleSelfMap = new Map();
    for (let i = 0; i < nowModuleApiArray.length; i++) {
        let nowApiData = nowModuleApiArray[i];
        if (!nowModuleSelfMap.has(nowApiData.selfFile)) {
            nowModuleSelfMap.set(nowApiData.selfFile, []);
        }
        let nowSelfArray = nowModuleSelfMap.get(nowApiData.selfFile);
        nowSelfArray.push(nowApiData.apiName);
    }
    return nowModuleSelfMap;
}

function getOneModuleDtsHtmlData(nowModuleDtsMap, nowModuleName) {
    let dtsApiNumberArray = [];
    let dtsFileArray = [];
    for (let key of nowModuleDtsMap.keys()) {
        dtsFileArray.push(key);
        let nowApiArray = nowModuleDtsMap.get(key);
        dtsApiNumberArray.push(nowApiArray.length);
    }
    let option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        title: {
          text: `模块${nowModuleName}不支持Api文件分布`,
          subtext: `分布在如下arkui-x接口文件中`
        },
        xAxis: {
          type: 'value'
        },
        yAxis: {
            type: 'category',
            data: dtsFileArray
        },
        series: [{
          data: dtsApiNumberArray,
          type: 'bar',
          label: {
            show: true,
            position: 'inside',
            formatter: '{c}'
          }
        }]
    };
    let optionStr = changeOption(option);
    let htmlId = `${nowModuleName}dtsChart`;
    let allApiJsStr = `var chartDom = document.getElementById('${htmlId}');
          var chart = echarts.init(chartDom);
          var option = ${optionStr};
          chart.setOption(option);`;
    let oneModuleDtsHtmlData = initHtmlData();
    let allApiHeight = API_BASE_HEIGHT + API_SHOW_HEIGHT * dtsFileArray.length;
    let allApiHtmlStr = `<div id="${htmlId}" style="width: 1400px; height: ${allApiHeight}px;"></div>`;
    oneModuleDtsHtmlData.htmlStr = allApiHtmlStr;
    oneModuleDtsHtmlData.jsStr = allApiJsStr;
    return oneModuleDtsHtmlData;
}

function getOneModuleSelfHtmlData(nowModuleSelfMap, nowModuleName) {
    let selfApiNumberArray = [];
    let selfFileArray = [];
    for (let key of nowModuleSelfMap.keys()) {
        selfFileArray.push(key);
        let nowApiArray = nowModuleSelfMap.get(key);
        selfApiNumberArray.push(nowApiArray.length);
    }
    let option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        title: {
          text: ``,
          subtext: `分布在如下自研开发文件中`
        },
        xAxis: {
          type: 'value'
        },
        yAxis: {
            type: 'category',
            data: selfFileArray
        },
        series: [{
          data: selfApiNumberArray,
          type: 'bar',
          label: {
            show: true,
            position: 'inside',
            formatter: '{c}'
          }
        }]
    };
    let optionStr = changeOption(option);
    let htmlId = `${nowModuleName}selfChart`;
    let allApiJsStr = `var chartDom = document.getElementById('${htmlId}');
          var chart = echarts.init(chartDom);
          var option = ${optionStr};
          chart.setOption(option);`;
    let oneModuleSelfHtmlData = initHtmlData();
    let allApiHeight = API_BASE_HEIGHT + API_SHOW_HEIGHT * selfFileArray.length;
    let allApiHtmlStr = `<div id="${htmlId}" style="width: 1400px; height: ${allApiHeight}px;"></div>`;
    oneModuleSelfHtmlData.htmlStr = allApiHtmlStr;
    oneModuleSelfHtmlData.jsStr = allApiJsStr;
    return oneModuleSelfHtmlData;
}

function getOneModuleTableHtmlData(nowModuleApiArray, nowModuleNameIn) {
    let nowModuleName = nowModuleNameIn.replace(/-/g, '_');
    let tableId = `${nowModuleName}table`;
    let tableHtmlStr = `<div id="${tableId}"></div>`;
    let dataStr = changeOption(nowModuleApiArray);
    let tableJsStr = `let ${nowModuleName}data = ${dataStr};
      let ${nowModuleName}table = document.createElement('table');
      ${nowModuleName}table.style.width = '80%';
      ${nowModuleName}table.setAttribute('border', '1');
      ${nowModuleName}table.setAttribute('cellpadding', '5');
      ${nowModuleName}table.setAttribute('cellspacing', '0');
      let ${nowModuleName}thead = ${nowModuleName}table .createTHead();
      let ${nowModuleName}row = ${nowModuleName}thead.insertRow();
      let ${nowModuleName}cell1 = ${nowModuleName}row.insertCell(0);
      let ${nowModuleName}cell2 = ${nowModuleName}row.insertCell(1);
      let ${nowModuleName}cell3 = ${nowModuleName}row.insertCell(2);
      let ${nowModuleName}cell4 = ${nowModuleName}row.insertCell(3);
      ${nowModuleName}cell1.innerHTML = "序号";
      ${nowModuleName}cell2.innerHTML = "接口名";
      ${nowModuleName}cell3.innerHTML = "api文件";
      ${nowModuleName}cell4.innerHTML = "自研开发类文件";
      let ${nowModuleName}tbody = document.createElement('tbody');
      ${nowModuleName}data.forEach(rowData => {
          let row = document.createElement('tr');
          Object.values(rowData).forEach(cellText => {
              let td = document.createElement('td');
              td.textContent = cellText;
              row.appendChild(td);
          });
          ${nowModuleName}tbody.appendChild(row);
      });
      ${nowModuleName}table.appendChild(${nowModuleName}tbody);
      document.getElementById('${tableId}').appendChild(${nowModuleName}table);`;
      let tableHtmlData = initHtmlData();
      tableHtmlData.htmlStr = tableHtmlStr;
      tableHtmlData.jsStr = tableJsStr;
      return tableHtmlData;
}

function createEveryModuleHtml(moduleApiList) {
    let everyModuleHtmlStr = '';
    let everyModuleJsStr = '';
    for (let key of moduleApiList.keys()) {
        let nowModuleName = key;
        let nowModuleApiArray = moduleApiList.get(key);
        let nowModuleDtsMap = getModuleDtsMap(nowModuleApiArray);
        let nowModuleSelfMap = getModuleSelfMap(nowModuleApiArray);
        let nowModuleDtsHtmlData = getOneModuleDtsHtmlData(nowModuleDtsMap, nowModuleName);
        let nowModuleSelfHtmlData = getOneModuleSelfHtmlData(nowModuleSelfMap, nowModuleName);
        let nowModuleTableHtmlData = getOneModuleTableHtmlData(nowModuleApiArray, nowModuleName);
        let nowModuleHtmlStr = `${nowModuleDtsHtmlData.htmlStr}
        ${nowModuleSelfHtmlData.htmlStr}
        ${nowModuleTableHtmlData.htmlStr}
        <div style="margin-top: 40px; margin-bottom: 40px;"></div>`;
        everyModuleHtmlStr = `${everyModuleHtmlStr}
        ${nowModuleHtmlStr}`;
        let nowModuleJsStr = `${nowModuleDtsHtmlData.jsStr}
        ${nowModuleSelfHtmlData.jsStr}
        ${nowModuleTableHtmlData.jsStr}`;
        everyModuleJsStr = `${everyModuleJsStr}
        ${nowModuleJsStr}`;
    }
    let everyModuleHtmlData = { htmlStr: everyModuleHtmlStr, jsStr: everyModuleJsStr };
    return everyModuleHtmlData;
}

function createHtmlString(alldtsList, moduleApiList) {
    let allModuleHtmlData = createAllModuleHtml(moduleApiList);
    let allDtsHtmlData = createAllDtsHtml(alldtsList);
    let everyModuleHtmlData = createEveryModuleHtml(moduleApiList);
    let htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>ECharts 图表</title>
        <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.0/dist/echarts.min.js"></script>
      </head>
      <body>
        ${allModuleHtmlData.htmlStr}
        ${allDtsHtmlData.htmlStr}
        ${everyModuleHtmlData.htmlStr}
        <script type="text/javascript">
          ${allModuleHtmlData.jsStr}
          ${allDtsHtmlData.jsStr}
          ${everyModuleHtmlData.jsStr}
        </script>
      </body>
    </html>
    `;
    return htmlContent;
}

function initHtmlData(htmlString = '', jsString = '') {
    let htmlData = { htmlStr:htmlString, jsStr:jsString };
    return htmlData;
}

function changeOption(option) {
    let optionStr = JSON.stringify(option, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
    return optionStr;
}

function createHtml(alldtsList, moduleApiList) {
  let htmlContent = createHtmlString(alldtsList, moduleApiList);
  fs.writeFileSync('./chart.html', htmlContent, 'utf-8');
  let nowPath = process.cwd();
  let chartHtmlPath = `${nowPath}/chart.html`;
  if (platform === Platform.Windows) {
    chartHtmlPath = `${nowPath}\\chart.html`;
  }
  console.log(`Analysis success! Please view chart.html(${chartHtmlPath})`);
}

module.exports = { createHtml };
