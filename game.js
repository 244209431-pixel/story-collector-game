// ==========================================
// 🎮 故事收集家 - 游戏核心引擎（GitHub Gist 同步版）
// v11.3 — GitHub Gist 云端同步
// ==========================================

// ===== 云同步配置（GitHub Gist 方案） =====
let currentUser=null;
let selectedAvatar='👧';
let syncTimer=null;
let isFirstLoad=false; // 标记是否首次加载（本地无数据）
const SYNC_STORAGE_PREFIX='storyGame_user_';
const GITHUB_API='https://api.github.com';
const GITHUB_TOKEN_KEY='storyGame_gh_token';
const GIST_DESC_PREFIX='Story Game Data Backup for ';
const GIST_FILENAME='story-game-data.json';

// ===== GitHub Token 管理 =====
function getGitHubToken() {
  return localStorage.getItem(GITHUB_TOKEN_KEY) || '';
}

function setGitHubToken(token) {
  if (!token || token.trim() === '') {
    localStorage.removeItem(GITHUB_TOKEN_KEY);
    console.log('[GitHub] Token 已清除');
    return false;
  }
  localStorage.setItem(GITHUB_TOKEN_KEY, token.trim());
  console.log('[GitHub] Token 已保存（长度:', token.trim().length, '）');
  return true;
}

function clearGitHubToken() {
  localStorage.removeItem(GITHUB_TOKEN_KEY);
  console.log('[GitHub] Token 已清除');
}

function hasGitHubToken() {
  const token = getGitHubToken();
  return token && token.length > 0;
}

// ===== 【v11.3】Gist ID 管理（新版本，支持三重备份） =====
// 注意：第 208-219 行有新版本定义，使用常量 + 三重备份
// 为避免过度加载，此处仅保留注释，实际函数体见第 208 行

// ===== 【新增】自动发现 Gist =====
async function discoverGist() {
  const token = getGitHubToken();
  if (!token) {
    console.warn('[discoverGist] 未配置 Token');
    return null;
  }
  
  try {
    console.log('[discoverGist] 开始搜索用户的 Gist...');
    const resp = await fetch(`${GITHUB_API}/gists`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!resp.ok) {
      console.error('[discoverGist] 获取 Gist 列表失败:', resp.status);
      return null;
    }
    
    const gists = await resp.json();
    console.log('[discoverGist] 找到', gists.length, '个 Gist');
    
    // 查找描述匹配的 Gist
    const targetDesc = GIST_DESC_PREFIX + currentUser;
    const found = gists.find(g => g.description === targetDesc);
    
    if (found) {
      console.log('[discoverGist] ✅ 自动发现 Gist:', found.id);
      saveGistId(currentUser, found.id);
      return found.id;
    } else {
      console.log('[discoverGist] 未找到匹配的 Gist，将创建新的');
      return null;
    }
  } catch(e) {
    console.error('[discoverGist] ❌ 搜索失败:', e.message);
    return null;
  }
}

// ===== 【新增】手动保存 Gist ID =====
function saveGistIdManual() {
  const input = document.getElementById('manualGistIdInput');
  const statusEl = document.getElementById('gistIdStatus');
  if (!input || !statusEl) return;
  
  const gistId = input.value.trim();
  if (!gistId) {
    statusEl.style.color = '#EF4444';
    statusEl.textContent = '⚠️ 请输入 Gist ID';
    return;
  }
  
  // 简单验证 Gist ID 格式（GitHub Gist ID 是 32 位十六进制字符串）
  if (!/^[a-f0-9]{32}$/.test(gistId)) {
    statusEl.style.color = '#EF4444';
    statusEl.textContent = '⚠️ Gist ID 格式不正确（应为 32 位十六进制字符串）';
    return;
  }
  
  saveGistId(currentUser, gistId);
  statusEl.style.color = '#10B981';
  statusEl.textContent = '✅ Gist ID 已保存（' + gistId.substring(0, 8) + '...）';
  
  // 清空输入框
  input.value = '';
  
  // 刷新同步状态
  updateSyncUI('done');
  
  console.log('[Manual] Gist ID 已手动保存:', gistId);
}

// ===== Token UI 函数（供设置页面调用）=====
function saveGitHubToken() {
  const input = document.getElementById('githubTokenInput');
  const statusEl = document.getElementById('tokenStatus');
  if (!input) return;
  
  const token = input.value.trim();
  if (!token) {
    statusEl.style.color = '#EF4444';
    statusEl.textContent = '⚠️ 请输入 Token';
    return;
  }
  
  if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
    statusEl.style.color = '#EF4444';
    statusEl.textContent = '⚠️ Token 格式不正确（应以 ghp_ 或 github_pat_ 开头）';
    return;
  }
  
  setGitHubToken(token);
  statusEl.style.color = '#10B981';
  statusEl.textContent = '✅ Token 已保存（仅保存在浏览器本地）';
  
  // 清空输入框（安全考虑）
  input.value = '';
  
  // 【修复】刷新 Token 状态和同步状态
  loadGitHubToken();  // 刷新 Token 显示
  updateSyncUI('done');
  
  console.log('[Token] Token 已保存');
}

function loadGitHubToken() {
  const input = document.getElementById('githubTokenInput');
  const statusEl = document.getElementById('tokenStatus');
  const syncDetailStatus = document.getElementById('syncDetailStatus');
  if (!input) return;
  
  const token = getGitHubToken();
  if (token) {
    // 显示 token 长度，但不显示完整 token（安全考虑）
    input.placeholder = `已配置 Token (${token.length} 字符)`;
    if (statusEl) {
      statusEl.style.color = '#10B981';
      statusEl.textContent = '✅ Token 已配置';
    }
    // 更新同步详情状态
    if (syncDetailStatus) {
      syncDetailStatus.textContent = '✅ Token 已配置，可以手动同步或等待自动同步';
    }
    // 隐藏离线提示
    const offlineTip = document.getElementById('offlineTip');
    if (offlineTip) offlineTip.style.display = 'none';
  } else {
    input.placeholder = '粘贴 GitHub Token (ghp_...)';
    if (statusEl) {
      statusEl.style.color = '#F59E0B';
      statusEl.textContent = '⚠️ 请先配置 GitHub Token';
    }
    // 更新同步详情状态
    if (syncDetailStatus) {
      syncDetailStatus.textContent = '⚠️ 请先配置 GitHub Token 以启用云端同步';
    }
    // 显示离线提示
    const offlineTip = document.getElementById('offlineTip');
    if (offlineTip) offlineTip.style.display = 'block';
  }
}

// ===== Gist ID 管理 =====
const GIST_ID_PREFIX = 'storyGame_gistId_';
const GIST_ID_BACKUP_PREFIX = 'storyGame_gistBackup_';

function saveGistId(user, gistId) {
  localStorage.setItem(GIST_ID_PREFIX + user, gistId);
  localStorage.setItem(GIST_ID_BACKUP_PREFIX + user, gistId);
  try { sessionStorage.setItem(GIST_ID_PREFIX + user, gistId); } catch(e) {}
  console.log('[Gist] 已保存 gistId, user=', user, ', id=', gistId);
}

function getGistId(user) {
  return localStorage.getItem(GIST_ID_PREFIX + user)
    || localStorage.getItem(GIST_ID_BACKUP_PREFIX + user)
    || (function() { try { return sessionStorage.getItem(GIST_ID_PREFIX + user); } catch(e) { return null; } })();
}

const W=['日','一','二','三','四','五','六'];
const JUMP=[1,2,4,6,0], SWIM=[3,5];

// 【v8.4】周一起始：将 JS 的 getDay()（0=日）转换为周一起始的偏移（0=一,1=二...6=日）
function mondayDow(d){ const dow=(typeof d==='number')?d:d.getDay(); return (dow+6)%7; }

// 故事数据已移至 stories.js（STORIES 全局变量）

// ===== 【v11.0】惊喜转盘特权列表 =====
const SPIN_PRIZES = [
  { icon:'🎬', text:'和爸爸妈妈一起看电影', type:'亲子' },
  { icon:'🍰', text:'选一个喜欢的甜点', type:'生活' },
  { icon:'🌾', text:'玩5分钟开心农场', type:'生活' },
  { icon:'🍽️', text:'选择一顿晚餐菜单', type:'生活' },
  { icon:'🃏', text:'和爸妈玩一局桌游', type:'亲子' },
  { icon:'🏖️', text:'周末选一个出游地点', type:'亲子' },
  { icon:'🌟', text:'免除一天的额外练习', type:'学习' },
  { icon:'🧚', text:'玩15分钟小仙女游戏', type:'生活' },
];

// ===== 【v10.0】勋章预设列表（按获得顺序依次发放） =====
const MEDAL_LIST = [
  { icon:'⚔️', title:'初心勇士', desc:'第一周满勤！你是最棒的！' },
  { icon:'🛡️', title:'坚毅骑士', desc:'连续两周满勤，你的意志力真强！' },
  { icon:'🌟', title:'闪耀之星', desc:'三周满勤！你是夜空中最亮的星！' },
  { icon:'🔥', title:'烈焰战士', desc:'四周满勤！燃烧吧小宇宙！' },
  { icon:'🦁', title:'勇猛狮王', desc:'五周满勤！你的勇气令人敬佩！' },
  { icon:'🐉', title:'神龙骑士', desc:'六周满勤！传说级的坚持！' },
  { icon:'👑', title:'王者冠军', desc:'七周满勤！你就是冠军！' },
  { icon:'💎', title:'钻石精英', desc:'八周满勤！钻石般闪耀的毅力！' },
  { icon:'🌈', title:'彩虹使者', desc:'九周满勤！你就是希望的化身！' },
  { icon:'🦄', title:'独角兽勇者', desc:'十周满勤！传说中的坚持！' },
  { icon:'🏆', title:'传奇大师', desc:'十一周满勤！你已经是传奇！' },
  { icon:'⭐', title:'超级巨星', desc:'十二周满勤！三个月的坚持！' },
  { icon:'🎖️', title:'荣耀将军', desc:'十三周满勤！真正的将军风范！' },
  { icon:'🗡️', title:'圣剑骑士', desc:'十四周满勤！手握圣剑的勇者！' },
  { icon:'🐺', title:'银狼猎手', desc:'十五周满勤！敏捷如狼！' },
  { icon:'🦅', title:'雄鹰翱翔', desc:'十六周满勤！展翅高飞！' },
  { icon:'🌸', title:'樱花武士', desc:'十七周满勤！温柔又坚强！' },
  { icon:'🐲', title:'金龙至尊', desc:'十八周满勤！至尊级别！' },
  { icon:'✨', title:'星辰魔法师', desc:'十九周满勤！掌握了星辰之力！' },
  { icon:'🎭', title:'命运主宰者', desc:'二十周满勤！你主宰了自己的命运！' },
  { icon:'🏅', title:'不朽传说', desc:'二十周以上！你已经超越了传说！' },
];

// ===== 【v11.3】IndexedDB 持久备份系统 =====
const IDB_NAME = 'StoryGameDB';
const IDB_VERSION = 1;
const IDB_STORE = 'backups';

// 打开 IndexedDB 数据库
function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: ['userId', 'timestamp'] });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 保存备份到 IndexedDB
async function saveToIDB(userId, data) {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    
    const backup = {
      userId: userId,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      data: { ...data, _backup: true }
    };
    
    await store.put(backup);
    await cleanupOldBackups(userId, 7);
    
    console.log('[IndexedDB] 备份保存成功:', backup.date);
    return true;
  } catch (e) {
    console.error('[IndexedDB] 备份失败:', e);
    return false;
  }
}

// 从 IndexedDB 恢复最新备份
async function restoreFromIDB(userId) {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const index = store.index('userId');
    
    const backups = [];
    return new Promise((resolve, reject) => {
      index.getAll(userId).onsuccess = (e) => {
        const results = e.target.result;
        if (results && results.length > 0) {
          // 按时间戳降序排列，取最新
          results.sort((a, b) => b.timestamp - a.timestamp);
          console.log('[IndexedDB] 找到', results.length, '个备份，最新:', new Date(results[0].timestamp).toLocaleString());
          resolve(results[0].data);
        } else {
          console.log('[IndexedDB] 无备份数据');
          resolve(null);
        }
      };
      index.getAll(userId).onerror = () => reject(new Error('读取备份失败'));
    });
  } catch (e) {
    console.error('[IndexedDB] 恢复失败:', e);
    return null;
  }
}

// 清理旧备份（保留最近 N 天）
async function cleanupOldBackups(userId, keepDays) {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    
    const cutoff = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
    const index = store.index('userId');
    
    return new Promise((resolve) => {
      index.getAll(userId).onsuccess = (e) => {
        const results = e.target.result;
        let deleted = 0;
        results.forEach(backup => {
          if (backup.timestamp < cutoff) {
            store.delete([backup.userId, backup.timestamp]);
            deleted++;
          }
        });
        if (deleted > 0) {
          console.log('[IndexedDB] 清理了', deleted, '个旧备份');
        }
        resolve();
      };
    });
  } catch (e) {
    console.error('[IndexedDB] 清理失败:', e);
  }
}

// 获取所有备份列表（用于调试）
async function listIDBBackups(userId) {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const index = tx.objectStore(IDB_STORE).index('userId');
    
    return new Promise((resolve) => {
      index.getAll(userId).onsuccess = (e) => {
        const results = e.target.result || [];
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
    });
  } catch (e) {
    return [];
  }
}

// ===== IndexedDB 封装结束 =====

// ===== 生成一个干净的默认状态 =====
function makeDefaultState(){
  return {
    date:null, // null 表示从未使用过，不是今天！
    jumpCount:0,swimDone:false,
    tasks:{sport:false,homework:false,study:false,outdoor:false},
    habits:{fast:false,tidy:false,polite:false},
    gems:[],streak:0,weekly:{},
    collected:[],myStories:[],
    ach:{jumpHero:false,waterSpirit:false,storyDirector:false,goodHabit:false},
    consJump:0,weekSwim:0,totalDays:0,dirUnlocked:false,dirUnlockedDate:null,
    dirUnlockedEver:false,
    dirCycleCount:0,
    history:{},
    // 【v10.0 新增】
    medals:[],           // 源数据：已获得的勋章列表 [{ weekId, title, icon, desc, earnedDate, redeemed, redeemedDate }]
    weeklyFullDays:0,    // 派生数据：本周全部完成（allDone）的天数（0-7），用于宝箱进度
    // 【v11.0 新增】
    spinHistory:[],      // 源数据：惊喜转盘抽奖记录 [{ triggerMedalIndex, result, date, used }]
  };
}

// ===== 游戏状态 =====
let G=makeDefaultState();

// ===== 保存 =====
function save(){
  if(!currentUser)return;
  if(!G.history) G.history={};
  if(!G.weekly) G.weekly={};

  // 实时把今天打卡数据写入 history 和 weekly（关键：每次 save 都写！）
  const todayStr=G.date||new Date().toDateString();
  const anyTaskDone=G.tasks&&Object.values(G.tasks).some(v=>v);
  const anyHabitDone=G.habits&&Object.values(G.habits).some(v=>v);
  const hasAnyData=anyTaskDone||anyHabitDone||G.jumpCount>0||G.swimDone;
  
  if(hasAnyData){
    const dw=new Date(todayStr).getDay();
    const allTaskDone=Object.values(G.tasks).every(v=>v);
    
    // 写入 history（总是用最新的数据覆盖今天的记录）
    G.history[todayStr]={
      tasks:{...G.tasks},
      habits:{...G.habits},
      jumpCount:G.jumpCount,
      swimDone:G.swimDone,
      gems:G.gems?[...G.gems]:[],
      sportType:JUMP.includes(dw)?'jump':'swim',
      allDone:allTaskDone
    };
    
    // 写入 weekly（只向上升级，不向下降级）
    const curWeekly=G.weekly[todayStr];
    if(!curWeekly||curWeekly===false){
      G.weekly[todayStr]=allTaskDone?true:'partial';
    }else if(curWeekly==='partial'&&allTaskDone){
      G.weekly[todayStr]=true;
    }
  }

  // 【v11.1】自动备份到 sessionStorage
  autoBackup();
  const key=SYNC_STORAGE_PREFIX+currentUser;
  const data={...G, _user:currentUser, _avatar:selectedAvatar, _lastSync:Date.now(), _version:'v11.3'};
  localStorage.setItem(key,JSON.stringify(data));
  console.log('[save] 已保存, history keys=',Object.keys(G.history).length,', weekly keys=',Object.keys(G.weekly).length);
  
  // 【修复】打卡后立即同步到云端（带重试）
  if (hasGitHubToken()) {
    cloudSave(data).then(success => {
      if (success) {
        console.log('[save] ✅ 云端同步成功');
      } else {
        console.warn('[save] ⚠️ 云端同步失败，将依赖自动同步');
      }
    }).catch(e => {
      console.error('[save] ❌ 云端同步异常:', e.message);
    });
  }
  
  // 【v10.0】每次保存后检测勋章（异步，不阻塞保存流程）
  checkWeeklyMedal();
}

// ===== 加载 =====
function load(){
  if(!currentUser)return;
  const key=SYNC_STORAGE_PREFIX+currentUser;
  const raw=localStorage.getItem(key);
  
  // 从一个干净的默认状态开始
  G=makeDefaultState();
  isFirstLoad=false;
  
  if(raw){
    try{
      const d=JSON.parse(raw);
      // 逐字段安全合并，不用展开覆盖
      if(d.date) G.date=d.date;
      if(typeof d.jumpCount==='number') G.jumpCount=d.jumpCount;
      if(typeof d.swimDone==='boolean') G.swimDone=d.swimDone;
      if(d.tasks&&typeof d.tasks==='object') G.tasks={...G.tasks,...d.tasks};
      if(d.habits&&typeof d.habits==='object') G.habits={...G.habits,...d.habits};
      if(Array.isArray(d.gems)) G.gems=[...d.gems];
      if(typeof d.streak==='number') G.streak=d.streak;
      if(d.weekly&&typeof d.weekly==='object') G.weekly={...d.weekly};
      if(Array.isArray(d.collected)) G.collected=[...d.collected];
      if(Array.isArray(d.myStories)) G.myStories=[...d.myStories];
      if(d.ach&&typeof d.ach==='object') G.ach={...G.ach,...d.ach};
      if(typeof d.consJump==='number') G.consJump=d.consJump;
      if(typeof d.weekSwim==='number') G.weekSwim=d.weekSwim;
      if(typeof d.totalDays==='number') G.totalDays=d.totalDays;
      if(typeof d.dirUnlocked==='boolean') G.dirUnlocked=d.dirUnlocked;
      if(d.dirUnlockedDate) G.dirUnlockedDate=d.dirUnlockedDate;
      if(typeof d.dirUnlockedEver==='boolean') G.dirUnlockedEver=d.dirUnlockedEver;
      if(typeof d.dirCycleCount==='number') G.dirCycleCount=d.dirCycleCount;
      if(d.history&&typeof d.history==='object') G.history={...d.history};
      // 【v10.0】加载勋章数据
      if(Array.isArray(d.medals)) G.medals=[...d.medals];
      // 【v11.0】加载转盘记录
      if(Array.isArray(d.spinHistory)) G.spinHistory=[...d.spinHistory];
      
      console.log('[load] 原始数据加载完成, date=',G.date);
      console.log('[load] history keys=',Object.keys(G.history));
      console.log('[load] weekly keys=',Object.keys(G.weekly));
    }catch(e){
      console.error('[load] JSON解析错误',e);
      // 【v11.1 修复】解析失败尝试从云端恢复
      console.log('[load] 尝试从云端恢复数据...');
      cloudLoad().then(()=>{
        console.log('[load] 云端恢复结果: history keys=',Object.keys(G.history||{}).length);
      }).catch(err=>{
        console.error('[load] 云端恢复也失败:',err);
      });
    }
  } else {
    // 本地完全没有数据（首次使用 / 缓存被清 / 换了设备）
    isFirstLoad=true;
    console.log('[load] 本地无数据，标记为首次加载，等待云端恢复');
  }
  
  // 跨天处理
  const today=new Date().toDateString();
  if(G.date && G.date!==today){
    console.log('[load] 检测到跨天: 上次=',G.date,', 今天=',today);
    handleDayChange(G.date, today);
  } else if(!G.date){
    // 全新用户，直接设置为今天
    G.date=today;
  }
  // 同一天就不重置，保持现有数据
  
  // 数据修复（无论是否跨天都执行）
  repairData();
  
  console.log('[load] 修复后: history keys=',Object.keys(G.history),', weekly keys=',Object.keys(G.weekly),', totalDays=',G.totalDays,', streak=',G.streak);
  
  // 只有本地有数据时才立刻保存；首次加载时等云端恢复后再保存（避免空数据覆盖云端）
  if(!isFirstLoad){
    save();
  
  // 【v11.3】检查是否需要提醒导出备份
  const lastExport = localStorage.getItem(SYNC_STORAGE_PREFIX + currentUser + '_lastExport');
  if (lastExport) {
    const daysSinceExport = (Date.now() - parseInt(lastExport)) / (1000 * 60 * 60 * 24);
    if (daysSinceExport >= 7) {
      if (confirm('📤 距离上次导出备份已超过 7 天。\n\n建议现在导出备份吗？')) {
        exportData();
      }
    }
  }
}
}

// ===== 跨天处理（独立函数，逻辑清晰） =====
function handleDayChange(prevDate, today){
  console.log('[跨天] 从',prevDate,'到',today);
  
  // 第一步：确保上次的打卡数据保存到 history
  const prevTasks=G.tasks?{...G.tasks}:{sport:false,homework:false,study:false,outdoor:false};
  const prevHabits=G.habits?{...G.habits}:{fast:false,tidy:false,polite:false};
  const anyTaskDone=Object.values(prevTasks).some(v=>v);
  
  if(prevDate){
    const dw=new Date(prevDate).getDay();
    const wasJumpDay=JUMP.includes(dw);
    
    // 写入 history
    if(!G.history) G.history={};
    // 只有有打卡数据时才覆盖（防止空数据覆盖有效记录）
    if(anyTaskDone || G.jumpCount>0 || G.swimDone){
      G.history[prevDate]={
        tasks:prevTasks,
        habits:prevHabits,
        jumpCount:G.jumpCount||0,
        swimDone:G.swimDone||false,
        gems:G.gems?[...G.gems]:[],
        sportType:wasJumpDay?'jump':'swim',
        allDone:Object.values(prevTasks).every(v=>v)
      };
      console.log('[跨天] 保存 history['+prevDate+']', JSON.stringify(prevTasks));
    }
    
    // 写入 weekly
    if(!G.weekly) G.weekly={};
    const allTaskDone=Object.values(prevTasks).every(v=>v);
    // 只向上升级，不向下降级（避免覆盖已有的 true/partial）
    if(allTaskDone){
      G.weekly[prevDate]=true;
    }else if(anyTaskDone){
      if(G.weekly[prevDate]!==true) G.weekly[prevDate]='partial';
    }
    // 如果什么都没完成且之前也没记录，标记 false
    if(!anyTaskDone && G.weekly[prevDate]===undefined){
      G.weekly[prevDate]=false;
    }
    console.log('[跨天] weekly['+prevDate+']=',G.weekly[prevDate]);
  }
  
  // 第二步：检测是否跨周（【v8.5】上周成就不带到本周）
  const prevDateObj=new Date(prevDate);
  const todayDateObj=new Date(today);
  const prevWeekStart=new Date(prevDateObj);
  prevWeekStart.setDate(prevDateObj.getDate()-mondayDow(prevDateObj));
  prevWeekStart.setHours(0,0,0,0);
  const todayWeekStart=new Date(todayDateObj);
  todayWeekStart.setDate(todayDateObj.getDate()-mondayDow(todayDateObj));
  todayWeekStart.setHours(0,0,0,0);
  
  if(prevWeekStart.getTime()!==todayWeekStart.getTime()){
    // 跨周了！重置本周跳绳/游泳计数和成就
    console.log('[跨天] 检测到跨周！上周起始:',prevWeekStart.toDateString(),'本周起始:',todayWeekStart.toDateString());
    G.consJump=0;
    G.weekSwim=0;
    G.ach.jumpHero=false;
    G.ach.waterSpirit=false;
    console.log('[跨天] 已重置 consJump/weekSwim/jumpHero/waterSpirit');
  }
  
  // 第三步：重置今日数据
  G.jumpCount=0;
  G.swimDone=false;
  G.tasks={sport:false,homework:false,study:false,outdoor:false};
  G.habits={fast:false,tidy:false,polite:false};
  G.gems=[];
  G.date=today;
  G.ach.goodHabit=false;
  
  console.log('[跨天] 完成，今日数据已重置');
}

// ===== 数据修复引擎 =====
function repairData(){
  if(!G.history) G.history={};
  if(!G.weekly) G.weekly={};
  
  // 第一步：确保 history 中的所有有效记录都同步到 weekly
  Object.keys(G.history).forEach(dateStr=>{
    const h=G.history[dateStr];
    if(h&&h.tasks){
      const anyDone=Object.values(h.tasks).some(v=>v);
      if(anyDone){
        const allDone=Object.values(h.tasks).every(v=>v);
        const newVal=allDone?true:'partial';
        // 只向上升级
        if(!G.weekly[dateStr]||G.weekly[dateStr]===false||
           (G.weekly[dateStr]==='partial'&&newVal===true)){
          G.weekly[dateStr]=newVal;
        }
      }
    }
  });
  
  // 【v8.7】修复旧数据：如果 dirUnlocked=true 但 dirUnlockedDate 为空，从历史数据推算
  if(G.dirUnlocked && !G.dirUnlockedDate){
    // 从 weekly 找到第7个打卡日（按时间排序），那天就是解锁日期
    const sortedDates=Object.keys(G.weekly)
      .filter(ds=>{const v=G.weekly[ds];return v===true||v==='partial';})
      .sort((a,b)=>new Date(a)-new Date(b));
    if(sortedDates.length>=7){
      G.dirUnlockedDate=sortedDates[6]; // 第7天（index=6）
      console.log('[修复] 旧数据补 dirUnlockedDate:',G.dirUnlockedDate,'(从历史第7个打卡日推算)');
    }else{
      // 打卡不足7天但 dirUnlocked=true（异常），用最后一个打卡日
      G.dirUnlockedDate=sortedDates.length>0?sortedDates[sortedDates.length-1]:new Date().toDateString();
      console.log('[修复] 旧数据打卡不足7天但已解锁，用最后打卡日:',G.dirUnlockedDate);
    }
  }
  
  // 【v8.7】修复 dirUnlockedEver：如果已经解锁过但没有此标记
  if(G.dirUnlocked && !G.dirUnlockedEver){
    G.dirUnlockedEver=true;
    console.log('[修复] 补 dirUnlockedEver=true');
  }
  
  // 【v10.0】修复 medals 迁移（旧数据没有 medals 字段）
  if(!Array.isArray(G.medals)) G.medals=[];
  // 【v11.0】修复 spinHistory 迁移
  if(!Array.isArray(G.spinHistory)) G.spinHistory=[];
  // 【v11.0】修复旧勋章缺少 redeemed 字段
  G.medals.forEach(m=>{
    if(m.redeemed===undefined) m.redeemed=false;
    if(m.redeemedDate===undefined) m.redeemedDate=null;
  });
  
  // 第二步：重新统计 totalDays（【v8.7】支持故事导演权解锁后重新计算）
  // 如果已经解锁过故事导演权，则只计算解锁那天之后的打卡天数
  // 【v10.0】注意：totalDays 仍用于宝箱导演权周期，但只统计 allDone===true
  let realTotalDays=0;
  if(G.dirUnlockedDate){
    const unlockDate=new Date(G.dirUnlockedDate);
    unlockDate.setDate(unlockDate.getDate()+1);
    Object.keys(G.weekly).forEach(dateStr=>{
      const val=G.weekly[dateStr];
      if(val===true){  // 【v10.0】只有全部完成才计入
        const d=new Date(dateStr);
        if(d>=unlockDate) realTotalDays++;
      }
    });
    console.log('[修复] totalDays(解锁后周期):',G.totalDays,'→',realTotalDays,'(解锁日:',G.dirUnlockedDate,')');
  }else{
    Object.keys(G.weekly).forEach(dateStr=>{
      const val=G.weekly[dateStr];
      if(val===true) realTotalDays++;  // 【v10.0】只有全部完成才计入
    });
  }
  
  if(realTotalDays!==G.totalDays){
    console.log('[修复] totalDays:',G.totalDays,'→',realTotalDays);
    G.totalDays=realTotalDays;
  }
  
  // 第三步：重新计算 streak（【v10.0】限定在本周范围内，只有 allDone===true 才算连续）
  const today=new Date();
  
  // 【v10.0】计算本周 weekDates（周一到周日）
  const todayDate_s=new Date();
  const todayDow_s=todayDate_s.getDay();
  const mDow_s=mondayDow(todayDow_s);
  const weekDates_s=[];
  for(let i=0;i<7;i++){
    const d=new Date(todayDate_s);
    d.setDate(todayDate_s.getDate()-mDow_s+i);
    weekDates_s.push(d.toDateString());
  }
  
  // 从今天往回数到周一，只要连续 true 就计 streak
  let realStreak=0;
  const todayIdx=mDow_s; // 今天在本周中的位置（0=周一，6=周日）
  
  // 先检查今天
  const todayStr_s=todayDate_s.toDateString();
  if(G.weekly[todayStr_s]===true){
    realStreak=1;
    // 再从昨天往回数
    for(let i=todayIdx-1;i>=0;i--){
      if(G.weekly[weekDates_s[i]]===true){
        realStreak++;
      }else{
        break;
      }
    }
  }else{
    // 今天没有全部完成，从昨天开始计
    for(let i=todayIdx-1;i>=0;i--){
      if(G.weekly[weekDates_s[i]]===true){
        realStreak++;
      }else{
        break;
      }
    }
  }
  
  // 【v10.0】计算本周全部完成天数（weeklyFullDays，派生数据）
  let weekFullCount=0;
  weekDates_s.forEach(ds=>{
    if(G.weekly[ds]===true) weekFullCount++;
  });
  G.weeklyFullDays=weekFullCount;
  
  // streak 总是取最新计算的值（不只是"更大时"修复）
  if(realStreak!==G.streak){
    console.log('[修复] streak:',G.streak,'→',realStreak);
    G.streak=realStreak;
  }
  
  // 【v8.2 修复】第四步：从 history 重新统计本周 weekSwim（游泳次数）和 weekJump（跳绳天数）
  const todayDate=new Date();
  const todayDow=todayDate.getDay(); // 0=日 6=六
  
  // 【v8.4】计算本周的起始日（周一）和结束日（周日）的 toDateString
  const mDow=mondayDow(todayDow); // 周一起始偏移
  const weekDates=[];
  for(let i=0;i<7;i++){
    const d=new Date(todayDate);
    d.setDate(todayDate.getDate()-mDow+i);
    weekDates.push(d.toDateString());
  }
  
  let realWeekSwim=0;
  let realWeekJump=0; // 【v8.2 新增】本周跳绳天数（替代 consJump）
  
  // 遍历 history 的所有 key，精确匹配本周日期
  Object.keys(G.history).forEach(dateStr=>{
    if(weekDates.includes(dateStr)){
      const h=G.history[dateStr];
      if(h){
        if(h.sportType==='swim' && h.swimDone){
          realWeekSwim++;
        }
        if(h.sportType==='jump' && h.jumpCount>=1000){
          realWeekJump++;
        }
      }
    }
  });
  
  // 也算上今天（如果今天已完成运动，但 history 里还没有今天的记录）
  const todayDs=todayDate.toDateString();
  const todayHistRec=G.history[todayDs];
  if(G.swimDone && SWIM.includes(todayDow)){
    if(!todayHistRec || !todayHistRec.swimDone){
      realWeekSwim++;
    }
  }
  if(G.tasks.sport && JUMP.includes(todayDow) && G.jumpCount>=1500){
    if(!todayHistRec || todayHistRec.sportType!=='jump' || todayHistRec.jumpCount<1000){
      realWeekJump++;
    }
  }
  
  if(realWeekSwim!==G.weekSwim){
    console.log('[修复] weekSwim:',G.weekSwim,'→',realWeekSwim);
    G.weekSwim=realWeekSwim;
  }
  
  // 【v8.2 修复】weekJump 替代 consJump
  if(realWeekJump!==G.consJump){
    console.log('[修复] weekJump(consJump):',G.consJump,'→',realWeekJump);
    G.consJump=realWeekJump;
  }
  
  // 第六步：根据本周实际数据更新成就状态（【v8.5】支持跨周重置）
  if(G.weekSwim>=2 && !G.ach.waterSpirit){
    G.ach.waterSpirit=true;
    console.log('[修复] 水中精灵成就已解锁');
  } else if(G.weekSwim<2 && G.ach.waterSpirit){
    G.ach.waterSpirit=false;
    console.log('[修复] 水中精灵成就已重置（本周未达标）');
  }
  if(G.consJump>=3 && !G.ach.jumpHero){
    G.ach.jumpHero=true;
    console.log('[修复] 跳绳小英雄成就已解锁');
  } else if(G.consJump<3 && G.ach.jumpHero){
    G.ach.jumpHero=false;
    console.log('[修复] 跳绳小英雄成就已重置（本周未达标）');
  }
  
  // 【v8.6】好习惯之星：根据当天习惯状态更新
  const allHabitsDone=Object.values(G.habits).every(v=>v);
  if(allHabitsDone && !G.ach.goodHabit){
    G.ach.goodHabit=true;
    console.log('[修复] 好习惯之星成就已解锁（当天习惯全部达标）');
  } else if(!allHabitsDone && G.ach.goodHabit){
    G.ach.goodHabit=false;
    console.log('[修复] 好习惯之星成就已重置（当天习惯未全部达标）');
  }
  
  // 【v8.7】故事导演权：
  // - dirUnlockedEver 为 true → 徽章永久保留（在 updateStatus 中显示）
  // - storyDirector 成就跟随新周期：新一轮达到7天才重新解锁
  if(G.dirUnlockedDate){
    // 已解锁过，检查新一轮是否再次达到7天
    if(G.totalDays>=7){
      if(!G.ach.storyDirector){
        G.ach.storyDirector=true;
        console.log('[修复] 故事导演权新周期达成！');
      }
    } else {
      if(G.ach.storyDirector){
        G.ach.storyDirector=false;
        console.log('[修复] 故事导演权新周期进行中，成就重置（但徽章保留）');
      }
    }
  }
}

// ===== 超时 fetch =====
function fetchWithTimeout(url, options={}, timeout=15000){
  return Promise.race([
    fetch(url, options),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('请求超时')),timeout))
  ]);
}
// 带自动重试的 fetch（默认重试 2 次，共 3 次尝试）
async function fetchWithRetry(url, options={}, timeout=15000, maxRetries=2){
  let lastError;
  for(let i=0;i<=maxRetries;i++){
    try{
      const resp=await fetchWithTimeout(url, options, timeout);
      return resp;
    }catch(e){
      lastError=e;
      console.log(`[fetchRetry] 第${i+1}次失败:`,e.message,i<maxRetries?'，即将重试...':'，已用尽重试次数');
      if(i<maxRetries) await new Promise(r=>setTimeout(r,1000*(i+1))); // 递增等待
    }
  }
  throw lastError;
}

// ===== 云端存储 =====
// blobId 多重存取工具（防止 localStorage 部分丢失导致 blobId 找不到）
function saveBlobId(user, blobId){
  localStorage.setItem('storyGame_blobId_'+user, blobId);
  localStorage.setItem(BLOBID_BACKUP_PREFIX+user, blobId);
  // 尝试写入 sessionStorage 作为第三重备份
  try{ sessionStorage.setItem('storyGame_blobId_'+user, blobId); }catch(e){}
  console.log('[blobId] 已保存, user=',user,', id=',blobId);
}
function getBlobId(user){
  // 【v6.0】优先使用硬编码的固定 blobId（跨域名不丢失）
  if(FIXED_BLOB_IDS[user]) return FIXED_BLOB_IDS[user];
  // 兼容：如果没有硬编码，回退到 localStorage
  return localStorage.getItem('storyGame_blobId_'+user)
    || localStorage.getItem(BLOBID_BACKUP_PREFIX+user)
    || (function(){ try{ return sessionStorage.getItem('storyGame_blobId_'+user); }catch(e){ return null; } })();
}

// ===== 【v11.3】GitHub Gist 云端保存函数 =====
async function cloudSave(data){
  try{
    // 检查是否有 GitHub Token
    const token = getGitHubToken();
    if (!token) {
      console.warn('[cloudSave] 未配置 GitHub Token，跳过云端同步');
      updateSyncUI('offline');
      return false;
    }

    updateSyncUI('syncing');
    
    // 【修复】先尝试获取 gistId（从 localStorage 或自动发现）
    let gistId = getGistId(currentUser);
    if (!gistId) {
      console.log('[cloudSave] 无 gistId，尝试自动发现...');
      gistId = await discoverGist();
    }
    
    // 构造 Gist API 请求体
    const fileName = GIST_FILENAME;
    const gistData = {
      description: GIST_DESC_PREFIX + currentUser,
      public: false, // 私有 Gist
      files: {
        [fileName]: {
          content: JSON.stringify(data, null, 2)
        }
      }
    };

    if (gistId) {
      // 有 gistId，更新现有 Gist
      console.log('[cloudSave] 开始更新 Gist, gistId=', gistId);
      
      const resp = await fetchWithRetry(`${GITHUB_API}/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gistData)
      }, 15000, 2);

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        
        // 【v11.5 修复】处理 409 Conflict（版本冲突）
        if (resp.status === 409) {
          console.warn('[cloudSave] ⚠️ 检测到版本冲突(409)，先拉取最新版本再重试...');
          showToast('⚠️ 检测到版本冲突，正在自动修复...');
          
          // 先拉取最新版本到本地（cloudLoad() 内部会调用 save() 保存合并后的数据）
          await cloudLoad();
          
          // 递归调用自己（最多重试 1 次，避免无限递归）
          if (!window._cloudSaveRetrying) {
            window._cloudSaveRetrying = true;
            console.log('[cloudSave] 重新尝试同步...');
            await cloudSave();
            window._cloudSaveRetrying = false;
          } else {
            console.error('[cloudSave] ❌ 递归重试失败，放弃同步');
            throw new Error(`409 冲突修复失败`);
          }
        } else {
          throw new Error(`更新 Gist 失败: ${resp.status} ${resp.statusText} - ${errText}`);
        }
      }

      console.log('[cloudSave] ✅ Gist 更新成功, gistId=', gistId);
    } else {
      // 没有 gistId，创建新 Gist
      console.log('[cloudSave] 开始创建新 Gist...');
      
      const resp = await fetchWithRetry(`${GITHUB_API}/gists`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gistData)
      }, 15000, 2);

      if (resp.ok) {
        const result = await resp.json();
        const newGistId = result.id;
        saveGistId(currentUser, newGistId);
        console.log('[cloudSave] ✅ Gist 创建成功, newGistId=', newGistId);
      } else {
        const errText = await resp.text().catch(() => '');
        throw new Error(`创建 Gist 失败: ${resp.status} ${resp.statusText} - ${errText}`);
      }
    }
    
    updateSyncUI('done');
    return true;
  } catch(e) {
    console.error('[cloudSave] ❌ 云端同步失败:', e.message);
    
    // Token 无效时提示用户重新配置
    if (e.message.includes('401')) {
      showToast('⚠️ GitHub Token 无效或已过期，请在设置中重新配置');
      clearGitHubToken(); // 401 才是 Token 无效，需要清除
    } else if (e.message.includes('403') && e.message.includes('rate limit')) {
      // 403 且包含 rate limit 是 API 频率超限，不要清除 Token
      console.warn('[cloudSave] ⚠️ GitHub API 频率超限，将在下次重试');
      showToast('⚠️ GitHub API 频率超限，请稍后再试');
    } else if (e.message.includes('403')) {
      // 其他 403 错误，可能是 Token 权限不足
      console.warn('[cloudSave] ⚠️ GitHub API 403 错误:', e.message);
      showToast('⚠️ GitHub Token 权限不足，请重新生成 Token（需勾选 gist 权限）');
    } else if (e.message.includes('409')) {
      // 【v11.5 新增】409 Conflict 处理
      console.warn('[cloudSave] ⚠️ 版本冲突(409)，已自动修复');
      showToast('✅ 版本冲突已自动修复，数据已合并');
    } else {
      showToast('⚠️ 云端同步失败: ' + e.message.substring(0, 50));
    }
    
    updateSyncUI('offline');
    return false;
  }
}

// ===== 【v11.3】GitHub Gist 云端加载 =====
async function cloudLoad(){
  try{
    // 检查是否有 GitHub Token
    const token = getGitHubToken();
    if (!token) {
      console.warn('[cloudLoad] 未配置 GitHub Token，跳过云端加载');
      updateSyncUI('offline');
      return false;
    }

    updateSyncUI('syncing');
    
    // 【修复】先尝试从 localStorage 获取 gistId
    let gistId = getGistId(currentUser);
    
    // 如果 localStorage 中没有，尝试自动发现
    if (!gistId) {
      console.log('[cloudLoad] localStorage 中无 gistId，尝试自动发现...');
      gistId = await discoverGist();
    }
    
    if(!gistId){
      console.log('[cloudLoad] 无 gistId，跳过云端加载');
      updateSyncUI('done');
      return false;
    }
    
    // gistId 存在，确保 localStorage 中也有备份
    saveGistId(currentUser, gistId);
    
    console.log('[cloudLoad] 开始加载, gistId=', gistId, ', isFirstLoad=', isFirstLoad);
    
    // 使用 GitHub Gist API 加载数据
    const resp = await fetchWithRetry(`${GITHUB_API}/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }, 20000, 2);
    
    if(resp.ok){
      const gist = await resp.json();
      const fileName = GIST_FILENAME;
      
      if (!gist.files || !gist.files[fileName]) {
        console.warn('[cloudLoad] Gist 中未找到文件:', fileName);
        updateSyncUI('done');
        return false;
      }
      
      const fileContent = gist.files[fileName].content;
      const data = JSON.parse(fileContent);
      
      console.log('[cloudLoad] 云端数据:', JSON.stringify({
        _user: data._user,
        _version: data._version,
        _lastSync: data._lastSync,
        date: data.date,
        historyKeys: data.history ? Object.keys(data.history) : [],
        weeklyKeys: data.weekly ? Object.keys(data.weekly) : [],
        totalDays: data.totalDays,
        streak: data.streak
      }));
      
      if(data && data._user === currentUser){
        let changed = false;
        
        // 验证云端数据完整性
        const cloudHasData = (data.history && Object.keys(data.history).length > 0) ||
                              (data.weekly && Object.keys(data.weekly).length > 0) ||
                              (data.medals && data.medals.length > 0) ||
                              (data.myStories && data.myStories.length > 0);
        
        if(!cloudHasData){
          console.warn('[cloudLoad] 云端数据不完整（关键字段为空），拒绝覆盖本地数据！');
          updateSyncUI('done');
          return false;
        }
        
        // 获取本地和云端的最后同步时间
        const localKey = SYNC_STORAGE_PREFIX + currentUser;
        const localRaw = localStorage.getItem(localKey);
        let localLastSync = 0;
        if(localRaw){
          try { const ld = JSON.parse(localRaw); localLastSync = ld._lastSync || 0; } catch(e) {}
        }
        const cloudLastSync = data._lastSync || 0;
        
        console.log('[cloudLoad] 时间戳对比: 本地=', localLastSync, ' ', new Date(localLastSync).toLocaleString(), ', 云端=', cloudLastSync, ' ', new Date(cloudLastSync).toLocaleString());
        
        const cloudIsNewer = cloudLastSync > localLastSync;
        
        // 【v11.4 修复】改为 if(false)，让智能合并分支永远执行，不再执行"完整恢复"（会导致一端数据丢失）
        if(false){
          const mode = isFirstLoad ? '首次加载' : '云端更新(以云端/手机数据为准)';
          console.log('[cloudLoad]', mode, '，执行完整恢复...');
          
          // 完整恢复所有字段（以云端为准）
          if(data.date) G.date = data.date;
          if(typeof data.jumpCount === 'number') G.jumpCount = data.jumpCount;
          if(typeof data.swimDone === 'boolean') G.swimDone = data.swimDone;
          if(data.tasks && typeof data.tasks === 'object') G.tasks = {...G.tasks, ...data.tasks};
          if(data.habits && typeof data.habits === 'object') G.habits = {...G.habits, ...data.habits};
          if(Array.isArray(data.gems)) G.gems = [...data.gems];
          if(typeof data.streak === 'number') G.streak = data.streak;
          if(data.weekly && typeof data.weekly === 'object') G.weekly = {...data.weekly};
          if(Array.isArray(data.collected)) G.collected = [...data.collected];
          if(Array.isArray(data.myStories)) G.myStories = [...data.myStories];
          if(data.ach && typeof data.ach === 'object') G.ach = {...G.ach, ...data.ach};
          if(typeof data.consJump === 'number') G.consJump = data.consJump;
          if(typeof data.weekSwim === 'number') G.weekSwim = data.weekSwim;
          if(typeof data.totalDays === 'number') G.totalDays = data.totalDays;
          if(typeof data.dirUnlocked === 'boolean') G.dirUnlocked = data.dirUnlocked;
          if(data.dirUnlockedDate) G.dirUnlockedDate = data.dirUnlockedDate;
          if(typeof data.dirUnlockedEver === 'boolean') G.dirUnlockedEver = data.dirUnlockedEver;
          if(typeof data.dirCycleCount === 'number') G.dirCycleCount = data.dirCycleCount;
          if(data.history && typeof data.history === 'object') G.history = {...data.history};
          if(Array.isArray(data.medals)) G.medals = [...data.medals];
          if(Array.isArray(data.spinHistory)) G.spinHistory = [...data.spinHistory];
          
          // 恢复后执行跨天处理
          const today = new Date().toDateString();
          if(G.date && G.date !== today){
            console.log('[cloudLoad] 恢复后检测到跨天: 上次=', G.date, ', 今天=', today);
            handleDayChange(G.date, today);
          } else if(!G.date){
            G.date = today;
          }
          
          changed = true;
          isFirstLoad = false;
          console.log('[cloudLoad] 完整恢复完成, history keys=', Object.keys(G.history), ', weekly keys=', Object.keys(G.weekly));
        } else {
          // 本地更新或时间相同：智能合并
          console.log('[cloudLoad] 本地数据较新或相同，执行智能合并...');
          
          // 【v11.4 修复】合并 history（正确的合并逻辑，而非覆盖）
          if(data.history){
            Object.keys(data.history).forEach(dateStr => {
              const cloudRec = data.history[dateStr];
              const localRec = G.history[dateStr];
              
              if(!localRec){
                // 本地没有这条记录，直接添加
                G.history[dateStr] = cloudRec;
                changed = true;
                console.log('[cloudLoad] 合并缺失历史:', dateStr);
              } else if(cloudRec && cloudRec.tasks && localRec.tasks){
                // 两端都有这条记录，合并 tasks（OR 逻辑）
                let tasksChanged = false;
                Object.keys(localRec.tasks).forEach(k => {
                  if(cloudRec.tasks[k] && !localRec.tasks[k]){
                    localRec.tasks[k] = true;
                    tasksChanged = true;
                  }
                });
                // 合并 allDone（OR 逻辑）
                if(cloudRec.allDone && !localRec.allDone){
                  localRec.allDone = true;
                  tasksChanged = true;
                }
                // 合并 story
                if(cloudRec.story && !localRec.story){
                  localRec.story = cloudRec.story;
                  tasksChanged = true;
                }
                if(tasksChanged){
                  changed = true;
                  console.log('[cloudLoad] 合并历史记录（OR 逻辑）:', dateStr);
                }
              }
            });
          }
          // 合并 weekly
          if(data.weekly){
            Object.keys(data.weekly).forEach(dateStr => {
              const cloudVal = data.weekly[dateStr];
              const localVal = G.weekly[dateStr];
              const valRank = v => v === true ? 3 : v === 'partial' ? 2 : v === false ? 1 : 0;
              if(valRank(cloudVal) > valRank(localVal)){
                G.weekly[dateStr] = cloudVal;
                changed = true;
              }
            });
          }
          // 【v11.4 修复】合并今日数据（使用正确的合并逻辑，而非覆盖）
          const today = new Date().toDateString();
          
          // 合并今日任务（OR 逻辑：一端完成即为完成）
          if(data.date === today && G.date === today){
            if(data.tasks && G.tasks){
              let tasksChanged = false;
              Object.keys(G.tasks).forEach(k => {
                if(data.tasks[k] && !G.tasks[k]){
                  G.tasks[k] = true;
                  tasksChanged = true;
                }
              });
              if(tasksChanged){
                changed = true;
                console.log('[cloudLoad] 合并今日任务（OR 逻辑）');
              }
            }
          }
          
          // 合并 jumpCount（取最大值，谁跳得多用谁）
          if(typeof data.jumpCount === 'number' && data.jumpCount > G.jumpCount){
            G.jumpCount = data.jumpCount;
            changed = true;
            console.log('[cloudLoad] 合并 jumpCount=', G.jumpCount);
          }
          
          // 合并 swimDone（OR 逻辑）
          if(data.swimDone && !G.swimDone){
            G.swimDone = true;
            changed = true;
            console.log('[cloudLoad] 合并 swimDone=true');
          }
          
          // 合并 habits（OR 逻辑：一端完成即为完成）
          if(data.habits && G.habits){
            Object.keys(G.habits).forEach(k => {
              if(data.habits[k] && !G.habits[k]){
                G.habits[k] = true;
                changed = true;
              }
            });
          }
          
          // 合并 gems（并集：合并两端收集的宝石）
          if(Array.isArray(data.gems)){
            const existingKeys = new Set(G.gems.map(g => JSON.stringify(g)));
            data.gems.forEach(g => {
              const key = JSON.stringify(g);
              if(!existingKeys.has(key)){
                G.gems.push(g);
                changed = true;
              }
            });
          }
          // 合并 collected 和 myStories
          if(Array.isArray(data.collected)){
            const existingTitles = new Set(G.collected.map(s => s.title + s.date));
            data.collected.forEach(s => {
              if(!existingTitles.has(s.title + s.date)){
                G.collected.push(s);
                changed = true;
              }
            });
          }
          if(Array.isArray(data.myStories)){
            const existingStories = new Set(G.myStories.map(s => s.text));
            data.myStories.forEach(s => {
              if(!existingStories.has(s.text)){
                G.myStories.push(s);
                changed = true;
              }
            });
          }
          // 合并成就
          if(data.ach){
            Object.keys(data.ach).forEach(k => {
              if(k === 'jumpHero' || k === 'waterSpirit' || k === 'goodHabit' || k === 'storyDirector') return;
              if(data.ach[k] && !G.ach[k]){
                G.ach[k] = true;
                changed = true;
              }
            });
          }
          if(data.dirUnlocked && !G.dirUnlocked) { G.dirUnlocked = true; changed = true; }
          if(data.dirUnlockedDate && !G.dirUnlockedDate) { G.dirUnlockedDate = data.dirUnlockedDate; changed = true; }
          if(data.dirUnlockedEver && !G.dirUnlockedEver) { G.dirUnlockedEver = true; changed = true; }
          if(typeof data.dirCycleCount === 'number' && data.dirCycleCount > G.dirCycleCount) { G.dirCycleCount = data.dirCycleCount; changed = true; }
          // 合并勋章
          if(Array.isArray(data.medals)){
            const existingWeekIds = new Set(G.medals.map(m => m.weekId));
            data.medals.forEach(m => {
              if(m.weekId && !existingWeekIds.has(m.weekId)){
                G.medals.push(m);
                changed = true;
              } else if(m.weekId && existingWeekIds.has(m.weekId)){
                const localMedal = G.medals.find(lm => lm.weekId === m.weekId);
                if(localMedal && m.redeemed && !localMedal.redeemed){
                  localMedal.redeemed = true;
                  localMedal.redeemedDate = m.redeemedDate;
                  changed = true;
                }
              }
            });
          }
          // 合并转盘记录
          if(Array.isArray(data.spinHistory)){
            const existingSpins = new Set(G.spinHistory.map(s => s.triggerMedalIndex));
            data.spinHistory.forEach(s => {
              if(!existingSpins.has(s.triggerMedalIndex)){
                G.spinHistory.push(s);
                changed = true;
              }
            });
          }
        }
        
        if(changed){
          console.log('[cloudLoad] 数据已更新，执行修复并保存');
          repairData();
          save();
          initGame();
        } else {
          console.log('[cloudLoad] 云端无新数据需要合并');
        }
        updateSyncUI('done');
        return changed;
      } else {
        console.log('[cloudLoad] 云端数据用户不匹配:', data && data._user, '!==', currentUser);
      }
      } else {
        const errText = await resp.text().catch(() => '');
        console.log('[cloudLoad] HTTP 错误:', resp.status, errText);
        
        // 区分 401 和 403 错误
        if (resp.status === 401) {
          console.error('[cloudLoad] Token 无效，已清除');
          clearGitHubToken();
          showToast('⚠️ GitHub Token 无效或已过期，请在设置中重新配置');
        } else if (resp.status === 403 && errText.includes('rate limit')) {
          // 403 且包含 rate limit 是 API 频率超限，不要清除 Token
          console.warn('[cloudLoad] ⚠️ GitHub API 频率超限，将在下次重试');
        } else if (resp.status === 403) {
          // 其他 403 错误，可能是权限不足
          console.warn('[cloudLoad] ⚠️ GitHub API 403 错误:', errText);
        }
      }
    updateSyncUI('done');
    return false;
  } catch(e) {
    console.error('[cloudLoad] ❌ 云端加载失败:', e.message);
    updateSyncUI('offline');
    // 如果是首次加载但云端也失败了，保存空状态（但不覆盖云端）
    if(isFirstLoad){
      isFirstLoad = false;
      const key = SYNC_STORAGE_PREFIX + currentUser;
      const data = {...G, _user: currentUser, _avatar: selectedAvatar, _lastSync: Date.now(), _version: 'v11.3'};
      localStorage.setItem(key, JSON.stringify(data));
      console.log('[cloudLoad] 首次加载云端失败，仅保存到本地（不覆盖云端）');
    }
    return false;
  }
}

function updateSyncUI(status){
  const dot=document.getElementById('syncDot');
  const loginSync=document.getElementById('syncStatus');
  const syncInfo=document.getElementById('syncInfo');
  const offlineTip=document.getElementById('offlineTip');
  const syncDetailStatus=document.getElementById('syncDetailStatus');
  
  if(status==='syncing'){
    if(dot)dot.textContent='🔄';
    if(loginSync)loginSync.textContent='🔄 正在同步...';
    if(syncInfo)syncInfo.textContent='☁️ 正在同步...';
    if(syncDetailStatus)syncDetailStatus.textContent='🔄 正在同步云端数据...';
    // 隐藏离线提示
    if(offlineTip) offlineTip.style.display='none';
  }else if(status==='done'){
    if(dot)dot.textContent='☁️';
    const timeStr=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
    if(loginSync)loginSync.textContent='✅ 云端已同步';
    if(syncInfo)syncInfo.textContent='☁️ 已同步 ('+timeStr+')';
    if(syncDetailStatus)syncDetailStatus.textContent='✅ 云端同步正常（最后同步：'+timeStr+'）';
    // 隐藏离线提示
    if(offlineTip) offlineTip.style.display='none';
  }else{
    if(dot)dot.textContent='📴';
    if(loginSync)loginSync.textContent='📴 离线模式（数据存在本地）';
    if(syncInfo)syncInfo.textContent='📴 离线模式';
    if(syncDetailStatus)syncDetailStatus.textContent='⚠️ 离线模式（请先配置 GitHub Token）';
    // 【v11.3 新增】显示离线提示
    if(offlineTip) offlineTip.style.display='block';
  }
}

// ===== 【v11.3 修复】手动同步（添加详细错误日志） =====
async function manualSync(){
  if(!currentUser){showToast('请先登录');return;}
  const btn=document.getElementById('btnManualSync');
  if(btn){btn.disabled=true;btn.textContent='⏳ 同步中...';}
  
  try{
    // 步骤1：从云端拉取最新数据
    console.log('[manualSync] 步骤1/3：开始 cloudLoad()...');
    try {
      await cloudLoad();
      console.log('[manualSync] ✅ 步骤1 完成：cloudLoad 成功');
    } catch(e) {
      console.error('[manualSync] ❌ 步骤1 失败：cloudLoad 抛出异常', e.message);
      throw e; // 重新抛出异常，让外层 catch 处理
    }
    
    // 步骤2：准备数据
    console.log('[manualSync] 步骤2/3：准备数据...');
    const data={...G, _user:currentUser, _avatar:selectedAvatar, _lastSync:Date.now(), _version:'v11.3'};
    console.log('[manualSync] 数据大小:', JSON.stringify(data).length, 'bytes');
    
    // 步骤3：上传到云端
    console.log('[manualSync] 步骤3/3：开始 cloudSave()...');
    let saveOk = false;
    try {
      saveOk = await cloudSave(data);
      console.log('[manualSync] cloudSave 返回结果:', saveOk);
    } catch(e) {
      console.error('[manualSync] ❌ 步骤3 失败：cloudSave 抛出异常', e.message);
      throw e; // 重新抛出异常
    }
    
    if(saveOk){
      showToast('☁️ 云端同步成功！');
      console.log('[manualSync] ✅ 同步成功');
    }else{
      console.error('[manualSync] ❌ cloudSave 返回 false');
      showToast('⚠️ 同步失败，请检查网络后重试');
    }
  }catch(e){
    console.error('[manualSync] ❌ 手动同步失败:', e.message);
    console.error('[manualSync] 错误堆栈:', e.stack);
    showToast('⚠️ 同步失败: '+e.message);
  }finally{
    if(btn){btn.disabled=false;btn.textContent='☁️ 手动同步';}
  }
}


// ===== 【v11.1】数据导出/导入（防止数据丢失）=====
// 【v11.3】增强导出功能
function exportData(){
  if(!currentUser){showToast('请先登录');return;}
  
  const now = new Date();
  const data = {
    // 元数据
    exportDate: now.toISOString(),
    exportDateLocale: now.toLocaleString('zh-CN'),
    version: 'v11.3',
    userId: currentUser,
    
    // 核心数据（从 G 对象展开）
    ...G,
    
    // 额外元数据
    _user: currentUser,
    _avatar: selectedAvatar,
    _lastSync: Date.now(),
    _version: 'v11.3'
  };
  
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const today = now.toISOString().split('T')[0];
  a.download = `故事收集家-备份-${today}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  // 更新最后导出时间
  localStorage.setItem('storyGame_' + currentUser + '_lastExport', Date.now().toString());
  
  showToast('✅ 数据已导出！建议每7天备份一次');
  console.log('[export] 数据已导出, 大小=', json.length, 'bytes');
}

function importData(){
  if(!currentUser){showToast('请先登录');return;}
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e){
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(ev){
      try{
        const data = JSON.parse(ev.target.result);
        if(!data._user || data._user !== currentUser){
          showToast('⚠️ 数据文件用户不匹配！');
          return;
        }
        // 恢复数据
        Object.keys(data).forEach(k=>{
          if(k.startsWith('_')) return;
          if(k==='history' && data[k]){Object.assign(G.history, data[k]);}
          else if(k==='weekly' && data[k]){Object.assign(G.weekly, data[k]);}
          else if(k==='medals' && Array.isArray(data[k])){G.medals=[...data[k]];}
          else if(k==='myStories' && Array.isArray(data[k])){G.myStories=[...data[k]];}
          else if(k==='collected' && Array.isArray(data[k])){G.collected=[...data[k]];}
          else if(k==='ach' && data[k]){G.ach={...G.ach,...data[k]};}
          else if(k==='tasks' && data[k]){G.tasks={...G.tasks,...data[k]};}
          else if(k==='habits' && data[k]){G.habits={...G.habits,...data[k]};}
          else if(typeof data[k]!=='object'){G[k]=data[k];}
        });
        repairData();
        save();
        initGame();
        showToast('✅ 数据已恢复！');
        console.log('[import] 数据已导入恢复');
      }catch(e){
        showToast('⚠️ 文件格式错误！');
        console.error('[import] 解析失败:',e);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// 自动备份到 sessionStorage（防丢）
function autoBackup(){
  if(!currentUser) return;
  try{
    const data = {...G, _backupTime:Date.now()};
    sessionStorage.setItem('storyGame_backup_'+currentUser, JSON.stringify(data));
  }catch(e){}
}
// 轻量级提示
function showToast(msg){
  let t=document.getElementById('syncToast');
  if(!t){
    t=document.createElement('div');
    t.id='syncToast';
    t.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:12px 24px;border-radius:20px;font-size:14px;z-index:9999;transition:opacity 0.3s;pointer-events:none;backdrop-filter:blur(10px);';
    document.body.appendChild(t);
  }
  t.textContent=msg;t.style.opacity=1;
  setTimeout(()=>{t.style.opacity=0},3000);
}

// ===== 登录 =====
const ACCOUNT_NAME='棠棠';
const ACCOUNT_PWD='2068';
const ACCOUNT_AVATAR='👧';

async function doLogin(){
  const input=document.getElementById('passwordInput');
  const pwd=input.value.trim();
  if(!pwd){
    showLoginHint('请输入密码哦~ 🔑');
    input.focus();
    return;
  }
  if(pwd!==ACCOUNT_PWD){
    showLoginHint('密码不对哦，再试试~ ❌');
    input.value='';
    input.focus();
    const card=document.querySelector('.login-card');
    card.style.animation='none';
    card.offsetHeight;
    card.style.animation='loginShake 0.5s ease';
    return;
  }
  
  const btn=document.getElementById('loginBtn');
  btn.disabled=true;
  btn.textContent='⏳ 正在连接云端...';
  
  currentUser=ACCOUNT_NAME;
  selectedAvatar=ACCOUNT_AVATAR;
  localStorage.setItem('storyGame_currentUser',ACCOUNT_NAME);
  localStorage.setItem('storyGame_currentAvatar',ACCOUNT_AVATAR);
  localStorage.setItem('storyGame_loginVer','v4');
  
  // 加载本地数据
  load();
  
  // 【v7.0】等待云端数据恢复（带进度提示）
  btn.textContent='⏳ 正在从云端恢复数据...';
  try{
    await cloudLoad();
    btn.textContent='✅ 数据已同步！';
  }catch(e){
    console.log('[doLogin] 云端加载失败，使用本地数据',e);
    btn.textContent='⚠️ 使用本地数据进入...';
  }
  
  // 短暂显示结果后进入游戏
  await new Promise(r=>setTimeout(r,500));
  
  // 显示游戏界面
  document.getElementById('loginOverlay').style.display='none';
  document.getElementById('appContainer').style.display='';
  document.querySelector('.bottom-nav').style.display='';
  
  document.querySelector('.avatar').textContent=ACCOUNT_AVATAR;
  const crown=document.getElementById('crownIcon');
  if(crown)document.querySelector('.avatar').innerHTML=ACCOUNT_AVATAR+'<span class="crown" id="crownIcon" '+(G.totalDays>=7?'':'style="display:none"')+'>👑</span>';
  document.getElementById('playerName').textContent=ACCOUNT_NAME;
  
  initGame();
  
  btn.disabled=false;
  btn.textContent='🚀 开始冒险！';
  
  if(syncTimer)clearInterval(syncTimer);
  syncTimer=setInterval(async ()=>{
    if(!currentUser)return;
    try{
      await cloudLoad();
      await cloudSave({...G,_user:currentUser,_avatar:selectedAvatar,_lastSync:Date.now(),_version:'v11.3'});
    }catch(e){console.log('[autoSync] 自动同步失败:',e.message);}
  },30000);
}

function doLogout(){
  if(confirm('确定要退出登录吗？')){
    save(); // 先保存
    currentUser=null;
    localStorage.removeItem('storyGame_currentUser');
    if(syncTimer){clearInterval(syncTimer);syncTimer=null;}
    // 重置 G 为干净状态（不清除 localStorage 中保存的数据！）
    G=makeDefaultState();
    document.getElementById('loginOverlay').style.display='';
    document.getElementById('appContainer').style.display='none';
    document.querySelector('.bottom-nav').style.display='none';
    document.getElementById('passwordInput').value='';
    document.getElementById('passwordInput').focus();
  }
}

function showLoginHint(msg){
  const h=document.getElementById('loginHint');
  h.textContent=msg;h.style.opacity=1;
  setTimeout(()=>{h.style.opacity=0},3000);
}

// ===== 彩虹闪光粒子 =====
function createStars(){
  const c=document.getElementById('starsContainer');c.innerHTML='';
  const colors=['#FF6FB7','#A855F7','#4A7CF7','#FFD700','#22D3EE','#FB7185','#60A5FA','#FBBF24','#34D399','#DA77F2'];
  for(let i=0;i<45;i++){
    const s=document.createElement('div');s.className='star';
    s.style.left=Math.random()*100+'%';s.style.top=Math.random()*100+'%';
    s.style.setProperty('--d',(2+Math.random()*5)+'s');
    s.style.setProperty('--o',(0.4+Math.random()*0.6));
    s.style.animationDelay=Math.random()*5+'s';
    const sz=(3+Math.random()*5)+'px';s.style.width=sz;s.style.height=sz;
    const color=colors[~~(Math.random()*colors.length)];
    s.style.background=color;
    s.style.color=color;
    s.style.boxShadow=`0 0 ${4+Math.random()*8}px ${color}`;
    c.appendChild(s);
  }
}

// ===== 页面切换 =====
function switchPage(p,el){
  document.querySelectorAll('.page').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active'));
  const map={
    home:'homePage',
    achieve:'achievePage',
    treasure:'treasurePage',
    recovery:'recoveryPage'
  };
  const pageId = map[p];
  if(pageId) {
    document.getElementById(pageId).classList.add('active');
    // 如果是补录页面，初始化补录工具
    if(p === 'recovery') {
      initRecoveryTool();
    }
  }
  if(el)el.classList.add('active');
}

// ===== 日期导航（无限历史 + 月历快速跳转） =====
let weekOffset=0; // 0=本周，-1=上周，-2=上上周...
let touchStartX=0;
let touchStartY=0;
let calendarPickerOpen=false;

// 获取最早有数据的日期
function getEarliestDate(){
  const allDates=Object.keys(G.history).concat(Object.keys(G.weekly));
  if(allDates.length===0) return new Date();
  let earliest=new Date();
  allDates.forEach(ds=>{
    const d=new Date(ds);
    if(!isNaN(d.getTime()) && d<earliest) earliest=d;
  });
  return earliest;
}

// 计算某个日期距离本周的周偏移量（【v8.4】以周一为起始）
function dateToWeekOffset(targetDate){
  const today=new Date();
  const todayMDow=mondayDow(today);
  const thisWeekStart=new Date(today);
  thisWeekStart.setDate(today.getDate()-todayMDow);
  thisWeekStart.setHours(0,0,0,0);
  
  const targetMDow=mondayDow(targetDate);
  const targetWeekStart=new Date(targetDate);
  targetWeekStart.setDate(targetDate.getDate()-targetMDow);
  targetWeekStart.setHours(0,0,0,0);
  
  const diffDays=Math.round((targetWeekStart-thisWeekStart)/(1000*60*60*24));
  return Math.round(diffDays/7);
}

function renderDateNav(){
  const nav=document.getElementById('dateNav');nav.innerHTML='';
  const today=new Date(),todayMDow=mondayDow(today);
  
  // 【v8.4】计算目标周的周一（起始日）
  const weekStartDate=new Date(today);
  weekStartDate.setDate(today.getDate()-todayMDow+weekOffset*7);
  
  const isCurrentWeek=(weekOffset===0);
  
  // 计算最早可回溯的周偏移
  const earliest=getEarliestDate();
  const minOffset=dateToWeekOffset(earliest);
  const canGoBack=(weekOffset>minOffset-1); // 允许多看一周
  
  // 顶部控制栏：< 周标题（可点击打开月历） >
  const ctrl=document.createElement('div');
  ctrl.className='week-ctrl';
  const weekEndDate=new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate()+6);
  const weekLabel=`${weekStartDate.getFullYear()}年${weekStartDate.getMonth()+1}月${weekStartDate.getDate()}日 - ${weekEndDate.getMonth()+1}月${weekEndDate.getDate()}日`;
  
  ctrl.innerHTML=`
    <button class="week-arrow ${!canGoBack?'disabled':''}" onclick="changeWeek(-1)" ${!canGoBack?'disabled':''}>◀</button>
    <span class="week-label" onclick="toggleCalendarPicker()" style="cursor:pointer">${isCurrentWeek?'📅 本周':weekLabel} ▾</span>
    <button class="week-arrow ${isCurrentWeek?'disabled':''}" onclick="changeWeek(1)" ${isCurrentWeek?'disabled':''}>▶</button>
  `;
  nav.appendChild(ctrl);
  
  // 如果不是本周，显示"回到本周"按钮
  if(!isCurrentWeek){
    const backBtn=document.createElement('div');
    backBtn.className='back-to-today';
    backBtn.innerHTML='<button onclick="goToCurrentWeek()">📍 回到本周</button>';
    nav.appendChild(backBtn);
  }
  
  // 日期格子容器
  const daysRow=document.createElement('div');
  daysRow.className='days-row';
  
  for(let i=0;i<7;i++){
    const d=new Date(weekStartDate);
    d.setDate(weekStartDate.getDate()+i);
    const ds=d.toDateString();
    const isToday=ds===today.toDateString();
    const isFuture=d>today&&!isToday;
    const dw=d.getDay(),isJ=JUMP.includes(dw),isS=SWIM.includes(dw);
    const status=G.weekly[ds];
    // 也检查 history 中是否有数据（有些旧数据可能只在 history 里）
    const hasHistory=G.history&&G.history[ds];
    const div=document.createElement('div');
    let cls='day-item';
    if(isToday)cls+=' active';
    if(isJ)cls+=' jd';
    if(isS)cls+=' sd';
    if(status===true)cls+=' done';
    else if(status==='partial')cls+=' partial';
    else if(hasHistory)cls+=' has-data'; // 有历史数据但没有 weekly 标记
    if(isFuture)cls+=' future';
    div.className=cls;
    
    let statusIcon='';
    if(isToday){
      statusIcon='';
    }else if(status===true){
      statusIcon='<div class="day-status">✅</div>';
    }else if(status==='partial'){
      statusIcon='<div class="day-status">🔶</div>';
    }else if(status===false){
      statusIcon='<div class="day-status">❌</div>';
    }else if(hasHistory){
      statusIcon='<div class="day-status">📋</div>';
    }
    
    div.innerHTML=`<div class="dn">周${W[dw]}</div><div class="dd">${d.getDate()}</div>${statusIcon}`;
    
    if(!isFuture){
      div.style.cursor='pointer';
      div.onclick=(function(dateStr,isT){
        return function(){
          if(isT && isCurrentWeek) closeHistoryPanel();
          else showHistoryDetail(dateStr);
        };
      })(ds,isToday);
    }
    daysRow.appendChild(div);
  }
  nav.appendChild(daysRow);
  
  // 月历选择器（如果打开了的话）
  if(calendarPickerOpen){
    nav.appendChild(buildCalendarPicker(weekStartDate));
  }
  
  // 添加触摸滑动事件
  nav.ontouchstart=function(e){
    touchStartX=e.touches[0].clientX;
    touchStartY=e.touches[0].clientY;
  };
  nav.ontouchend=function(e){
    const dx=e.changedTouches[0].clientX-touchStartX;
    const dy=e.changedTouches[0].clientY-touchStartY;
    if(Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy)){
      if(dx>0) changeWeek(-1);
      else changeWeek(1);
    }
  };
}

function changeWeek(delta){
  const newOffset=weekOffset+delta;
  if(newOffset>0) return; // 不能超过本周
  weekOffset=newOffset;
  renderDateNav();
  closeHistoryPanel();
}

function goToCurrentWeek(){
  weekOffset=0;
  calendarPickerOpen=false;
  renderDateNav();
  closeHistoryPanel();
}

function toggleCalendarPicker(){
  calendarPickerOpen=!calendarPickerOpen;
  renderDateNav();
}

// 构建月历选择器面板
function buildCalendarPicker(currentViewDate){
  const panel=document.createElement('div');
  panel.className='calendar-picker';
  
  // 当前查看的月份
  const viewYear=currentViewDate.getFullYear();
  const viewMonth=currentViewDate.getMonth();
  
  // 头部：< 年月 >
  const header=document.createElement('div');
  header.className='cal-header';
  header.innerHTML=`
    <button class="cal-nav" onclick="calPickerNav(-1)">◀</button>
    <span class="cal-title">${viewYear}年${viewMonth+1}月</span>
    <button class="cal-nav" onclick="calPickerNav(1)">▶</button>
  `;
  panel.appendChild(header);
  
  // 星期标题行（【v8.4】周一到周日）
  const weekRow=document.createElement('div');
  weekRow.className='cal-week-row';
  ['一','二','三','四','五','六','日'].forEach(w=>{
    const span=document.createElement('span');
    span.className='cal-week-day';
    span.textContent=w;
    weekRow.appendChild(span);
  });
  panel.appendChild(weekRow);
  
  // 日期网格
  const grid=document.createElement('div');
  grid.className='cal-grid';
  
  const firstDay=new Date(viewYear,viewMonth,1);
  const startPad=mondayDow(firstDay); // 【v8.4】以周一为起始计算补位
  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
  const today=new Date();
  
  // 补空白
  for(let i=0;i<startPad;i++){
    const empty=document.createElement('div');
    empty.className='cal-day empty';
    grid.appendChild(empty);
  }
  
  // 日期格子
  for(let d=1;d<=daysInMonth;d++){
    const dateObj=new Date(viewYear,viewMonth,d);
    const ds=dateObj.toDateString();
    const cell=document.createElement('div');
    let cls='cal-day';
    
    const isFuture=dateObj>today;
    const isToday=ds===today.toDateString();
    const hasWeekly=G.weekly[ds];
    const hasHist=G.history&&G.history[ds];
    
    if(isToday) cls+=' today';
    if(isFuture) cls+=' future';
    if(hasWeekly===true) cls+=' done';
    else if(hasWeekly==='partial') cls+=' partial';
    else if(hasHist) cls+=' has-data';
    
    cell.className=cls;
    cell.textContent=d;
    
    if(!isFuture){
      cell.onclick=(function(dt){
        return function(){
          // 点击某天 → 跳到那一周
          weekOffset=dateToWeekOffset(dt);
          calendarPickerOpen=false;
          renderDateNav();
          showHistoryDetail(dt.toDateString());
        };
      })(dateObj);
    }
    grid.appendChild(cell);
  }
  panel.appendChild(grid);
  
  // 底部统计
  const stats=document.createElement('div');
  stats.className='cal-stats';
  let monthDone=0,monthPartial=0,monthTotal=0;
  for(let d=1;d<=daysInMonth;d++){
    const dateObj=new Date(viewYear,viewMonth,d);
    if(dateObj>today) break;
    const ds=dateObj.toDateString();
    monthTotal++;
    if(G.weekly[ds]===true) monthDone++;
    else if(G.weekly[ds]==='partial') monthPartial++;
  }
  stats.innerHTML=`<span>本月打卡：✅${monthDone}天 🔶${monthPartial}天 / 共${monthTotal}天</span>`;
  panel.appendChild(stats);
  
  // 存储当前月历查看的月份（用于导航）
  panel.dataset.year=viewYear;
  panel.dataset.month=viewMonth;
  
  return panel;
}

// 月历面板内的月份切换
function calPickerNav(delta){
  const panel=document.querySelector('.calendar-picker');
  if(!panel) return;
  let y=parseInt(panel.dataset.year);
  let m=parseInt(panel.dataset.month)+delta;
  if(m<0){m=11;y--;}
  if(m>11){m=0;y++;}
  
  // 不能超过当前月
  const today=new Date();
  if(y>today.getFullYear()||(y===today.getFullYear()&&m>today.getMonth())) return;
  
  // 构建新的月份的临时日期来触发重新渲染
  const tempDate=new Date(y,m,15);
  // 更新 weekOffset 到该月中旬所在的周
  weekOffset=dateToWeekOffset(tempDate);
  renderDateNav();
  // 保持月历打开
  calendarPickerOpen=true;
  renderDateNav();
}

// ===== 历史打卡详情面板 =====
function showHistoryDetail(dateStr){
  const hist=G.history&&G.history[dateStr];
  const d=new Date(dateStr);
  const dw=d.getDay();
  const dateLabel=`${d.getMonth()+1}月${d.getDate()}日 周${W[dw]}`;
  
  let panel=document.getElementById('historyPanel');
  if(!panel){
    panel=document.createElement('div');
    panel.id='historyPanel';
    panel.className='card history-panel';
    const dateNav=document.getElementById('dateNav');
    dateNav.parentNode.insertBefore(panel,dateNav.nextSibling);
  }
  panel.style.display='block';
  
  if(!hist){
    // 【v6.0】没有记录时显示补录按钮
    const isJ=JUMP.includes(dw);
    const sportLabel=isJ?'跳绳':'游泳';
    panel.innerHTML=`<div class="history-header">
      <h3>📅 ${dateLabel}</h3>
      <button class="history-close" onclick="closeHistoryPanel()">✕</button>
    </div>
    <div class="history-empty">
      <span style="font-size:36px">📭</span>
      <p>这一天没有打卡记录</p>
      <button class="btn" style="margin-top:12px;background:linear-gradient(135deg,var(--pink),var(--purple));color:white;border:none;padding:10px 20px;border-radius:12px;font-size:14px;cursor:pointer" onclick="backfillDate('${dateStr}')">📝 补录这天的打卡</button>
    </div>`;
    return;
  }
  
  const isJ=hist.sportType==='jump';
  const allDone=hist.allDone;
  
  let tasksHtml='';
  const taskLabels=[
    {k:'sport',e:isJ?'🏃‍♀️':'🏊‍♀️',t:isJ?`跳绳 ${hist.jumpCount}/${hist.jumpCount>=1000&&hist.jumpCount<=1000?1000:1500}`:(hist.swimDone?'游泳课 ✅':'游泳课 ❌')},
    {k:'homework',e:'📝',t:'完成学校作业'},
    {k:'study',e:'📖',t:'新概念学习'},
    {k:'outdoor',e:'⭐',t:'行为习惯达标'}
  ];
  taskLabels.forEach(tl=>{
    const done=hist.tasks[tl.k];
    tasksHtml+=`<div class="history-task ${done?'done':''}">
      <span class="history-task-icon">${done?'✅':'⬜'}</span>
      <span class="history-task-emoji">${tl.e}</span>
      <span class="history-task-text">${tl.t}</span>
    </div>`;
  });
  
  let habitsHtml='';
  if(hist.habits){
    const habitLabels=[
      {k:'fast',e:'⚡',t:'做事快速不拖拉'},
      {k:'tidy',e:'🥛',t:'按时吃维生素D'},
      {k:'polite',e:'🌙',t:'晚上10点前上床睡觉'}
    ];
    habitLabels.forEach(hl=>{
      const done=hist.habits[hl.k];
      habitsHtml+=`<div class="history-task ${done?'done':''}">
        <span class="history-task-icon">${done?'⭐':'☆'}</span>
        <span class="history-task-emoji">${hl.e}</span>
        <span class="history-task-text">${hl.t}</span>
      </div>`;
    });
  }
  
  const gemsCount=hist.gems?hist.gems.length:0;
  
  panel.innerHTML=`<div class="history-header">
    <h3>📅 ${dateLabel}</h3>
    <button class="history-close" onclick="closeHistoryPanel()">✕</button>
  </div>
  
  <!-- 完成状态摘要 -->
  <div class="history-summary ${allDone?'all-done':''}" style="margin-bottom:12px">
    ${allDone?'🌟 全部完成！太棒了！':'🔸 部分完成'}
    <span class="history-gems">💎 ×${gemsCount}</span>
  </div>
  
  <!-- 运动卡片（今日跳绳日/游泳日） -->
  <div class="sport-card ${isJ?'jc':'sc'}" style="margin-bottom:12px">
    <div class="sport-head">
      <div class="sport-icon">${isJ?'🏃‍♀️':'🏊‍♀️'}</div>
      <div class="sport-info">
        <h3>${isJ?'今日跳绳日 🎯':'今日游泳日 🌊'}</h3>
        <p>${isJ?'目标：跳满 1500 个':'完成今日游泳课'}</p>
      </div>
      <div style="margin-left:auto;font-size:28px">${hist.tasks.sport?'✅':'⏳'}</div>
    </div>
    <div class="progress-bg">
      <div class="progress-fill" style="width:${hist.tasks.sport?100:0}%"></div>
    </div>
    <div class="progress-txt">
      <span>${isJ?`已跳 ${hist.jumpCount||0} 个`:(hist.swimDone?'游泳课已完成':'等待完成')}</span>
    </div>
  </div>
  
  <!-- 今日故事宝石 -->
  <div class="card" style="margin-bottom:12px">
    <h4 style="font-size:15px;margin-bottom:8px">💎 今日故事宝石</h4>
    <div class="gems-grid" style="justify-content:center">
      ${['sport','homework','study','outdoor'].map(k=>{
        const gemEmoji=k==='sport'? (isJ?'🏃‍♀️':'🏊‍♀️') : k==='homework'?'📝':k==='study'?'📖':'⭐';
        const gemName=k==='sport'? (isJ?'跳绳':'游泳') : k==='homework'?'作业':'学习';
        const isActive=hist.gems&&hist.gems.includes(k);
        return `<div class="gem ${isActive?'active':''}" style="width:60px;height:60px;font-size:24px;cursor:default">
          ${isActive?gemEmoji:'🔒'}
          <div class="gem-label" style="font-size:10px;margin-top:2px">${isActive?gemName:'未解锁'}</div>
        </div>`;
      }).join('')}
    </div>
  </div>
  
  <!-- 每日冒险任务 -->
  <div class="card" style="margin-bottom:12px">
    <h4 style="font-size:15px;margin-bottom:8px">📋 每日冒险任务</h4>
    ${tasksHtml}
  </div>
  
  <!-- 今日故事 -->
  ${hist.story?`<div class="card" style="margin-bottom:12px">
    <h4 style="font-size:15px;margin-bottom:8px">📖 今日故事</h4>
    <div class="story-book" style="padding:16px">
      <span class="book-icon">📚</span>
      <h4>${hist.storyTitle||'今日故事'}</h4>
      <p style="font-size:13px;line-height:1.6;color:var(--t2)">${hist.story}</p>
    </div>
  </div>`:''}
  
  <!-- 今日行为习惯 -->
  ${habitsHtml?`<div class="card" style="margin-bottom:12px">
    <h4 style="font-size:15px;margin-bottom:8px">⭐ 今日行为习惯</h4>
    ${habitsHtml}
  </div>`:''}
  
  <!-- 关闭按钮 -->
  <div style="text-align:center;margin-top:16px">
    <button class="btn" style="background:linear-gradient(135deg,var(--pink),var(--purple));color:white;border:none;padding:10px 24px;border-radius:12px;font-size:14px;cursor:pointer" onclick="closeHistoryPanel()">✅ 关闭</button>
  </div>
</div>`;
  
  // 滚动到面板位置
  panel.scrollTop=0;
}

function closeHistoryPanel(){
  const panel=document.getElementById('historyPanel');
  if(panel)panel.style.display='none';
}

// ===== 【v6.0】补录历史打卡 =====
function backfillDate(dateStr){
  const d=new Date(dateStr);
  const dw=d.getDay();
  const isJ=JUMP.includes(dw);
  const dateLabel=`${d.getMonth()+1}月${d.getDate()}日 周${W[dw]}`;
  
  const panel=document.getElementById('historyPanel');
  if(!panel)return;
  
  panel.innerHTML=`<div class="history-header">
    <h3>📝 补录 ${dateLabel}</h3>
    <button class="history-close" onclick="closeHistoryPanel()">✕</button>
  </div>
  <div style="padding:8px 0">
    <p style="font-size:13px;color:var(--t3);margin-bottom:12px">勾选这天完成的项目：</p>
    <div class="backfill-item" onclick="toggleBackfill(this,'sport')">
      <span class="bf-cb" id="bf_sport">⬜</span>
      <span>${isJ?'🏃‍♀️ 跳绳':'🏊‍♀️ 游泳课'}</span>
    </div>
    ${isJ?`<div style="margin-left:32px;margin-bottom:8px">
      <label style="font-size:12px;color:var(--t3)">跳绳个数：</label>
      <input type="number" id="bf_jumpCount" value="1500" min="0" max="10000" style="width:80px;padding:4px 8px;border-radius:8px;border:1px solid var(--border);font-size:13px"/>
    </div>`:''}
    <div class="backfill-item" onclick="toggleBackfill(this,'homework')">
      <span class="bf-cb" id="bf_homework">⬜</span>
      <span>📝 完成学校作业</span>
    </div>
    <div class="backfill-item" onclick="toggleBackfill(this,'study')">
      <span class="bf-cb" id="bf_study">⬜</span>
      <span>📖 新概念学习</span>
    </div>
    <div class="backfill-item" onclick="toggleBackfill(this,'outdoor')">
      <span class="bf-cb" id="bf_outdoor">⬜</span>
      <span>⭐ 行为习惯达标</span>
    </div>
    <hr style="margin:12px 0;border:none;border-top:1px solid var(--border)"/>
    <div class="backfill-item" onclick="toggleBackfill(this,'fast')">
      <span class="bf-cb" id="bf_fast">⬜</span>
      <span>⚡ 做事快速不拖拉</span>
    </div>
    <div class="backfill-item" onclick="toggleBackfill(this,'tidy')">
      <span class="bf-cb" id="bf_tidy">⬜</span>
      <span>🥛 按时吃维生素D</span>
    </div>
    <div class="backfill-item" onclick="toggleBackfill(this,'polite')">
      <span class="bf-cb" id="bf_polite">⬜</span>
      <span>🌙 晚上10点前上床睡觉</span>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn" style="flex:1;background:linear-gradient(135deg,var(--ok),var(--ok2));color:white;border:none;padding:10px;border-radius:12px;font-size:14px;cursor:pointer" onclick="submitBackfill('${dateStr}')">✅ 确认补录</button>
      <button class="btn" style="flex:1;background:var(--card);color:var(--t2);border:1px solid var(--border);padding:10px;border-radius:12px;font-size:14px;cursor:pointer" onclick="backfillAll('${dateStr}')">🌟 全部完成</button>
    </div>
  </div>`;
  
  // 添加样式
  if(!document.getElementById('backfillStyle')){
    const style=document.createElement('style');
    style.id='backfillStyle';
    style.textContent=`.backfill-item{display:flex;align-items:center;gap:8px;padding:8px 4px;cursor:pointer;border-radius:8px;transition:background .2s}.backfill-item:hover{background:rgba(168,85,247,0.08)}.bf-cb{font-size:18px;width:24px;text-align:center}`;
    document.head.appendChild(style);
  }
}

const _bfState={sport:false,homework:false,study:false,outdoor:false,fast:false,tidy:false,polite:false};

function toggleBackfill(el,key){
  _bfState[key]=!_bfState[key];
  const cb=document.getElementById('bf_'+key);
  if(cb) cb.textContent=_bfState[key]?'✅':'⬜';
}

function backfillAll(dateStr){
  Object.keys(_bfState).forEach(k=>{
    _bfState[k]=true;
    const cb=document.getElementById('bf_'+k);
    if(cb) cb.textContent='✅';
  });
}

function submitBackfill(dateStr){
  const d=new Date(dateStr);
  const dw=d.getDay();
  const isJ=JUMP.includes(dw);
  const jumpInput=document.getElementById('bf_jumpCount');
  const jumpCount=isJ?(jumpInput?parseInt(jumpInput.value)||0:1500):0;
  
  const tasks={
    sport:_bfState.sport,
    homework:_bfState.homework,
    study:_bfState.study,
    outdoor:_bfState.outdoor
  };
  const habits={
    fast:_bfState.fast,
    tidy:_bfState.tidy,
    polite:_bfState.polite
  };
  
  const anyTaskDone=Object.values(tasks).some(v=>v);
  const allTaskDone=Object.values(tasks).every(v=>v);
  
  if(!anyTaskDone){
    alert('至少勾选一项打卡项目哦~');
    return;
  }
  
  // 写入 history
  if(!G.history) G.history={};
  G.history[dateStr]={
    tasks:{...tasks},
    habits:{...habits},
    jumpCount:jumpCount,
    swimDone:!isJ&&_bfState.sport,
    gems:[],
    sportType:isJ?'jump':'swim',
    allDone:allTaskDone
  };
  
  // 写入 weekly
  if(!G.weekly) G.weekly={};
  G.weekly[dateStr]=allTaskDone?true:'partial';
  
  // 重置 backfill 状态
  Object.keys(_bfState).forEach(k=>_bfState[k]=false);
  
  // 修复统计数据
  repairData();
  save();
  
  // 刷新界面
  renderDateNav();
  updateStatus();
  renderTreasure();
  renderAch();
  
  // 显示补录结果
  showHistoryDetail(dateStr);
  
  console.log('[backfill] 补录成功:',dateStr,JSON.stringify(tasks));
  gemAnim('💎');
}

// ===== 运动卡片 =====
function renderSport(){
  const c=document.getElementById('sportCardContainer');
  const dw=new Date().getDay(),isJ=JUMP.includes(dw),isS=SWIM.includes(dw);
  let h='';
  if(isJ){
    const pct=Math.min(100,(G.jumpCount/1500)*100),done=G.jumpCount>=1500;
    h=`<div class="sport-card jc">
      <div class="sport-head"><div class="sport-icon">🏃‍♀️</div>
        <div class="sport-info"><h3>今日跳绳日 🎯</h3><p>目标：跳满 1500 个</p></div></div>
      <div class="progress-bg"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="progress-txt"><span>已跳 ${G.jumpCount} 个</span><span>${done?'✅ 已完成！':'还差 '+(1500-G.jumpCount)+' 个'}</span></div>
      ${!done?`<div class="jump-counter">
        <button class="cnt-btn mi" onclick="addJump(-50)">-50</button>
        <input type="number" id="jumpIn" value="100" min="1" max="500"/>
        <button class="cnt-btn pl" onclick="addJump(+parseInt(document.getElementById('jumpIn').value)||100)">+加</button>
      </div>
      <div class="sport-actions">
        <button class="btn btn-j" onclick="addJump(100)">➕ 跳100个</button>
        <button class="btn btn-ok" onclick="completeJump()">✅ 完成</button>
      </div>`:`<div class="sport-actions"><button class="btn btn-done">🎉 跳绳已完成！太棒了！</button></div>`}
    </div>`;
  }else if(isS){
    h=`<div class="sport-card sc">
      <div class="sport-head"><div class="sport-icon">🏊‍♀️</div>
        <div class="sport-info"><h3>今日游泳日 🌊</h3><p>完成今日游泳课</p></div></div>
      <div class="progress-bg"><div class="progress-fill" style="width:${G.swimDone?100:0}%"></div></div>
      <div class="progress-txt"><span>${G.swimDone?'游泳课已完成':'等待完成'}</span><span>本周 ${G.weekSwim}/2 次</span></div>
      <div class="sport-actions">
        ${!G.swimDone?`<button class="btn btn-s" onclick="completeSwim()">🏊 完成游泳课打卡</button>`
        :`<button class="btn btn-done">🎉 游泳课已完成！</button>`}
      </div></div>`;
  }
  c.innerHTML=h;
}

// ===== 宝石 =====
function renderGems(){
  const g=document.getElementById('gemsGrid');
  const dw=new Date().getDay(),isJ=JUMP.includes(dw);
  const gems=[
    {n:isJ?'跳绳':'游泳',i:isJ?'🧡':'💙',k:'sport'},
    {n:'作业',i:'💜',k:'homework'},{n:'学习',i:'💛',k:'study'},
    {n:'习惯',i:'💚',k:'outdoor'},{n:'故事',i:'❤️',k:'story'}
  ];
  g.innerHTML=gems.map(gm=>{
    const on=G.tasks[gm.k]||G.gems.includes(gm.k);
    return `<div class="gem-slot ${on?'on':'off'}"><span class="gi">${on?gm.i:'🔒'}</span><span class="gl">${gm.n}</span></div>`;
  }).join('');
}

// ===== 任务 =====
function renderTasks(){
  const l=document.getElementById('tasksList');
  const dw=new Date().getDay(),isJ=JUMP.includes(dw);
  const tasks=[
    {k:'sport',e:isJ?'🏃‍♀️':'🏊‍♀️',t:isJ?`跳绳 ${G.jumpCount}/1500`:'完成游泳课',d:isJ?'今天是跳绳日！加油！':'今天是游泳日！加油！',g:isJ?'🧡':'💙'},
    {k:'homework',e:'📝',t:'认真高效完成学校作业',d:'专注写作业，不拖拉不磨蹭',g:'💜'},
    {k:'study',e:'📖',t:'认真学习英语',d:'专注高效，认真完成学习任务',g:'💛'},
    {k:'outdoor',e:'⭐',t:'今日行为习惯达标',d:'做事快速、吃维生素D、早睡',g:'💚'}
  ];
  l.innerHTML=tasks.map(t=>{
    const done=G.tasks[t.k];
    const clickAction=t.k==='sport'||t.k==='outdoor'?'':'toggleTask(\''+t.k+'\')';
    return `<div class="task-item ${done?'done':''}" onclick="${clickAction}">
      <div class="task-cb">${done?'✓':''}</div><div class="task-em">${t.e}</div>
      <div class="task-info"><h4>${t.t}</h4><p>${t.d}</p></div>
      <div class="task-gem">${t.g}</div></div>`;
  }).join('');
}

// ===== 故事进度 =====
function renderStoryProg(){
  const bar=document.getElementById('storyProgressBar');
  const done=Object.values(G.tasks).filter(v=>v).length,total=4;
  bar.innerHTML='';
  for(let i=0;i<total;i++){const d=document.createElement('div');d.className='sp-slot'+(i<done?' on':'');bar.appendChild(d)}
  const btn=document.getElementById('btnUnlock'),tt=document.getElementById('storyTitle'),pv=document.getElementById('storyPreview');
  // 【修复】检查今天是否真的打卡了（history 中有今天的记录且 allDone=true）
  const todayStr=new Date().toDateString();
  const todayHistory=G.history&&G.history[todayStr];
  const todayAllDone=todayHistory&&todayHistory.allDone===true;
  const alreadyUnlocked=hasTodayStory() && todayAllDone;
  if(alreadyUnlocked){
    btn.disabled=false;btn.textContent='📖 重新阅读今日故事';
    tt.textContent='✅ 今日故事已解锁！';
    const todayStory=getTodayStory();
    pv.textContent=todayStory?todayStory.title:'今天的故事已经收集好啦~';
  }else if(done>=total){btn.disabled=false;btn.textContent='✨ 解锁今日故事！';tt.textContent='🌟 故事已就绪！';pv.textContent='所有宝石已集齐，点击解锁故事！'}
  else{btn.disabled=true;btn.textContent=`🔮 还需 ${total-done} 块宝石`;tt.textContent='等待宝石解锁...';pv.textContent=`已收集 ${done}/${total} 块宝石`}
}

// ===== 操作 =====
function addJump(n){
  if(G.tasks.sport)return;
  G.jumpCount=Math.max(0,G.jumpCount+n);
  if(G.jumpCount>=1500){G.jumpCount=1500;G.tasks.sport=true;G.consJump++;gemAnim('🧡');checkJumpHero()}
  renderSport();renderGems();renderTasks();renderStoryProg();updateStatus();save();
}
function completeJump(){G.jumpCount=1500;G.tasks.sport=true;G.consJump++;gemAnim('🧡');renderSport();renderGems();renderTasks();renderStoryProg();updateStatus();checkJumpHero();save()}
function completeSwim(){
  if(G.swimDone)return;G.swimDone=true;G.tasks.sport=true;G.weekSwim++;
  gemAnim('💙');renderSport();renderGems();renderTasks();renderStoryProg();updateStatus();checkWaterSpirit();save();
}
function toggleTask(k){
  if(k==='outdoor')return;
  G.tasks[k]=!G.tasks[k];
  if(G.tasks[k]){const m={homework:'💜',study:'💛'};if(m[k])gemAnim(m[k]);if(!G.gems.includes(k))G.gems.push(k)}
  else G.gems=G.gems.filter(g=>g!==k);
  renderGems();renderTasks();renderStoryProg();updateStatus();save();
}

// ===== 动画 =====
function gemAnim(g){
  const el=document.createElement('div');el.className='gem-fly';el.textContent=g;
  el.style.left=(innerWidth/2-24)+'px';el.style.top=(innerHeight/2)+'px';
  document.body.appendChild(el);setTimeout(()=>el.remove(),1200);
  for(let i=0;i<16;i++)setTimeout(()=>{
    const c=document.createElement('div');c.className='confetti';
    c.textContent=['✨','⭐','💫','🌈','🦄','🎀','💖','🔮','👑','🌟','💎','🎆'][~~(Math.random()*12)];
    c.style.left=Math.random()*innerWidth+'px';c.style.top='-30px';
    c.style.animationDelay=Math.random()*0.6+'s';
    c.style.fontSize=(28+Math.random()*20)+'px';
    document.body.appendChild(c);setTimeout(()=>c.remove(),3000);
  },i*60);
  setTimeout(()=>launchFirework(innerWidth*0.3+Math.random()*innerWidth*0.4, innerHeight*0.2+Math.random()*innerHeight*0.3),300);
}
function bigConfetti(){
  for(let i=0;i<40;i++)setTimeout(()=>{
    const c=document.createElement('div');c.className='confetti';
    c.textContent=['🦄','🌈','✨','💖','👑','📖','💎','🔮','🎀','⭐','🎆','🌟'][~~(Math.random()*12)];
    c.style.left=Math.random()*innerWidth+'px';c.style.top='-30px';
    c.style.animationDelay=Math.random()*1.2+'s';
    c.style.fontSize=(30+Math.random()*24)+'px';
    document.body.appendChild(c);setTimeout(()=>c.remove(),3500);
  },i*60);
  for(let i=0;i<3;i++){
    setTimeout(()=>launchFirework(innerWidth*(0.2+Math.random()*0.6), innerHeight*(0.15+Math.random()*0.35)),400+i*500);
  }
}

// ===== 烟花效果 =====
function launchFirework(x,y){
  const colors=['#FF6FB7','#A855F7','#4A7CF7','#FFD700','#22D3EE','#FB7185','#34D399','#FBBF24','#DA77F2','#F43F5E'];
  const color1=colors[~~(Math.random()*colors.length)];
  const color2=colors[~~(Math.random()*colors.length)];
  const ring=document.createElement('div');
  ring.className='firework-ring';
  ring.style.left=(x-5)+'px';ring.style.top=(y-5)+'px';
  ring.style.borderColor=color1;
  document.body.appendChild(ring);setTimeout(()=>ring.remove(),900);
  const count=18+~~(Math.random()*10);
  for(let i=0;i<count;i++){
    const p=document.createElement('div');
    p.className='firework-particle';
    const angle=(Math.PI*2/count)*i;
    const dist=60+Math.random()*80;
    const fx=Math.cos(angle)*dist;
    const fy=Math.sin(angle)*dist;
    p.style.left=(x-4)+'px';p.style.top=(y-4)+'px';
    p.style.setProperty('--fx',fx+'px');
    p.style.setProperty('--fy',fy+'px');
    p.style.background=(i%2===0)?color1:color2;
    p.style.boxShadow=`0 0 6px ${(i%2===0)?color1:color2}`;
    p.style.width=(5+Math.random()*6)+'px';
    p.style.height=p.style.width;
    p.style.animationDelay=(Math.random()*0.15)+'s';
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),1500);
  }
}

// ===== 故事解锁 =====
// 检查今天是否已解锁过故事
function hasTodayStory(){
  const todayStr=new Date().toDateString();
  return G.collected.some(s=>s.date===todayStr);
}
// 获取今天已解锁的故事
function getTodayStory(){
  const todayStr=new Date().toDateString();
  return G.collected.find(s=>s.date===todayStr);
}
function unlockStory(){
  // 如果今天已经解锁过故事，直接显示已解锁的故事
  if(hasTodayStory()){
    const existStory=getTodayStory();
    if(existStory) showStoryModal(existStory);
    return;
  }
  const dw=new Date().getDay(),isJ=JUMP.includes(dw);
  const pool=isJ?STORIES.jump:STORIES.swim;
  
  // 【v8.1 修复】排除已收集过的故事，确保每天不重复
  const collectedTitles=new Set(G.collected.map(s=>s.title));
  const available=pool.filter(s=>!collectedTitles.has(s.title));
  
  let story;
  if(available.length>0){
    // 使用基于日期的确定性选择（同一天多次解锁得到同样的故事）
    const dateHash=new Date().toDateString().split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    story=available[dateHash%available.length];
  }else{
    // 所有故事都收集过了，用日期轮转再从头开始（仍然保证每天不同）
    const dateHash=new Date().toDateString().split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    story=pool[dateHash%pool.length];
  }
  
  if(!G.gems.includes('story'))G.gems.push('story');
  G.collected.push({...story,date:new Date().toLocaleDateString('zh-CN'),type:isJ?'jump':'swim'});
  renderGems();renderCollected();save();showStoryModal(story);bigConfetti();
}
function showStoryModal(s){
  document.getElementById('mStoryTitle').textContent=s.title;
  let b=`<div class="story-text">${s.text.replace(/\n/g,'<br>')}</div>`;
  if(s.choices&&s.choices.length){
    b+='<p style="margin-top:14px;color:var(--gold);font-size:15px">选择你想要的结局：</p><div class="story-choices">';
    s.choices.forEach(c=>{b+=`<button class="s-choice" onclick="selectEnd('${c.ending}')">${c.text}</button>`});
    b+='</div>';
  }
  b+='<button class="story-back-btn" onclick="closeModal(\'storyModal\')">⬅️ 返回</button>';
  document.getElementById('mStoryBody').innerHTML=b;
  document.getElementById('storyModal').classList.add('show');
}
function selectEnd(e){
  // 移除选择按钮
  document.querySelectorAll('.s-choice').forEach(b=>b.style.display='none');
  // 在返回按钮前插入结局内容
  const backBtn=document.querySelector('.story-back-btn');
  const endDiv=document.createElement('div');
  endDiv.style.cssText='margin-top:16px;padding:14px;background:rgba(255,215,0,.1);border-radius:12px;border:1px solid rgba(255,215,0,.3)';
  endDiv.innerHTML=`<p style="color:var(--gold);font-size:16px">🎬 你选择了「${e}」</p><p style="color:var(--t2);font-size:14px;margin-top:6px">已保存到成长宝箱！</p>`;
  backBtn.parentNode.insertBefore(endDiv,backBtn);
}
function closeModal(id){document.getElementById(id).classList.remove('show')}

// ===== 【v10.0】勋章系统 =====
// 计算某个日期所在周的 weekId（格式：YYYY-WNN）
function getWeekId(dateObj){
  const d=new Date(dateObj);
  // ISO 周数计算
  d.setHours(0,0,0,0);
  d.setDate(d.getDate()+3-(d.getDay()+6)%7);
  const yearStart=new Date(d.getFullYear(),0,4);
  const weekNum=Math.ceil(((d-yearStart)/86400000+1)/7);
  return d.getFullYear()+'-W'+(weekNum<10?'0':'')+weekNum;
}

// 检测本周是否满勤，触发勋章获得
function checkWeeklyMedal(){
  if(!G.medals) G.medals=[];
  
  const today=new Date();
  const todayDow=today.getDay();
  const mDow=mondayDow(todayDow);
  
  // 计算本周一到周日的 dateString
  const weekDates=[];
  for(let i=0;i<7;i++){
    const d=new Date(today);
    d.setDate(today.getDate()-mDow+i);
    weekDates.push(d.toDateString());
  }
  
  // 检查本周7天是否全部 allDone===true
  let allWeekDone=true;
  for(let i=0;i<7;i++){
    if(G.weekly[weekDates[i]]!==true){
      allWeekDone=false;
      break;
    }
  }
  
  if(!allWeekDone) return; // 没有满勤，不触发
  
  // 检查本周是否已获得勋章
  const weekId=getWeekId(today);
  if(G.medals.some(m=>m.weekId===weekId)) return; // 已获得
  
  // 满勤且未获得 → 发放勋章！
  const medalIdx=G.medals.length;
  const medalDef=medalIdx<MEDAL_LIST.length?MEDAL_LIST[medalIdx]:MEDAL_LIST[MEDAL_LIST.length-1];
  
  const newMedal={
    weekId:weekId,
    icon:medalDef.icon,
    title:medalIdx>=MEDAL_LIST.length?medalDef.title+' #'+(medalIdx-MEDAL_LIST.length+2):medalDef.title,
    desc:medalDef.desc,
    earnedDate:today.toDateString(),
    redeemed:false,        // 【v11.0】是否已兑换礼物
    redeemedDate:null      // 【v11.0】兑换日期
  };
  
  G.medals.push(newMedal);
  console.log('[勋章] 获得新勋章！',newMedal.title,newMedal.weekId);
  
  // 保存（不再递归调用 save，直接本地保存）
  const key=SYNC_STORAGE_PREFIX+currentUser;
  const data={...G, _user:currentUser, _avatar:selectedAvatar, _lastSync:Date.now(), _version:'v11.3'};
  localStorage.setItem(key,JSON.stringify(data));
  cloudSave(data);
  
  // 播放庆祝动画和勋章弹窗
  setTimeout(()=>{
    bigConfetti();
    showMedalModal(newMedal);
    renderMedals();
    // 【v11.0】检查是否触发惊喜转盘
    setTimeout(()=>checkSpinWheel(),2000);
  },500);
}

// 显示勋章获得弹窗（新获得时）
function showMedalModal(medal){
  document.getElementById('mAchTitle').textContent='🏅 恭喜获得新勋章！';
  document.getElementById('mAchBody').innerHTML=`
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:80px;margin-bottom:16px;animation:cf 2s ease-in-out infinite">${medal.icon}</div>
      <h3 style="font-size:24px;background:linear-gradient(135deg,#FFD700,#FB923C);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px">${medal.title}</h3>
      <p style="font-size:16px;color:var(--t2);line-height:1.8;margin-bottom:12px">${medal.desc}</p>
      <div style="font-size:14px;color:var(--t3);padding:10px;background:rgba(255,215,0,0.1);border-radius:12px;border:1px solid rgba(255,215,0,0.2)">
        🎉 这是你的第 <b style="color:var(--gold);font-size:18px">${G.medals.length}</b> 枚勋章！<br>
        📅 获得日期：${new Date(medal.earnedDate).getMonth()+1}月${new Date(medal.earnedDate).getDate()}日
      </div>
    </div>`;
  document.getElementById('achieveModal').classList.add('show');
}

// 渲染勋章墙
function renderMedals(){
  const grid=document.getElementById('medalGrid');
  const empty=document.getElementById('medalEmpty');
  if(!grid||!empty)return;
  
  if(!G.medals||G.medals.length===0){
    grid.innerHTML='';
    grid.style.display='none';
    empty.style.display='block';
    return;
  }
  
  grid.style.display='';
  empty.style.display='none';
  
  // 显示已获得的勋章 + 下一枚待解锁的
  let html='';
  G.medals.forEach((m,idx)=>{
    const earnedDate=new Date(m.earnedDate);
    const dateStr=`${earnedDate.getMonth()+1}/${earnedDate.getDate()}`;
    const redeemed=m.redeemed;
    html+=`<div class="medal-item earned ${redeemed?'redeemed':''}" onclick="showMedalDetail(${idx})">
      <div class="medal-icon">${m.icon}</div>
      <div class="medal-title">${m.title}</div>
      <div class="medal-date">${dateStr}</div>
      ${redeemed?'<div class="medal-redeemed-tag">✅ 已兑换</div>':'<div class="medal-gift-tag">🎁</div>'}
    </div>`;
  });
  
  // 显示下一枚待解锁的勋章（灰色锁定）
  const nextIdx=G.medals.length;
  if(nextIdx<MEDAL_LIST.length){
    html+=`<div class="medal-item locked">
      <div class="medal-icon">🔒</div>
      <div class="medal-title">第${nextIdx+1}周</div>
      <div class="medal-date">待解锁</div>
    </div>`;
  }
  
  grid.innerHTML=html;
  
  // 【v11.0】渲染惊喜转盘入口和转盘历史
  renderSpinSection();
}

// 显示已获得勋章的详情（带兑换按钮）
function showMedalDetail(idx){
  if(!G.medals||!G.medals[idx])return;
  const medal=G.medals[idx];
  const earnedDate=new Date(medal.earnedDate);
  
  let redeemHtml='';
  if(medal.redeemed){
    const rDate=new Date(medal.redeemedDate);
    redeemHtml=`<div style="margin-top:16px;padding:14px;background:rgba(52,211,153,0.1);border-radius:14px;border:1px solid rgba(52,211,153,0.3)">
      <p style="color:#10B981;font-size:16px;font-weight:700">✅ 礼物已兑换</p>
      <p style="color:var(--t3);font-size:13px;margin-top:4px">兑换日期：${rDate.getMonth()+1}月${rDate.getDate()}日</p>
    </div>`;
  } else {
    redeemHtml=`<button class="medal-redeem-btn" onclick="confirmRedeemMedal(${idx})">🎁 兑换礼物</button>
    <p style="color:var(--t3);font-size:12px;margin-top:8px">兑换后找爸爸妈妈领取礼物哦～</p>`;
  }
  
  document.getElementById('mAchTitle').textContent='🏅 勋章详情';
  document.getElementById('mAchBody').innerHTML=`
    <div style="text-align:center;padding:16px 0">
      <div style="font-size:72px;margin-bottom:12px;animation:cf 2s ease-in-out infinite">${medal.icon}</div>
      <h3 style="font-size:22px;background:linear-gradient(135deg,#FFD700,#FB923C);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:6px">${medal.title}</h3>
      <p style="font-size:15px;color:var(--t2);line-height:1.8;margin-bottom:8px">${medal.desc}</p>
      <div style="font-size:13px;color:var(--t3);padding:8px;background:rgba(255,215,0,0.08);border-radius:10px">
        📅 获得日期：${earnedDate.getMonth()+1}月${earnedDate.getDate()}日 · 第 ${idx+1} 枚勋章
      </div>
      ${redeemHtml}
    </div>`;
  document.getElementById('achieveModal').classList.add('show');
}

// 【v11.0】确认兑换礼物
function confirmRedeemMedal(idx){
  if(!G.medals||!G.medals[idx]||G.medals[idx].redeemed) return;
  
  const medal=G.medals[idx];
  document.getElementById('mAchTitle').textContent='🎁 确认兑换礼物';
  document.getElementById('mAchBody').innerHTML=`
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:64px;margin-bottom:12px">${medal.icon}</div>
      <h3 style="font-size:20px;color:var(--t1);margin-bottom:8px">${medal.title}</h3>
      <p style="font-size:16px;color:var(--t2);line-height:1.8;margin-bottom:20px">确定要兑换这枚勋章的礼物吗？<br><span style="color:var(--t3);font-size:13px">兑换后不能再次兑换哦～</span></p>
      <div style="display:flex;gap:12px;justify-content:center">
        <button onclick="closeModal('achieveModal')" style="flex:1;max-width:140px;padding:14px;border:2px solid var(--border);border-radius:16px;background:var(--card);color:var(--t2);font-size:16px;font-family:inherit;cursor:pointer;font-weight:600">❌ 先不兑换</button>
        <button onclick="executeRedeemMedal(${idx})" style="flex:1;max-width:140px;padding:14px;border:none;border-radius:16px;background:linear-gradient(135deg,#FF6FB7,#A855F7);color:#fff;font-size:16px;font-family:inherit;cursor:pointer;font-weight:700;box-shadow:0 4px 15px rgba(168,85,247,0.4)">✅ 确认兑换</button>
      </div>
    </div>`;
}

// 【v11.0】执行兑换
function executeRedeemMedal(idx){
  if(!G.medals||!G.medals[idx]||G.medals[idx].redeemed) return;
  
  G.medals[idx].redeemed=true;
  G.medals[idx].redeemedDate=new Date().toDateString();
  save();
  
  // 兑换成功弹窗
  const medal=G.medals[idx];
  document.getElementById('mAchTitle').textContent='🎉 兑换成功！';
  document.getElementById('mAchBody').innerHTML=`
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:72px;margin-bottom:12px">🎁</div>
      <h3 style="font-size:22px;color:var(--t1);margin-bottom:8px">恭喜你兑换了礼物！</h3>
      <p style="font-size:16px;color:var(--t2);line-height:1.8;margin-bottom:16px">${medal.icon} ${medal.title} 的礼物</p>
      <div style="padding:14px;background:linear-gradient(135deg,rgba(255,111,183,0.1),rgba(168,85,247,0.1));border-radius:14px;border:1px solid rgba(168,85,247,0.2)">
        <p style="color:var(--t1);font-size:15px">🎀 记得找爸爸妈妈领取礼物哦～</p>
      </div>
    </div>`;
  
  bigConfetti();
  renderMedals();
  console.log('[兑换] 勋章礼物已兑换:',medal.title);
}

// ===== 【v11.0】惊喜转盘系统 =====

// 检查是否应该触发惊喜转盘（连续3枚勋章）
function checkSpinWheel(){
  if(!G.medals||G.medals.length<3) return;
  if(!G.spinHistory) G.spinHistory=[];
  
  // 检查最近3枚勋章是否是连续周
  const totalMedals=G.medals.length;
  
  // 每 3 枚勋章触发一次：第3枚、第6枚、第9枚...
  // 检查是否刚好到达3的倍数
  if(totalMedals%3!==0) return;
  
  // 检查这次的3枚是否已经触发过转盘
  const triggerIdx=totalMedals; // 用总数作为标识
  if(G.spinHistory.some(s=>s.triggerMedalIndex===triggerIdx)) return;
  
  // 检查最近3枚勋章是否是连续的周
  const last3=G.medals.slice(-3);
  let isConsecutive=true;
  for(let i=1;i<3;i++){
    const prevWeekId=last3[i-1].weekId;
    const currWeekId=last3[i].weekId;
    // 解析 weekId 格式 YYYY-WNN
    const prevParts=prevWeekId.match(/(\d+)-W(\d+)/);
    const currParts=currWeekId.match(/(\d+)-W(\d+)/);
    if(!prevParts||!currParts){isConsecutive=false;break;}
    const prevY=parseInt(prevParts[1]),prevW=parseInt(prevParts[2]);
    const currY=parseInt(currParts[1]),currW=parseInt(currParts[2]);
    // 简单判断：同年相邻周 或 跨年（52/53→1）
    if(currY===prevY && currW===prevW+1) continue;
    if(currY===prevY+1 && currW===1 && (prevW>=51)) continue;
    isConsecutive=false;break;
  }
  
  if(!isConsecutive) return;
  
  // 触发惊喜转盘！
  console.log('[转盘] 连续3周满勤！触发惊喜转盘！');
  showSpinWheel(triggerIdx);
}

// 显示转盘弹窗
function showSpinWheel(triggerIdx){
  document.getElementById('mAchTitle').textContent='🎉 连续3周满勤！';
  
  let prizeItemsHtml='';
  SPIN_PRIZES.forEach((p,i)=>{
    prizeItemsHtml+=`<div class="spin-prize-item" style="--prize-idx:${i}">${p.icon}</div>`;
  });
  
  document.getElementById('mAchBody').innerHTML=`
    <div style="text-align:center;padding:10px 0">
      <p style="font-size:17px;color:var(--t1);margin-bottom:16px;line-height:1.6">太棒了！连续三周全勤！<br>🎡 解锁惊喜转盘！</p>
      <div class="spin-wheel-container" id="spinWheelContainer">
        <div class="spin-wheel" id="spinWheel">
          ${SPIN_PRIZES.map((p,i)=>{
            const angle=(360/8)*i;
            return `<div class="spin-sector" style="transform:rotate(${angle}deg)">
              <div class="spin-sector-content" style="transform:rotate(${45/2}deg)">
                <span class="spin-sector-icon">${p.icon}</span>
              </div>
            </div>`;
          }).join('')}
        </div>
        <div class="spin-pointer">▼</div>
      </div>
      <button class="spin-btn" id="spinBtn" onclick="startSpin(${triggerIdx})">🎰 开始转动！</button>
    </div>`;
  document.getElementById('achieveModal').classList.add('show');
}

// 开始转盘旋转
function startSpin(triggerIdx){
  const btn=document.getElementById('spinBtn');
  if(!btn) return;
  btn.disabled=true;
  btn.textContent='🎡 转动中...';
  
  // 随机选中一个奖品
  const prizeIdx=Math.floor(Math.random()*SPIN_PRIZES.length);
  const prize=SPIN_PRIZES[prizeIdx];
  
  // 计算旋转角度：基础圈数 + 目标位置
  const baseRotation=360*5; // 转5圈
  const targetAngle=360-(360/8)*prizeIdx-(360/16); // 让指针指向目标扇区中心
  const totalAngle=baseRotation+targetAngle;
  
  const wheel=document.getElementById('spinWheel');
  if(wheel){
    wheel.style.transition='transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    wheel.style.transform=`rotate(${totalAngle}deg)`;
  }
  
  // 4秒后显示结果
  setTimeout(()=>{
    // 保存记录
    if(!G.spinHistory) G.spinHistory=[];
    G.spinHistory.push({
      triggerMedalIndex:triggerIdx,
      result:prize.icon+' '+prize.text,
      date:new Date().toDateString(),
      used:false
    });
    save();
    
    // 显示结果
    showSpinResult(prize);
    renderMedals();
  },4200);
}

// 显示转盘结果
function showSpinResult(prize){
  bigConfetti();
  document.getElementById('mAchTitle').textContent='🎊 恭喜抽中！';
  document.getElementById('mAchBody').innerHTML=`
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:80px;margin-bottom:16px;animation:cf 2s ease-in-out infinite">${prize.icon}</div>
      <h3 style="font-size:22px;color:var(--t1);margin-bottom:8px">${prize.text}</h3>
      <div style="padding:14px;margin-top:16px;background:linear-gradient(135deg,rgba(255,111,183,0.1),rgba(168,85,247,0.1));border-radius:14px;border:1px solid rgba(168,85,247,0.2)">
        <p style="color:var(--t2);font-size:15px">🎀 记得找爸爸妈妈兑换哦～</p>
        <p style="color:var(--t3);font-size:12px;margin-top:4px">类型：${prize.type}</p>
      </div>
      <button onclick="closeModal('achieveModal')" style="margin-top:20px;padding:14px 40px;border:none;border-radius:16px;background:linear-gradient(135deg,#FF6FB7,#A855F7);color:#fff;font-size:17px;font-family:inherit;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(168,85,247,0.4)">✨ 太开心了！</button>
    </div>`;
}

// 渲染惊喜转盘区域（在勋章墙下方）
function renderSpinSection(){
  let spinSection=document.getElementById('spinHistorySection');
  if(!spinSection){
    // 创建区域
    const medalCard=document.querySelector('.medal-wall-card');
    if(!medalCard) return;
    spinSection=document.createElement('div');
    spinSection.id='spinHistorySection';
    spinSection.className='spin-history-section';
    medalCard.appendChild(spinSection);
  }
  
  if(!G.spinHistory||G.spinHistory.length===0){
    // 显示转盘提示
    const nextSpinAt=G.medals?Math.ceil(G.medals.length/3)*3:3;
    const remaining=nextSpinAt-((G.medals&&G.medals.length)||0);
    if(remaining>0){
      spinSection.innerHTML=`<div class="spin-hint">
        <span style="font-size:28px">🎡</span>
        <p>连续获得3枚勋章可解锁<b>惊喜转盘</b>！</p>
        <p style="font-size:12px;color:var(--t3)">还差 ${remaining} 枚勋章</p>
      </div>`;
    } else {
      spinSection.innerHTML='';
    }
    return;
  }
  
  // 有转盘历史，显示记录
  let histHtml='<h4 style="font-size:15px;color:var(--t1);margin:16px 0 10px">🎡 惊喜转盘记录</h4>';
  G.spinHistory.forEach(s=>{
    const d=new Date(s.date);
    const dateStr=`${d.getMonth()+1}/${d.getDate()}`;
    histHtml+=`<div class="spin-history-item">
      <span class="spin-history-result">${s.result}</span>
      <span class="spin-history-date">${dateStr}</span>
    </div>`;
  });
  
  // 下一次转盘距离
  const nextSpinAt=Math.ceil((G.medals?G.medals.length:0)/3)*3;
  const totalMedals=G.medals?G.medals.length:0;
  if(nextSpinAt>totalMedals){
    const remaining=nextSpinAt-totalMedals;
    histHtml+=`<div class="spin-hint" style="margin-top:10px">
      <p style="font-size:13px;color:var(--t3)">🎡 再获得 ${remaining} 枚勋章解锁下一次转盘</p>
    </div>`;
  }
  
  spinSection.innerHTML=histHtml;
}

// ===== 成就 =====
function checkJumpHero(){
  if(G.consJump>=3&&!G.ach.jumpHero){G.ach.jumpHero=true;save();
    setTimeout(()=>showAchModal('🦸‍♀️ 跳绳小英雄！',STORIES.hero),800);renderAch();}
}
function checkWaterSpirit(){
  if(G.weekSwim>=2&&!G.ach.waterSpirit){G.ach.waterSpirit=true;save();
    setTimeout(()=>showAchModal('🧜‍♀️ 水中精灵觉醒！',STORIES.spirit),800);renderAch();}
}
function showAchModal(title,s){
  document.getElementById('mAchTitle').textContent=title;
  document.getElementById('mAchBody').innerHTML=`<div class="story-text">${s.text.replace(/\n/g,'<br>')}</div><p style="margin-top:12px;color:var(--ok);font-size:13px">🏆 成就已解锁！</p>`;
  document.getElementById('achieveModal').classList.add('show');bigConfetti();
}
function renderAch(){
  const l=document.getElementById('achievementsList');
  // 【v8.7】故事导演权：区分首次 vs 新一轮
  let dirDesc,dirProg;
  if(G.dirUnlockedEver||G.dirUnlockedDate){
    // 已解锁过，显示新一轮挑战进度
    const cycle=G.dirCycleCount||1;
    if(G.totalDays>=7){
      dirDesc=`第${cycle+1}轮挑战完成！`;
      dirProg='✅ 已达成';
    }else{
      dirDesc=`新一轮挑战中 (第${cycle+1}轮)`;
      dirProg=`${Math.min(7,G.totalDays)}/7天`;
    }
  }else{
    dirDesc='集满7天宝箱碎片';
    dirProg=`${Math.min(7,G.totalDays)}/7天`;
  }
  const achs=[
    {k:'jumpHero',i:'🦸‍♀️',t:'跳绳小英雄',d:'本周完成3天跳绳',p:`${Math.min(3,G.consJump)}/3天`},
    {k:'waterSpirit',i:'🧜‍♀️',t:'水中精灵',d:'本周完成两次游泳课',p:`${Math.min(2,G.weekSwim)}/2次`},
    {k:'goodHabit',i:'🌟',t:'好习惯之星',d:'今日行为习惯全部达标',p:Object.values(G.habits).filter(v=>v).length+'/3项'},
    {k:'storyDirector',i:'🎬',t:'故事导演权',d:dirDesc,p:dirProg}
  ];
  l.innerHTML=achs.map(a=>{
    const on=G.ach[a.k];
    // 【v8.7】故事导演权特殊：即使新周期未达标，如果曾经解锁过，显示"已解锁(进行中)"样式
    let progHtml;
    if(a.k==='storyDirector'&&(G.dirUnlockedEver||G.dirUnlockedDate)&&!on){
      progHtml=`<div class="ach-prog cycle-prog">🔄 ${a.p}</div>`;
    }else{
      progHtml=`<div class="ach-prog">${on?'✅ 已解锁':a.p}</div>`;
    }
    // 曾经解锁过的导演权用 ever-on 样式（不是灰色的）
    let cardClass='ach-card';
    if(on) cardClass+=' on';
    else if(a.k==='storyDirector'&&(G.dirUnlockedEver||G.dirUnlockedDate)) cardClass+=' ever-on';
    else cardClass+=' off';
    return `<div class="${cardClass}"><div class="ach-icon">${a.i}</div>
      <div class="ach-info"><h4>${a.t}</h4><p>${a.d}</p></div>
      ${progHtml}</div>`;
  }).join('');
}

// ===== 宝箱 =====
function renderTreasure(){
  const d=document.getElementById('treasureDays');d.innerHTML='';
  
  // 【v10.0】按周展示宝箱碎片：本周一到周日，allDone===true 才点亮
  const todayDate=new Date();
  const todayDow=todayDate.getDay();
  const mDow=mondayDow(todayDow);
  const weekDates=[];
  for(let i=0;i<7;i++){
    const wd=new Date(todayDate);
    wd.setDate(todayDate.getDate()-mDow+i);
    weekDates.push(wd.toDateString());
  }
  
  const weekLabels=['一','二','三','四','五','六','日'];
  let weekFullCount=0;
  
  for(let i=0;i<7;i++){
    const ds=weekDates[i];
    const isToday=ds===todayDate.toDateString();
    const status=G.weekly[ds];
    const isAllDone=status===true;
    const isPartial=status==='partial';
    const isFuture=new Date(ds)>todayDate&&!isToday;
    
    if(isAllDone) weekFullCount++;
    
    const div=document.createElement('div');
    if(isAllDone){
      div.className='t-day on';
      div.textContent='💎';
    }else if(isToday&&Object.values(G.tasks).every(v=>v)){
      // 今天刚全部完成但还没存入 weekly
      div.className='t-day on today-progress';
      div.textContent='💎';
      weekFullCount++;
    }else if(isPartial){
      div.className='t-day partial-day';
      div.textContent='🔶';
    }else if(isToday&&Object.values(G.tasks).some(v=>v)){
      div.className='t-day today-progress';
      div.textContent='🔸';
    }else{
      div.className='t-day'+(isFuture?' future-day':'');
      div.textContent=weekLabels[i];
    }
    d.appendChild(div);
  }
  
  // 宝箱区域标题和描述
  const isNewCycle=!!(G.dirUnlockedEver||G.dirUnlockedDate);
  const cycle=G.dirCycleCount||1;
  const treasureInfo=document.querySelector('.treasure-info');
  const btnChest=document.getElementById('btnChest');
  
  // 【v10.0】用 totalDays 决定宝箱开启（导演权周期），weekFullCount 用于本周进度展示
  let displayTotalDays=G.totalDays;
  const todayAllDone=Object.values(G.tasks).every(v=>v);
  const todayStr=todayDate.toDateString();
  const todayInWeekly=G.weekly[todayStr]===true;
  if(todayAllDone&&!todayInWeekly){
    displayTotalDays=G.totalDays+1;
  }
  
  if(isNewCycle){
    treasureInfo.innerHTML=`🔄 <b>第${cycle+1}轮挑战</b><br>再次集满<b>7天</b>全部完成才能开启新宝箱！<br>✨ 已完成 <b>${cycle}</b> 轮挑战 ✨<br><span style="font-size:13px;color:var(--t3)">本周满勤进度: ${weekFullCount}/7天</span>`;
    
    if(displayTotalDays>=7){
      btnChest.disabled=false;
      btnChest.textContent='🎉 再次开启成长宝箱！';
      btnChest.style.display='';
      document.getElementById('treasureChest').textContent='🎁';
    }else{
      btnChest.disabled=true;
      btnChest.textContent=`🔄 新一轮挑战 ${displayTotalDays}/7 天`;
      btnChest.style.display='';
      document.getElementById('treasureChest').textContent='🧰';
    }
  }else{
    treasureInfo.innerHTML=`集满<b>7天</b>全部完成的宝石可兑换<br>✨<b>「故事导演权」</b>✨<br>自己编故事加入游戏！<br><span style="font-size:13px;color:var(--t3)">本周满勤进度: ${weekFullCount}/7天</span>`;
    
    if(displayTotalDays>=7){
      btnChest.disabled=false;
      btnChest.textContent='🎉 开启成长宝箱！';
      btnChest.style.display='';
      document.getElementById('treasureChest').textContent='🎁';
    }else{
      btnChest.disabled=true;
      btnChest.textContent=`🔒 还需 ${7-displayTotalDays} 天`;
      btnChest.style.display='';
    }
  }
  
  if(G.dirUnlocked)document.getElementById('directorMode').classList.add('show');
  renderMyStories();renderCollected();
}
function openChest(){
  const isNewCycle=!!(G.dirUnlockedEver||G.dirUnlockedDate);
  const cycle=(G.dirCycleCount||0)+1;
  
  G.dirUnlocked=true;G.ach.storyDirector=true;
  G.dirUnlockedEver=true;
  G.dirCycleCount=cycle;
  // 【v8.7】记录解锁日期，totalDays重新计算（解锁后的第二天开始新一轮）
  G.dirUnlockedDate=new Date().toDateString();
  G.totalDays=0;
  save();
  document.getElementById('directorMode').classList.add('show');
  
  if(isNewCycle){
    // 新一轮挑战完成
    showAchModal(`🎬 第${cycle}轮挑战完成！`,{text:`🎉🎉🎉 太厉害了！\n\n你又坚持了整整7天！这是你的第 ${cycle} 轮挑战成功！\n\n你是真正的故事大师！继续加油！\n\n明天开始第 ${cycle+1} 轮挑战！💪`});
  }else{
    // 首次解锁
    showAchModal('🎬 故事导演权解锁！',{text:'🎉🎉🎉 恭喜恭喜！\n\n你坚持了整整7天！你是最棒的故事收集家！\n\n作为奖励，你现在拥有了「故事导演权」——可以自己编写故事加入游戏！\n\n快去写下你自己的故事吧！✨\n\n明天开始新一轮7天挑战！💪'});
  }
  renderAch();renderTreasure();
}
function submitStory(){
  const ta=document.getElementById('directorTa'),txt=ta.value.trim();
  if(!txt)return;
  G.myStories.push({text:txt,date:new Date().toLocaleDateString('zh-CN'),title:'🎬 '+txt.substring(0,15)+'...'});
  ta.value='';save();renderMyStories();gemAnim('🎬');
}
function renderMyStories(){
  const c=document.getElementById('myStories');
  c.innerHTML=G.myStories.map((s,idx)=>`<div class="collected-item" onclick="showMyStory(${idx})">
    <h4>${s.title}</h4><p>${s.date} · 我的创作</p></div>`).join('');
}
function showMyStory(idx){
  const s=G.myStories[idx];
  if(s)showStoryModal({title:s.title,text:s.text,choices:[]});
}
function renderCollected(){
  const c=document.getElementById('collectedStories');
  if(!G.collected.length){c.innerHTML='<p style="text-align:center;color:var(--t3);font-size:13px;padding:20px">还没有收集到故事，完成任务来解锁吧！</p>';return}
  c.innerHTML=G.collected.map((s,idx)=>`<div class="collected-item" onclick="showCollectedStory(${idx})">
    <div style="display:flex;align-items:center;gap:8px"><span style="font-size:20px">${s.type==='jump'?'🏃‍♀️':'🏊‍♀️'}</span><div>
    <h4>${s.title}</h4><p>${s.date} · ${s.type==='jump'?'跳绳日故事':'游泳日故事'}</p></div></div></div>`).join('');
}
function showCollectedStory(idx){
  const s=G.collected[idx];
  if(s)showStoryModal({title:s.title,text:s.text,choices:[]});
}

// ===== 行为习惯 =====
function renderHabits(){
  const l=document.getElementById('habitsList');
  if(!l)return;
  const habits=[
    {k:'fast',e:'⚡',t:'做事快速不拖拉',d:'行动力满满，说做就做！'},
    {k:'tidy',e:'🥛',t:'按时吃维生素D',d:'每天按时吃维生素D，长高高！'},
    {k:'polite',e:'🌙',t:'晚上10点前上床睡觉',d:'早睡早起，养成好的作息习惯！'}
  ];
  l.innerHTML=habits.map(h=>{
    const done=G.habits[h.k];
    return `<div class="task-item ${done?'done':''}" onclick="toggleHabit('${h.k}')">
      <div class="task-cb">${done?'✓':''}</div><div class="task-em">${h.e}</div>
      <div class="task-info"><h4>${h.t}</h4><p>${h.d}</p></div>
      <div class="task-gem">${done?'⭐':'☆'}</div></div>`;
  }).join('');
}
function toggleHabit(k){
  G.habits[k]=!G.habits[k];
  if(G.habits[k])gemAnim('⭐');
  const allDone=Object.values(G.habits).every(v=>v);
  if(allDone&&!G.ach.goodHabit){
    G.ach.goodHabit=true;
    G.tasks.outdoor=true;
    gemAnim('💚');
    renderGems();renderTasks();renderStoryProg();
    setTimeout(()=>showAchModal('🌟 好习惯之星！',{text:'🎉 太棒了！\n\n你今天的行为习惯全部达标！\n\n做事快速不拖拉 ⚡\n按时吃维生素D 🥛\n10点前上床睡觉 🌙\n\n你就是最闪亮的好习惯之星！继续保持哦！✨'}),600);
    renderAch();
  } else if(allDone){
    G.tasks.outdoor=true;
    renderGems();renderTasks();renderStoryProg();
  } else {
    G.tasks.outdoor=false;
    G.gems=G.gems.filter(g=>g!=='outdoor');
    renderGems();renderTasks();renderStoryProg();
  }
  renderHabits();updateStatus();save();
}

// ===== 状态栏 =====
function updateStatus(){
  // 【v10.0】streak 展示：本周内的连续全部完成天数
  const todayAllDone=Object.values(G.tasks).every(v=>v);
  const todayStr=new Date().toDateString();
  const todayInWeekly=G.weekly[todayStr]===true;
  let displayStreak=G.streak;
  if(todayAllDone&&!todayInWeekly){
    displayStreak=Math.max(G.streak+1,1);
  }
  document.getElementById('streakCount').textContent=displayStreak;
  
  // 【v8.7】徽章：导演徽章用 dirUnlockedEver（永久保留），其他跟随当周成就
  // 【v10.0】添加勋章数量徽章
  const badges=document.getElementById('titleBadges');let bh='';
  if(G.ach.jumpHero)bh+='<span class="badge hero">🦸‍♀️ 跳绳小英雄</span>';
  if(G.ach.waterSpirit)bh+='<span class="badge water">🧜‍♀️ 水中精灵</span>';
  if(G.dirUnlockedEver||G.ach.storyDirector)bh+='<span class="badge dir">🎬 故事导演</span>';
  if(G.medals&&G.medals.length>0)bh+='<span class="badge medal-badge">🏅 ×'+G.medals.length+'</span>';
  badges.innerHTML=bh;
  
  // 【v10.0】totalDays 只统计 allDone
  let displayTotalDays=G.totalDays;
  if(todayAllDone&&!todayInWeekly)displayTotalDays++;
  
  // 【v8.7】头衔和皇冠：新周期中可以降级，达标后重新升级
  const crownEl=document.getElementById('crownIcon');
  if(displayTotalDays>=7){
    if(crownEl)crownEl.style.display='';
    document.getElementById('playerTitle').textContent='传奇故事收集家';
  }else if(displayTotalDays>=3){
    if(crownEl)crownEl.style.display='none';
    document.getElementById('playerTitle').textContent='资深冒险者';
  }else if(displayStreak>=1){
    if(crownEl)crownEl.style.display='none';
    document.getElementById('playerTitle').textContent='初级冒险者';
  }else{
    if(crownEl)crownEl.style.display='none';
    document.getElementById('playerTitle').textContent='见习冒险者';
  }
}

// ===== 初始化 =====
function initGame(){
  createStars();renderDateNav();renderSport();renderGems();renderTasks();renderStoryProg();renderHabits();renderAch();renderMedals();renderTreasure();updateStatus();
}

// ===== 启动 =====
(async function startup(){
  createStars();
  const loginVer=localStorage.getItem('storyGame_loginVer');
  if(!loginVer||loginVer<'v2'){
    localStorage.removeItem('storyGame_currentUser');
    localStorage.removeItem('storyGame_currentAvatar');
  }
  const savedUser=localStorage.getItem('storyGame_currentUser');
  
  // 【v11.1】检查 sessionStorage 是否有备份数据
  const backupData = sessionStorage.getItem('storyGame_backup_'+ACCOUNT_NAME);
  if(backupData){
    try{
      const bd = JSON.parse(backupData);
      if(bd.history && Object.keys(bd.history).length > 0){
        console.log('[startup] 发现 sessionStorage 备份数据，history keys=', Object.keys(bd.history).length);
        // 如果本地没有数据，提示用户恢复
        const localRaw = localStorage.getItem('storyGame_user_'+ACCOUNT_NAME);
        if(!localRaw || localRaw === '{}'){
          const restore = confirm('📦 检测到有备份数据！\n\n备份包含 '+Object.keys(bd.history).length+' 天打卡记录\n点击"确定"从备份恢复数据');
          if(restore){
            G = {...makeDefaultState(), ...bd};
            repairData();
            save();
            console.log('[startup] 已从 sessionStorage 恢复数据');
          }
        }
      }
    }catch(e){console.error('[startup] 备份解析失败:',e)}
  }
  
  if(savedUser===ACCOUNT_NAME){
    // 已登录用户 —— 自动进入游戏（页面已通过内联脚本隐藏了登录页）
    currentUser=ACCOUNT_NAME;
    selectedAvatar=ACCOUNT_AVATAR;
    
    // 先加载本地数据并立即渲染界面（用户秒进游戏）
    load();
    
    document.getElementById('loginOverlay').style.display='none';
    document.getElementById('appContainer').style.display='';
    document.querySelector('.bottom-nav').style.display='';
    
    document.querySelector('.avatar').textContent=ACCOUNT_AVATAR;
    const crown=document.getElementById('crownIcon');
    if(crown)document.querySelector('.avatar').innerHTML=ACCOUNT_AVATAR+'<span class="crown" id="crownIcon" '+(G.totalDays>=7?'':'style="display:none"')+'>👑</span>';
    document.getElementById('playerName').textContent=ACCOUNT_NAME;
    
    // 先用本地数据初始化游戏，让用户立即可以操作
    initGame();
    
    // 【v11.3】加载 GitHub Token（填充设置页面输入框）
    loadGitHubToken();
    
    // 然后在后台静默同步云端数据（不阻塞界面）
    cloudLoad().then(()=>{
      // 云端数据加载完后重新渲染一次以确保数据最新
      initGame();
      console.log('[startup] 云端数据同步完成');
    }).catch(e=>{
      console.log('[startup] 云端加载失败，使用本地数据',e);
    });
    
    // 移除内联快速登录样式（正常 JS 已接管控制）
    const quickStyle=document.getElementById('quick-login-style');
    if(quickStyle)quickStyle.remove();
    
    if(syncTimer)clearInterval(syncTimer);
    // 【修复】降低同步频率到 5 分钟，避免触发 GitHub API 限制
    syncTimer=setInterval(async ()=>{
      if(!currentUser)return;
      // 【v10.0】先拉取云端最新数据合并，再上传（避免覆盖其他设备的新数据）
      try{
        await cloudLoad();
        await cloudSave({...G,_user:currentUser,_avatar:selectedAvatar,_lastSync:Date.now(),_version:'v11.3'});
      }catch(e){console.log('[autoSync] 自动同步失败:',e.message);}
    },300000); // 5 分钟 = 300000 毫秒
  }else{
    // 未登录 —— 显示登录页面
    document.getElementById('loginOverlay').style.display='';
    document.getElementById('appContainer').style.display='none';
    document.querySelector('.bottom-nav').style.display='none';
    document.getElementById('passwordInput').focus();
  }
  document.getElementById('passwordInput').addEventListener('keypress',function(e){
    if(e.key==='Enter')doLogin();
  });
})();
// ===== 【v11.3】数据补录工具 =====

// 补录工具状态
let recoveryDate = new Date();

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
  
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', 
                      '7月', '8月', '9月', '10月', '11月', '12月'];
  document.getElementById('recMonthYear').textContent = year + '年 ' + monthNames[month];
  
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
    const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const dayDate = new Date(year, month, d);
    const isFuture = dayDate > today;
    const isToday = dayDate.toDateString() === today.toDateString();
    
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    
    const hasRecord = G.history && G.history[dayDate.toDateString()];
    const isDone = hasRecord && hasRecord.done === true;
    
    if (isFuture && !isToday) {
      dayDiv.classList.add('future');
      dayDiv.textContent = d;
    } else if (isDone) {
      dayDiv.classList.add('done');
      dayDiv.innerHTML = '<span class="day-num">' + d + '</span><span class="day-icon">✅</span>';
    } else if (isToday && Object.values(G.tasks).every(v => v)) {
      dayDiv.classList.add('today-done');
      dayDiv.innerHTML = '<span class="day-num">' + d + '</span><span class="day-icon">✅</span>';
    } else {
      dayDiv.classList.add('missing');
      dayDiv.innerHTML = '<span class="day-num">' + d + '</span>';
      dayDiv.onclick = (function(date) {
        return function() { showRecoveryDialog(date); };
      })(dayDate);
    }
    
    calendarDays.appendChild(dayDiv);
  }
}

// 显示补录对话框
// 当前补录对话框的状态
let recDialogDateStr = '';  // 当前补录的日期字符串
let recDialogData = null;   // 当前补录的数据（临时编辑状态）

function showRecoveryDialog(date) {
  const dateStr = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  recDialogDateStr = date.toDateString();
  
  document.getElementById('recDialogDate').textContent = dateStr;
  document.getElementById('recDialogDateStr').textContent = '补录日期：' + recDialogDateStr;
  
  // 初始化补录数据（从 G.history 恢复或新建）
  recDialogData = {
    tasks: { sport: false, homework: false, study: false, outdoor: false },
    gems: [],
    story: null,
    habits: { vitaminD: false, quickAction: false, earlySleep: false },
    allDone: false,
    medalRedeemed: false
  };
  
  // 如果已有历史记录，恢复它
  if (G.history && G.history[recDialogDateStr]) {
    const hist = G.history[recDialogDateStr];
    recDialogData.tasks = { ...recDialogData.tasks, ...hist.tasks };
    recDialogData.gems = hist.gems ? [...hist.gems] : [];
    recDialogData.story = hist.story || null;
    recDialogData.habits = { ...recDialogData.habits, ...hist.habits };
    recDialogData.allDone = hist.allDone || false;
  }
  
  // 渲染各个部分
  renderRecSportCard();  // 先渲染运动卡片（今日跳绳日/游泳日）
  renderRecGems();
  renderRecTasks();
  renderRecStoryBook();
  renderRecHabits();
  renderRecMedalSection();
  
  document.getElementById('recoveryDialog').style.display = 'flex';
}

// ===== 补录对话框渲染函数 =====

// 渲染补录对话框的宝石网格
function renderRecGems() {
  const g = document.getElementById('recGemsGrid');
  if (!g) return;
  
  const dw = new Date(recDialogDateStr).getDay();
  const isJ = JUMP.includes(dw);
  const gems = [
    { n: isJ ? '跳绳' : '游泳', i: isJ ? '🧡' : '💙', k: 'sport' },
    { n: '作业', i: '💜', k: 'homework' },
    { n: '学习', i: '💛', k: 'study' },
    { n: '习惯', i: '💚', k: 'outdoor' },
    { n: '故事', i: '❤️', k: 'story' }
  ];
  
  g.innerHTML = gems.map(gm => {
    const on = recDialogData.tasks[gm.k] || recDialogData.gems.includes(gm.k);
    return `<div class="gem-slot ${on ? 'on' : 'off'}" onclick="recToggleGem('${gm.k}')">
      <span class="gi">${on ? gm.i : '🔒'}</span>
      <span class="gl">${gm.n}</span>
    </div>`;
  }).join('');
}

// 渲染补录对话框的运动卡片（今日跳绳日/游泳日标题）
function renderRecSportCard() {
  const container = document.getElementById('recSportCardContainer');
  if (!container) return;
  
  const dw = new Date(recDialogDateStr).getDay();
  const isJ = JUMP.includes(dw);
  const sportDone = recDialogData.tasks.sport;
  
  let html = '';
  if (isJ) {
    // 跳绳日
    html = `<div class="sport-card jc" style="margin-bottom:12px">
      <div class="sport-head">
        <div class="sport-icon">🏃‍♀️</div>
        <div class="sport-info">
          <h3>今日跳绳日 🎯</h3>
          <p>目标：跳满 1500 个</p>
        </div>
        <div style="margin-left:auto;font-size:28px">${sportDone ? '✅' : '⏳'}</div>
      </div>
      <div class="progress-bg">
        <div class="progress-fill" style="width:${sportDone ? 100 : 0}%"></div>
      </div>
      <div class="progress-txt">
        <span>${sportDone ? '已完成跳绳任务' : '点击任务列表勾选完成'}</span>
      </div>
    </div>`;
  } else {
    // 游泳日
    html = `<div class="sport-card sc" style="margin-bottom:12px">
      <div class="sport-head">
        <div class="sport-icon">🏊‍♀️</div>
        <div class="sport-info">
          <h3>今日游泳日 🌊</h3>
          <p>完成今日游泳课</p>
        </div>
        <div style="margin-left:auto;font-size:28px">${sportDone ? '✅' : '⏳'}</div>
      </div>
      <div class="progress-bg">
        <div class="progress-fill" style="width:${sportDone ? 100 : 0}%"></div>
      </div>
      <div class="progress-txt">
        <span>${sportDone ? '游泳课已完成' : '点击任务列表勾选完成'}</span>
      </div>
    </div>`;
  }
  
  container.innerHTML = html;
}

// 渲染补录对话框的任务列表
function renderRecTasks() {
  const l = document.getElementById('recTasksList');
  if (!l) return;
  
  const dw = new Date(recDialogDateStr).getDay();
  const isJ = JUMP.includes(dw);
  const tasks = [
    { k: 'sport', e: isJ ? '🏃‍♀️' : '🏊‍♀️', t: isJ ? `跳绳 ${G.jumpCount}/1500` : '完成游泳课', d: isJ ? '今天是跳绳日！加油！' : '今天是游泳日！加油！', g: isJ ? '🧡' : '💙' },
    { k: 'homework', e: '📝', t: '认真高效完成学校作业', d: '专注写作业，不拖拉不磨蹭', g: '💜' },
    { k: 'study', e: '📖', t: '认真学习英语', d: '专注高效，认真完成学习任务', g: '💛' },
    { k: 'outdoor', e: '⭐', t: '今日行为习惯达标', d: '做事快速、吃维生素D、早睡', g: '💚' }
  ];
  
  l.innerHTML = tasks.map(t => {
    const done = recDialogData.tasks[t.k];
    return `<div class="task-item ${done ? 'done' : ''}" onclick="recToggleTask('${t.k}')">
      <div class="task-cb">${done ? '✓' : ''}</div>
      <div class="task-em">${t.e}</div>
      <div class="task-info"><h4>${t.t}</h4><p>${t.d}</p></div>
      <div class="task-gem">${t.g}</div>
    </div>`;
  }).join('');
}

// 渲染补录对话框的故事书部分
function renderRecStoryBook() {
  const titleEl = document.getElementById('recStoryTitle');
  const previewEl = document.getElementById('recStoryPreview');
  const btnEl = document.getElementById('recBtnUnlock');
  const progressBar = document.getElementById('recStoryProgressBar');
  
  if (!titleEl || !previewEl || !btnEl) return;
  
  // 计算已完成任务数
  const done = Object.values(recDialogData.tasks).filter(v => v).length;
  const total = 4;
  
  // 渲染进度条
  if (progressBar) {
    progressBar.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const d = document.createElement('div');
      d.className = 'sp-slot ' + (i < done ? 'on' : '');
      progressBar.appendChild(d);
    }
  }
  
  // 检查是否已解锁故事
  if (recDialogData.story) {
    btnEl.disabled = false;
    btnEl.textContent = '📖 查看已选故事';
    titleEl.textContent = '✅ 今日故事已解锁！';
    previewEl.textContent = recDialogData.story.title || '故事已收集';
  } else if (done >= total) {
    btnEl.disabled = false;
    btnEl.textContent = '✨ 解锁今日故事！';
    titleEl.textContent = '🌟 故事已就绪！';
    previewEl.textContent = '所有宝石已集齐，点击解锁故事！';
  } else {
    btnEl.disabled = true;
    btnEl.textContent = `🔮 还需 ${total - done} 块宝石`;
    titleEl.textContent = '等待宝石解锁...';
    previewEl.textContent = `已收集 ${done}/${total} 块宝石`;
  }
}

// 渲染补录对话框的习惯列表
function renderRecHabits() {
  const l = document.getElementById('recHabitsList');
  if (!l) return;
  
  const habits = [
    { k: 'vitaminD', t: '吃维生素D', i: '💊' },
    { k: 'quickAction', t: '做事快速不磨蹭', i: '⚡' },
    { k: 'earlySleep', t: '早睡（10点前上床）', i: '🌙' }
  ];
  
  l.innerHTML = habits.map(h => {
    const done = recDialogData.habits[h.k];
    return `<div class="habit-item ${done ? 'done' : ''}" onclick="recToggleHabit('${h.k}')">
      <div class="habit-cb">${done ? '✓' : ''}</div>
      <span class="habit-icon">${h.i}</span>
      <span class="habit-text">${h.t}</span>
    </div>`;
  }).join('');
}

// 渲染补录对话框的勋章部分
function renderRecMedalSection() {
  const container = document.getElementById('recMedalOptions');
  if (!container) return;
  
  // 计算当前补录日期所在周是否满勤
  const dateObj = new Date(recDialogDateStr);
  const weekId = getWeekId(dateObj);
  
  // 检查本周7天是否全部完成
  const weekDates = [];
  const mondayDow = mondayDow(dateObj.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(dateObj);
    d.setDate(dateObj.getDate() - mondayDow + i);
    weekDates.push(d.toDateString());
  }
  
  let allWeekDone = true;
  weekDates.forEach(d => {
    if (!G.history[d] || !G.history[d].allDone) {
      allWeekDone = false;
    }
  });
  
  // 检查本周是否已获得勋章
  const hasMedal = G.medals && G.medals.some(m => m.weekId === weekId);
  
  let html = '';
  if (allWeekDone && !hasMedal) {
    // 可兑换
    html = `<div style="padding:10px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;margin-bottom:8px">
      <div style="color:#10B981;font-weight:600;margin-bottom:6px">✅ 本周满勤，可兑换勋章！</div>
      <button class="btn-unlock" style="background:linear-gradient(135deg,#10B981,#34D399);color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px" onclick="recRedeemMedal()">🏅 兑换本周勋章</button>
    </div>`;
  } else if (hasMedal) {
    // 已兑换
    const medal = G.medals.find(m => m.weekId === weekId);
    html = `<div style="padding:10px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:12px">
      <div style="color:var(--gold);font-weight:600">🏅 本周勋章已兑换</div>
      <div style="font-size:12px;color:var(--t3);margin-top:4px">${medal ? medal.title : ''}</div>
    </div>`;
  } else {
    // 未满勤
    html = `<div style="padding:10px;background:rgba(156,163,175,0.1);border:1px solid rgba(156,163,175,0.2);border-radius:12px;color:var(--t3);font-size:13px">
      ⚠️ 本周未满勤（7天全部完成打卡才能兑换勋章）
    </div>`;
  }
  
  container.innerHTML = html;
}

// ===== 补录对话框交互函数 =====

// 切换宝石状态
function recToggleGem(k) {
  if (k === 'story') {
    // 故事宝石：尝试解锁故事
    const done = Object.values(recDialogData.tasks).filter(v => v).length;
    if (done >= 4) {
      recUnlockStory();
    }
    return;
  }
  
  // 其他宝石：切换任务状态
  recDialogData.tasks[k] = !recDialogData.tasks[k];
  
  // 更新 gems 数组
  if (recDialogData.tasks[k]) {
    if (!recDialogData.gems.includes(k)) {
      recDialogData.gems.push(k);
    }
  } else {
    recDialogData.gems = recDialogData.gems.filter(g => g !== k);
  }
  
  renderRecSportCard();  // 更新运动卡片
  renderRecGems();
  renderRecTasks();
  renderRecStoryBook();
}

// 切换任务状态
function recToggleTask(k) {
  if (k === 'outdoor') return; // 习惯任务，不允许直接切换
  recDialogData.tasks[k] = !recDialogData.tasks[k];
  
  // 更新 gems 数组
  if (recDialogData.tasks[k]) {
    if (!recDialogData.gems.includes(k)) {
      recDialogData.gems.push(k);
    }
  } else {
    recDialogData.gems = recDialogData.gems.filter(g => g !== k);
  }
  
  renderRecSportCard();  // 更新运动卡片
  renderRecGems();
  renderRecTasks();
  renderRecStoryBook();
}

// 解锁故事
function recUnlockStory() {
  // 检查是否已选择故事
  if (recDialogData.story) {
    showStoryModal(recDialogData.story);
    return;
  }
  
  // 从故事池选择故事
  const dw = new Date(recDialogDateStr).getDay();
  const isJ = JUMP.includes(dw);
  const pool = isJ ? STORIES.jump : STORIES.swim;
  
  // 排除已收集的故事
  const collectedTitles = new Set(G.collected.map(s => s.title));
  const available = pool.filter(s => !collectedTitles.has(s.title));
  
  let story;
  if (available.length > 0) {
    // 使用确定性选择
    const dateHash = recDialogDateStr.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    story = available[dateHash % available.length];
  } else {
    // 所有故事都收集过了
    const dateHash = recDialogDateStr.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    story = pool[dateHash % pool.length];
  }
  
  recDialogData.story = story;
  if (!recDialogData.gems.includes('story')) {
    recDialogData.gems.push('story');
  }
  
  renderRecGems();
  renderRecStoryBook();
}

// 切换习惯状态
function recToggleHabit(k) {
  recDialogData.habits[k] = !recDialogData.habits[k];
  renderRecHabits();
}

// 兑换勋章
function recRedeemMedal() {
  const dateObj = new Date(recDialogDateStr);
  const weekId = getWeekId(dateObj);
  
  // 检查是否已获得
  if (G.medals && G.medals.some(m => m.weekId === weekId)) {
    alert('本周勋章已兑换！');
    return;
  }
  
  // 发放勋章
  const medalIdx = G.medals ? G.medals.length : 0;
  const medalDef = medalIdx < MEDAL_LIST.length ? MEDAL_LIST[medalIdx] : MEDAL_LIST[MEDAL_LIST.length - 1];
  
  const newMedal = {
    weekId: weekId,
    icon: medalDef.icon,
    title: medalIdx >= MEDAL_LIST.length ? medalDef.title + ' #' + (medalIdx - MEDAL_LIST.length + 2) : medalDef.title,
    desc: medalDef.desc,
    earnedDate: recDialogDateStr,
    redeemed: true,  // 补录时直接标记为已兑换
    redeemedDate: new Date().toDateString()
  };
  
  if (!G.medals) G.medals = [];
  G.medals.push(newMedal);
  
  recDialogData.medalRedeemed = true;
  renderRecMedalSection();
  
  alert('🏅 勋章兑换成功！');
}

// 隐藏补录对话框
// 隐藏补录对话框
function hideRecoveryDialog() {
  document.getElementById('recoveryDialog').style.display = 'none';
  recDialogDateStr = '';
  recDialogData = null;
}

// 确认补录
// 确认补录（重构版）
function confirmRecovery() {
  if (!recDialogDateStr || !recDialogData) {
    alert('⚠️ 补录数据异常，请重新打开对话框');
    return;
  }
  
  // 检查是否有内容
  const hasTasks = Object.values(recDialogData.tasks).some(v => v);
  const hasHabits = Object.values(recDialogData.habits).some(v => v);
  const hasStory = !!recDialogData.story;
  const hasMedal = recDialogData.medalRedeemed;
  
  if (!hasTasks && !hasHabits && !hasStory && !hasMedal) {
    alert('请至少完成一项（任务/习惯/故事/勋章）！');
    return;
  }
  
  // 初始化 history
  if (!G.history) G.history = {};
  
  // 保存补录数据到 history
  const done = Object.values(recDialogData.tasks).filter(v => v).length;
  const allDone = done >= 4;
  
  G.history[recDialogDateStr] = {
    tasks: { ...recDialogData.tasks },
    gems: [...recDialogData.gems],
    habits: { ...recDialogData.habits },
    allDone: allDone,
    date: recDialogDateStr
  };
  
  // 如果解锁了故事，加入已收集故事集
  if (recDialogData.story) {
    // 检查是否已收集过
    const alreadyCollected = G.collected.some(s => 
      s.title === recDialogData.story.title && s.date === recDialogDateStr
    );
    
    if (!alreadyCollected) {
      G.collected.push({
        ...recDialogData.story,
        date: recDialogDateStr,
        type: JUMP.includes(new Date(recDialogDateStr).getDay()) ? 'jump' : 'swim'
      });
      console.log('[补录] 故事已加入收集集：', recDialogData.story.title);
    }
  }
  
  // 更新 weekly 状态（用于勋章判断）
  if (!G.weekly) G.weekly = {};
  G.weekly[recDialogDateStr] = allDone;
  
  // 保存
  save();
  
  // 更新UI
  hideRecoveryDialog();
  renderRecoveryCalendar();
  updateRecoveryStats();
  repairData(); // 修复派生数据
  initGame(); // 重新渲染主页
  
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
  
  alert('✅ 批量补录成功！共补录 ' + count + ' 天');
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
      
      if (!data.history && !data.medals && !data.myStories) {
        alert('❌ 备份文件格式不正确！');
        return;
      }
      
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
  
  event.target.value = '';
}

// 完成补录
function finishRecovery() {
  repairData();
  save();
  
  showPage('homePage');
  
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

console.log('[v11.3] 数据补录工具已加载');
// ===== 【v11.3】启动时恢复引导 =====

// 检查并提示恢复备份
async function checkAndPromptRestore() {
  if (!currentUser) return;
  
  // 先检查 IndexedDB 是否有备份
  const idbData = await restoreFromIDB(currentUser);
  
  if (idbData && idbData.history && Object.keys(idbData.history).length > 0) {
    const backupDate = idbData.date || '未知日期';
    const dayCount = Object.keys(idbData.history).filter(k => idbData.history[k].done).length;
    const medalCount = idbData.medals ? idbData.medals.length : 0;
    const storyCount = idbData.myStories ? idbData.myStories.length : 0;
    
    // 显示恢复提示
    const message = `📂 发现备份数据（${backupDate}）\n\n` +
                   `包含：\n` +
                   `• ${dayCount} 天打卡记录\n` +
                   `• ${medalCount} 枚勋章\n` +
                   `• ${storyCount} 个故事\n\n` +
                   `是否恢复这些备份数据？\n` +
                   `（选择"取消"将从云端恢复或手动补录）`;
    
    if (confirm(message)) {
      // 用户选择恢复备份
      console.log('[恢复] 用户选择恢复 IndexedDB 备份');
      // 数据已经在 load() 中恢复了，这里只需要提示
      alert('✅ 备份数据已恢复！\n\n您可以进入补录工具继续补充数据。');
    } else {
      // 用户选择不恢复，尝试从云端恢复
      console.log('[恢复] 用户选择不恢复备份，尝试云端恢复');
      // load() 函数中已经会尝试云端恢复
    }
  } else {
    console.log('[恢复] 未找到 IndexedDB 备份');
    // 未找到备份，正常继续（load() 会处理）
  }
}

console.log('[v11.3] 启动恢复引导功能已加载');

