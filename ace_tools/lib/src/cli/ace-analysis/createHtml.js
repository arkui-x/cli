const fs = require('fs');
const MODULE_BASE_WIDTH = 200;
const MODULE_SHOW_WIDTH = 145;
const API_BASE_HEIGHT = 200;
const API_SHOW_HEIGHT = 66;

let alldtsList;
let moduleApiList;

function createAllModuleHtml() {
    let apiNumberArray= [];
    let keyArray = [];
    for( let key of moduleApiList.keys()) {
        keyArray.push(key);
        let notSupportApiArray = moduleApiList.get(key);
        apiNumberArray.push(notSupportApiArray.length);
    }
    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        title: {
          text: '模块不支持Api统计'
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
    const optionStr = changeOption(option);
    const allModuleJsStr = `var chartDom = document.getElementById('allModuleChart');
          var chart = echarts.init(chartDom);
          var option = ${optionStr};
          chart.setOption(option);`;
    let allModuleHtmlData = initHtmlData();
    const allModuleWidth = MODULE_BASE_WIDTH + MODULE_SHOW_WIDTH * keyArray.length;
    const allModuleHtmlStr = `<div id="allModuleChart" style="width: ${allModuleWidth}px; height: 400px;"></div>`;
    allModuleHtmlData.htmlStr = allModuleHtmlStr;
    allModuleHtmlData.jsStr = allModuleJsStr;
    return allModuleHtmlData;
}

function createAllDtsHtml() {
    let dtsApiNumberArray= [];
    let dtsFileArray = [];
    for( let key of alldtsList.keys()) {
        dtsFileArray.push(key);
        let notSupportApiArray = alldtsList.get(key);
        dtsApiNumberArray.push(notSupportApiArray.length);
    }
    const option = {
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
    const optionStr = changeOption(option);
    const allApiJsStr = `var chartDom = document.getElementById('allApiChart');
          var chart = echarts.init(chartDom);
          var option = ${optionStr};
          chart.setOption(option);`
    let allDtsHtmlData = initHtmlData();
    const allApiHeight = API_BASE_HEIGHT + API_SHOW_HEIGHT * dtsFileArray.length;
    const allApiHtmlStr = `<div id="allApiChart" style="width: 1400px; height: ${allApiHeight}px;"></div>`
    allDtsHtmlData.htmlStr = allApiHtmlStr;
    allDtsHtmlData.jsStr = allApiJsStr;
    return allDtsHtmlData;
}

function getModuleDtsMap(nowModuleApiArray) {
    let nowModuleDtsMap = new Map();
    for (var i = 0; i < nowModuleApiArray.length; i++) {
        const nowApiData = nowModuleApiArray[i];
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
    for (var i = 0; i < nowModuleApiArray.length; i++) {
        const nowApiData = nowModuleApiArray[i];
        if (!nowModuleSelfMap.has(nowApiData.selfFile)) {
            nowModuleSelfMap.set(nowApiData.selfFile, []);
        }
        let nowSelfArray = nowModuleSelfMap.get(nowApiData.selfFile);
        nowSelfArray.push(nowApiData.apiName);
    }
    return nowModuleSelfMap;
}

function getOneModuleDtsHtmlData(nowModuleDtsMap, nowModuleName) {
    let dtsApiNumberArray= [];
    let dtsFileArray = [];
    for( let key of nowModuleDtsMap.keys()) {
        dtsFileArray.push(key);
        let nowApiArray = nowModuleDtsMap.get(key);
        dtsApiNumberArray.push(nowApiArray.length);
    }
    const option = {
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
    const optionStr = changeOption(option);
    const htmlId = `${nowModuleName}dtsChart`
    const allApiJsStr = `var chartDom = document.getElementById('${htmlId}');
          var chart = echarts.init(chartDom);
          var option = ${optionStr};
          chart.setOption(option);`
    let oneModuleDtsHtmlData = initHtmlData();
    const allApiHeight = API_BASE_HEIGHT + API_SHOW_HEIGHT * dtsFileArray.length;
    const allApiHtmlStr = `<div id="${htmlId}" style="width: 1400px; height: ${allApiHeight}px;"></div>`
    oneModuleDtsHtmlData.htmlStr = allApiHtmlStr;
    oneModuleDtsHtmlData.jsStr = allApiJsStr;
    return oneModuleDtsHtmlData;
}

function getOneModuleSelfHtmlData(nowModuleSelfMap, nowModuleName) {
    let selfApiNumberArray= [];
    let selfFileArray = [];
    for( let key of nowModuleSelfMap.keys()) {
        selfFileArray.push(key);
        let nowApiArray = nowModuleSelfMap.get(key);
        selfApiNumberArray.push(nowApiArray.length);
    }
    const option = {
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
    const optionStr = changeOption(option);
    const htmlId = `${nowModuleName}selfChart`
    const allApiJsStr = `var chartDom = document.getElementById('${htmlId}');
          var chart = echarts.init(chartDom);
          var option = ${optionStr};
          chart.setOption(option);`
    let oneModuleSelfHtmlData = initHtmlData();
    const allApiHeight = API_BASE_HEIGHT + API_SHOW_HEIGHT * selfFileArray.length;
    const allApiHtmlStr = `<div id="${htmlId}" style="width: 1400px; height: ${allApiHeight}px;"></div>`
    oneModuleSelfHtmlData.htmlStr = allApiHtmlStr;
    oneModuleSelfHtmlData.jsStr = allApiJsStr;
    return oneModuleSelfHtmlData;
}

function getOneModuleTableHtmlData(nowModuleApiArray, nowModuleName) {
    const tableId = `${nowModuleName}table`
    const tableHtmlStr = `<div id="${tableId}"></div>`
    const dataStr = changeOption(nowModuleApiArray);
    const tableJsStr = `const ${nowModuleName}data = ${dataStr};
      const ${nowModuleName}table = document.createElement('table');
      ${nowModuleName}table.style.width = '80%';
      ${nowModuleName}table.setAttribute('border', '1');
      ${nowModuleName}table.setAttribute('cellpadding', '5');
      ${nowModuleName}table.setAttribute('cellspacing', '0');
      const ${nowModuleName}thead = ${nowModuleName}table .createTHead();
      const ${nowModuleName}row = ${nowModuleName}thead.insertRow();
      const ${nowModuleName}cell1 = ${nowModuleName}row.insertCell(0);
      const ${nowModuleName}cell2 = ${nowModuleName}row.insertCell(1);
      const ${nowModuleName}cell3 = ${nowModuleName}row.insertCell(2);
      const ${nowModuleName}cell4 = ${nowModuleName}row.insertCell(3);
      ${nowModuleName}cell1.innerHTML = "序号";
      ${nowModuleName}cell2.innerHTML = "接口名";
      ${nowModuleName}cell3.innerHTML = "api文件";
      ${nowModuleName}cell4.innerHTML = "自研开发类文件";
      const ${nowModuleName}tbody = document.createElement('tbody');
      ${nowModuleName}data.forEach(rowData => {
          const row = document.createElement('tr');
          Object.values(rowData).forEach(cellText => {
              const td = document.createElement('td');
              td.textContent = cellText;
              row.appendChild(td);
          });
          ${nowModuleName}tbody.appendChild(row);
      });
      ${nowModuleName}table.appendChild(${nowModuleName}tbody);
      document.getElementById('${tableId}').appendChild(${nowModuleName}table);`
      let tableHtmlData = initHtmlData();
      tableHtmlData.htmlStr = tableHtmlStr;
      tableHtmlData.jsStr = tableJsStr;
      return tableHtmlData;
}

function createEveryModuleHtml() {
    let everyModuleHtmlStr ='';
    let everyModuleJsStr = '';
    for( let key of moduleApiList.keys()) {
        const nowModuleName = key;
        const nowModuleApiArray = moduleApiList.get(key);
        const nowModuleDtsMap = getModuleDtsMap(nowModuleApiArray);
        const nowModuleSelfMap = getModuleSelfMap(nowModuleApiArray);
        const nowModuleDtsHtmlData = getOneModuleDtsHtmlData(nowModuleDtsMap, nowModuleName);
        const nowModuleSelfHtmlData = getOneModuleSelfHtmlData(nowModuleSelfMap, nowModuleName);
        const nowModuleTableHtmlData = getOneModuleTableHtmlData(nowModuleApiArray, nowModuleName);
        const nowModuleHtmlStr = `${nowModuleDtsHtmlData.htmlStr}
        ${nowModuleSelfHtmlData.htmlStr}
        ${nowModuleTableHtmlData.htmlStr}
        <div style="margin-top: 40px; margin-bottom: 40px;"></div>`;
        everyModuleHtmlStr = `${everyModuleHtmlStr}
        ${nowModuleHtmlStr}`;
        const nowModuleJsStr = `${nowModuleDtsHtmlData.jsStr}
        ${nowModuleSelfHtmlData.jsStr}
        ${nowModuleTableHtmlData.jsStr}`;
        everyModuleJsStr = `${everyModuleJsStr}
        ${nowModuleJsStr}`;
    }
    const everyModuleHtmlData = { htmlStr: everyModuleHtmlStr, jsStr: everyModuleJsStr };
    return everyModuleHtmlData;
}

function createHtmlString() {
    const allModuleHtmlData = createAllModuleHtml();
    const allDtsHtmlData = createAllDtsHtml();
    const everyModuleHtmlData = createEveryModuleHtml();
    const htmlContent = `
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

function initHtmlData(htmlString = "", jsString = "") {
    let htmlData = { htmlStr:htmlString, jsStr:jsString };
    return htmlData;
}

function changeOption(option) {
    const optionStr = JSON.stringify(option, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
    return optionStr;
}

function setData(alldtsListData, moduleApiListData) {
    alldtsList = alldtsListData;
    moduleApiList = moduleApiListData;
}

function createHtml() {
  const htmlContent = createHtmlString();
  fs.writeFileSync('./chart.html', htmlContent, 'utf-8');
  console.log('Analysis success! Please view chart.html');
}

module.exports = { createHtml, setData };