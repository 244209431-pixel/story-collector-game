// 完整功能测试脚本
const fs = require('fs');

console.log('=== 完整功能测试 ===\n');

// 测试 1: 检查关键函数是否定义
console.log('测试 1: 检查关键函数定义');
const gameJs = fs.readFileSync('game.js', 'utf8');

const functions = [
  'saveToIDB',
  'restoreFromIDB',
  'initRecoveryTool',
  'renderRecoveryCalendar',
  'showRecoveryDialog',
  'confirmRecovery',
  'showBatchRecoverDialog',
  'confirmBatchRecover',
  'showMedalRecoverDialog',
  'confirmMedalRecover',
  'showStoryRecoverDialog',
  'confirmStoryRecover',
  'importBackupFile',
  'finishRecovery',
  'switchPage'
];

let allFunctionsDefined = true;
functions.forEach(func => {
  if (gameJs.includes('function ' + func + '(')) {
    console.log('  ✅ ' + func);
  } else {
    console.log('  ❌ ' + func + ' 未定义');
    allFunctionsDefined = false;
  }
});

// 测试 2: 检查 IndexedDB 相关代码
console.log('\n测试 2: 检查 IndexedDB 集成');
const idbFeatures = [
  'indexedDB.open',
  'saveToIDB',
  'restoreFromIDB',
  'cleanupOldBackups'
];

let idbIntegrated = true;
idbFeatures.forEach(feature => {
  if (gameJs.includes(feature)) {
    console.log('  ✅ ' + feature);
  } else {
    console.log('  ❌ ' + feature + ' 未找到');
    idbIntegrated = false;
  }
});

// 测试 3: 检查补录功能集成
console.log('\n测试 3: 检查补录功能集成');
const recoveryFeatures = [
  'recoveryPage',
  'recCalendarDays',
  'recMonthYear',
  'recDayCount',
  'recMedalCount',
  'recStoryCount'
];

const indexHtml = fs.readFileSync('index.html', 'utf8');
let recoveryIntegrated = true;
recoveryFeatures.forEach(feature => {
  if (indexHtml.includes(feature)) {
    console.log('  ✅ ' + feature + ' 在 index.html 中');
  } else {
    console.log('  ❌ ' + feature + ' 未找到');
    recoveryIntegrated = false;
  }
});

// 测试 4: 检查导出功能增强
console.log('\n测试 4: 检查导出功能增强');
if (gameJs.includes('exportDateLocale') && gameJs.includes('version')) {
  console.log('  ✅ 导出功能已增强（包含元数据）');
} else {
  console.log('  ❌ 导出功能未增强');
}

// 测试总结
console.log('\n=== 测试总结 ===');
console.log(allFunctionsDefined ? '✅ 所有关键函数已定义' : '❌ 部分函数未定义');
console.log(idbIntegrated ? '✅ IndexedDB 已集成' : '❌ IndexedDB 未集成');
console.log(recoveryIntegrated ? '✅ 补录功能已集成' : '❌ 补录功能未集成');

const allPassed = allFunctionsDefined && idbIntegrated && recoveryIntegrated;
console.log('\n' + (allPassed ? '🎉 所有测试通过！' : '❌ 部分测试失败'));

process.exit(allPassed ? 0 : 1);
