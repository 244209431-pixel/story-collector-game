#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
向 game.js 添加补录工具的 JavaScript 函数
"""

recovery_js = r"""
// ===== 【v11.2】数据补录工具 =====

// 补录工具状态
let recoveryDate = new Date();
let recoveryRecords = [];

// 初始化补录工具
function initRecoveryTool() {
  console.log('[补录] 初始化补录工具');
  recoveryDate = new Date();
  renderRecoveryCalendar();
  updateRecoveryStats();
}

// 切换月份
function changeRecoveryMonth(delta) {
  recoveryDate.setMonth(recoveryDate.getMonth() + delta);
  renderRecoveryCalendar();
}

// 渲染补录日历
function renderRecoveryCalendar() {
  const year = recoveryDate.getFullYear();
  const month = recoveryDate.getMonth();
  
  // 更新月份显示
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', 
                      '7月', '8月', '9月', '10月', '11月', '12月'];
  document.getElementById('recMonthYear').textContent = `${year}年 ${monthNames[month]}`;
  
  // 计算日历网格
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  
  const calendarDays = document.getElementById('recCalendarDays');
  calendarDays.innerHTML = '';
  
  // 填充空白
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    calendarDays.appendChild(empty);
  }
  
  // 填充日期
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayDate = new Date(year, month, d);
    const isFuture = dayDate > today;
    const isToday = dayDate.toDateString() === today.toDateString();
    
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    
    // 检查是否已打卡
    const hasRecord = G.history && G.history[dayDate.toDateString()];
    const isDone = hasRecord && hasRecord.done === true;
    
    if (isFuture && !isToday) {
      dayDiv.classList.add('future');
      dayDiv.textContent = d;
    } else if (isDone) {
      dayDiv.classList.add('done');
      dayDiv.innerHTML = `<span class="day-num">${d}</span><span class="day-icon">✅</span>`;
    } else if (isToday && Object.values(G.tasks).every(v => v)) {
      dayDiv.classList.add('today-done');
      dayDiv.innerHTML = `<span class="day-num">${d}</span><span class="day-icon">✅</span>`;
    } else {
      dayDiv.classList.add('missing');
      dayDiv.innerHTML = `<span class="day-num">${d}</span>`;
      dayDiv.onclick = () => showRecoveryDialog(dayDate);
    }
    
    calendarDays.appendChild(dayDiv);
  }
}

// 显示补录对话框
function showRecoveryDialog(date) {
  const dateStr = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('recDialogDate').textContent = dateStr;
  document.getElementById('recDialogDate').dataset.date = date.toDateString();
  
  // 重置表单
  document.getElementById('recDialogCheckin').checked = false;
  document.getElementById('recDialogMedal').value = '';
  document.getElementById('recDialogStory').value = '';
  
  document.getElementById('recoveryDialog').style.display = 'flex';
}

// 隐藏补录对话框
function hideRecoveryDialog() {
  document.getElementById('recoveryDialog').style.display = 'none';
}

// 确认补录
function confirmRecovery() {
  const dateStr = document.getElementById('recDialogDate').dataset.date;
  const isCheckin = document.getElementById('recDialogCheckin').checked;
  const medal = document.getElementById('recDialogMedal').value;
  const story = document.getElementById('recDialogStory').value.trim();
  
  if (!isCheckin && !medal && !story) {
    alert('请至少选择一项补录内容！');
    return;
  }
  
  // 补录打卡
  if (isCheckin) {
    if (!G.history) G.history = {};
    G.history[dateStr] = { done: true, date: dateStr };
    console.log('[补录] 打卡记录:', dateStr);
  }
  
  // 补录勋章
  if (medal) {
    if (!G.medals) G.medals = [];
    const medalInfo = {
      'brave': { title: '勇敢勋章', icon: '🏅', desc: '完成一次勇敢的挑战' },
      'kind': { title: '善良勋章', icon: '💝', desc: '帮助他人一次' },
      'persist': { title: '坚持勋章', icon: '⏳', desc: '连续打卡7天' },
      'creative': { title: '创意勋章', icon: '🎨', desc: '创作一个故事' },
      'explorer': { title: '探索勋章', icon: '🗺️', desc: '探索新领域' }
    };
    
    if (medalInfo[medal]) {
      G.medals.push({
        title: medalInfo[medal].title,
        icon: medalInfo[medal].icon,
        desc: medalInfo[medal].desc,
        date: dateStr,
        weekId: getWeekId(new Date(dateStr))
      });
      console.log('[补录] 勋章:', medalInfo[medal].title);
    }
  }
  
  // 补录故事
  if (story) {
    if (!G.myStories) G.myStories = [];
    G.myStories.push({
      title: story.substring(0, 20) + (story.length > 20 ? '...' : ''),
      text: story,
      date: dateStr
    });
    console.log('[补录] 故事:', story.substring(0, 20));
  }
  
  // 保存并刷新
  save();
  hideRecoveryDialog();
  renderRecoveryCalendar();
  updateRecoveryStats();
  
  alert('✅ 补录成功！');
}

// 更新补录统计
function updateRecoveryStats() {
  let dayCount = 0;
  let medalCount = 0;
  let storyCount = 0;
  
  if (G.history) {
    dayCount = Object.keys(G.history).filter(k => G.history[k].done).length;
  }
  if (G.medals) {
    medalCount = G.medals.length;
  }
  if (G.myStories) {
    storyCount = G.myStories.length;
  }
  
  document.getElementById('recDayCount').textContent = dayCount;
  document.getElementById('recMedalCount').textContent = medalCount;
  document.getElementById('recStoryCount').textContent = storyCount;
}

// 显示批量补录对话框
function showBatchRecoverDialog() {
  document.getElementById('batchDialog').style.display = 'flex';
}

// 确认批量补录
function confirmBatchRecover() {
  const startDate = document.getElementById('batchStartDate').value;
  const endDate = document.getElementById('batchEndDate').value;
  
  if (!startDate || !endDate) {
    alert('请选择开始和结束日期！');
    return;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    alert('开始日期不能晚于结束日期！');
    return;
  }
  
  if (!G.history) G.history = {};
  
  const current = new Date(start);
  let count = 0;
  while (current <= end) {
    const dateStr = current.toDateString();
    G.history[dateStr] = { done: true, date: dateStr };
    count++;
    current.setDate(current.getDate() + 1);
  }
  
  save();
  hideBatchDialog();
  renderRecoveryCalendar();
  updateRecoveryStats();
  
  alert(`✅ 批量补录成功！共补录 ${count} 天`);
}

// 隐藏批量补录对话框
function hideBatchDialog() {
  document.getElementById('batchDialog').style.display = 'none';
}

// 显示勋章补录对话框
function showMedalRecoverDialog() {
  document.getElementById('medalDialog').style.display = 'flex';
}

// 确认勋章补录
function confirmMedalRecover() {
  const medal = document.getElementById('medalSelect').value;
  const date = document.getElementById('medalDate').value;
  
  if (!medal || !date) {
    alert('请选择勋章和日期！');
    return;
  }
  
  if (!G.medals) G.medals = [];
  
  const medalInfo = {
    'brave': { title: '勇敢勋章', icon: '🏅', desc: '完成一次勇敢的挑战' },
    'kind': { title: '善良勋章', icon: '💝', desc: '帮助他人一次' },
    'persist': { title: '坚持勋章', icon: '⏳', desc: '连续打卡7天' },
    'creative': { title: '创意勋章', icon: '🎨', desc: '创作一个故事' },
    'explorer': { title: '探索勋章', icon: '🗺️', desc: '探索新领域' }
  };
  
  if (medalInfo[medal]) {
    G.medals.push({
      title: medalInfo[medal].title,
      icon: medalInfo[medal].icon,
      desc: medalInfo[medal].desc,
      date: new Date(date).toDateString(),
      weekId: getWeekId(new Date(date))
    });
    
    save();
    hideMedalDialog();
    updateRecoveryStats();
    
    alert('✅ 勋章补录成功！');
  }
}

// 隐藏勋章补录对话框
function hideMedalDialog() {
  document.getElementById('medalDialog').style.display = 'none';
}

// 显示故事补录对话框
function showStoryRecoverDialog() {
  document.getElementById('storyDialog').style.display = 'flex';
}

// 确认故事补录
function confirmStoryRecover() {
  const title = document.getElementById('storyTitleInput').value.trim();
  const text = document.getElementById('storyTextInput').value.trim();
  const date = document.getElementById('storyDateInput').value;
  
  if (!title || !text || !date) {
    alert('请填写完整信息！');
    return;
  }
  
  if (!G.myStories) G.myStories = [];
  
  G.myStories.push({
    title: title,
    text: text,
    date: new Date(date).toDateString()
  });
  
  save();
  hideStoryDialog();
  updateRecoveryStats();
  
  alert('✅ 故事补录成功！');
}

// 隐藏故事补录对话框
function hideStoryDialog() {
  document.getElementById('storyDialog').style.display = 'none';
}

// 导入备份文件
function importBackupFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      // 验证数据格式
      if (!data.history && !data.medals && !data.myStories) {
        alert('❌ 备份文件格式不正确！');
        return;
      }
      
      // 合并数据
      if (data.history) {
        if (!G.history) G.history = {};
        Object.assign(G.history, data.history);
      }
      if (data.medals) {
        if (!G.medals) G.medals = [];
        G.medals = G.medals.concat(data.medals);
      }
      if (data.myStories) {
        if (!G.myStories) G.myStories = [];
        G.myStories = G.myStories.concat(data.myStories);
      }
      
      save();
      renderRecoveryCalendar();
      updateRecoveryStats();
      
      alert('✅ 备份导入成功！');
    } catch (err) {
      alert('❌ 文件解析失败：' + err.message);
    }
  };
  reader.readAsText(file);
  
  // 清空 input
  event.target.value = '';
}

// 完成补录
function finishRecovery() {
  // 重新计算统计数据
  repairData();
  save();
  
  // 返回主页
  showPage('homePage');
  
  // 刷新主页显示
  renderGems();
  renderTasks();
  renderStoryProg();
  renderAch();
  renderMedals();
  renderTreasure();
  
  alert('✅ 补录完成！已返回主页');
}

// 处理 ?mode=recovery URL 参数
function checkRecoveryMode() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'recovery') {
    console.log('[补录] 检测到 recovery 模式，显示补录工具');
    showPage('recoveryPage');
    initRecoveryTool();
  }
}

console.log('[v11.2] 数据补录工具已加载');
"""

def main():
    """主函数：向 game.js 添加补录工具 JS 函数"""
    game_js_path = '/Users/mandy/CodeBuddy/学习打卡/game.js'
    
    # 读取现有内容
    with open(game_js_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 在文件末尾添加补录工具函数
    content += recovery_js
    
    # 写回文件
    with open(game_js_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print('✅ 补录工具 JavaScript 函数已添加到 game.js')

if __name__ == '__main__':
    main()
