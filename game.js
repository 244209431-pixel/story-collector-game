// ==========================================
// 🎮 故事收集家 - 游戏核心引擎（云同步版）
// ==========================================

// ===== 云同步配置 =====
let currentUser=null; // 当前登录的用户昵称
let selectedAvatar='👧'; // 选中的头像
let syncTimer=null; // 自动同步定时器
const SYNC_STORAGE_PREFIX='storyGame_user_';

// 云端存储API（jsonblob.com - 免费、无需注册）
const JSONBLOB_API='https://jsonblob.com/api/jsonBlob';

const W=['日','一','二','三','四','五','六'];
const JUMP=[1,2,4,6,0], SWIM=[3,5];

const STORIES={
  jump:[
    {title:"🌈 彩虹跳绳手",preview:"传说在云端之上，有一位用跳绳编织彩虹的少女...",
     text:"很久很久以前，在棉花糖云朵的最顶端，住着一位叫小星星的女孩。她有一根神奇的跳绳，每跳一下，绳子划过的地方就会出现一道彩虹色的光芒。\n\n有一天，天空中的颜色突然消失了，整个世界变成了灰白色。小星星决定用她的跳绳来拯救世界。\n\n她跳了100下，红色回来了，花朵重新绽放；她跳了200下，橙色和黄色回来了，太阳重新发光；她继续跳啊跳...",
     choices:[{text:"🌟 小星星跳满1000下，所有颜色都回来了！",ending:"彩虹结局"},{text:"🦋 一只彩色蝴蝶带她飞上了更高的云朵",ending:"蝴蝶结局"}]},
    {title:"🏰 节奏城堡的秘密",preview:"在节奏城堡里，每一跳都是打开城门的钥匙...",
     text:"在遥远的音乐王国，有一座用节奏建成的城堡。这座城堡的门锁很特别——只有用跳绳的节奏才能打开。\n\n小月亮听说城堡最高塔里藏着一本能让梦想成真的故事书。她带上跳绳，来到了城堡前。\n\n\"咚-咚-咚\"，她按照节奏跳起来。第一扇门打开了，里面是一个满是泡泡的大厅。第二扇门后面是一个倒挂的花园...",
     choices:[{text:"🎵 她用最快的节奏打开了故事书！",ending:"音乐结局"},{text:"🌸 她在倒挂花园里发现了秘密通道",ending:"花园结局"}]},
    {title:"⭐ 星光跳跃者",preview:"当跳绳碰到地面的瞬间，星光就会亮起...",
     text:"在银河系的某个角落，有一颗叫做「跳跳星」的小行星。这里的居民靠跳跃产生的能量来发光。\n\n小豆豆是星球上最棒的跳绳手。今天，星球的能量快要耗尽了，天空越来越暗。\n\n\"如果不赶快跳够1000下，我们的星球就会熄灭！\"长老焦急地说。\n\n小豆豆紧紧握住跳绳，深吸一口气...",
     choices:[{text:"💫 星球重新发出耀眼的光芒！",ending:"闪耀结局"},{text:"🚀 她跳得太高飞到了太空，遇见了外星朋友",ending:"太空结局"}]},
    {title:"🌺 花园精灵的请求",preview:"一个声音从花丛中传来：请帮帮我们...",
     text:"放学回家的路上，小叶子听到了一个细小的声音。她蹲下来仔细看，发现一朵小花里藏着一个巴掌大的精灵！\n\n\"你好呀，我叫花花，我们花园精灵王国遇到了大麻烦。坏心的枯叶巫师封印了我们的花园，只有跳绳的快乐能量才能解除封印。\"\n\n小叶子二话不说拿出了跳绳。每跳一下，就有一朵花重新绽放...",
     choices:[{text:"🌻 花园恢复了，精灵们送了她一顶花冠",ending:"花冠结局"},{text:"🧚 小叶子变小成了精灵王国荣誉公民",ending:"精灵结局"}]},
    {title:"🎪 魔法马戏团",preview:"一张闪闪发光的门票从天而降...",
     text:"一个下午，一张金色的门票从天而降。上面写着：\"魔法马戏团——今晚特别演出：跳绳之星\"\n\n她来到帐篷前，发现这里的一切都是倒过来的！小丑在天花板上走路，大象在吹泡泡，狮子在跳芭蕾舞。\n\n\"我们缺一位跳绳表演者，\"穿着星星斗篷的团长说，\"只有跳够1000下，才能让魔法运转起来。\"",
     choices:[{text:"🎪 演出大成功！月亮和星星都来鼓掌了",ending:"明星结局"},{text:"🎩 她获得了一顶能变出糖果的魔法帽子",ending:"魔法结局"}]}
  ],
  swim:[
    {title:"🧜‍♀️ 珊瑚王国历险记",preview:"在大海的最深处，隐藏着珊瑚做成的王国...",
     text:"游泳课结束后，小鱼发现泳池的水变成了蔚蓝色，还有小鱼在游来游去！\n\n她潜入水中，惊讶地发现自己能在水下呼吸。一条金色的小鱼说：\"欢迎来到珊瑚王国！国王想见你。\"\n\n珊瑚王国真美啊！到处是五颜六色的珊瑚，水母像灯笼一样发着光...",
     choices:[{text:"🐚 她成为了珊瑚公主！",ending:"公主结局"},{text:"🐬 她和海豚去探索海底洞穴",ending:"海豚结局"}]},
    {title:"💧 水之歌",preview:"每一滴水都在唱歌，你听到了吗？",
     text:"小水滴最喜欢游泳课了。今天她隐约听到了水里传来的歌声。\n\n\"来吧来吧，跟我们一起唱歌~\"水精灵们正在准备水下音乐会。\n\n\"我们的指挥家迷路了，没有指挥音乐会开不了。你愿意帮忙吗？\"",
     choices:[{text:"🎶 她成为了水下音乐会的指挥！",ending:"音乐家结局"},{text:"🌊 她跟着音乐找到了秘密瀑布和宝藏",ending:"宝藏结局"}]},
    {title:"🐢 海龟爷爷的地图",preview:"一只古老的海龟带来了藏宝图...",
     text:"在泳池角落，小贝发现了一只小海龟——它居然在动！\n\n\"我已经活了一千年了，\"海龟爷爷说，\"我有一张通往海底花园的地图。只有会游泳的勇敢孩子才能找到那里。\"\n\n地图标注着三个关卡：漩涡通道、水母森林和鲸鱼之门...",
     choices:[{text:"🌺 她找到了永不凋谢的海底花园",ending:"花园结局"},{text:"🐋 她骑上大鲸鱼环游了整个海洋",ending:"环游结局"}]}
  ],
  hero:{title:"🦸‍♀️ 跳绳小英雄 · 专属篇章",
    text:"🎉 恭喜！连续3天坚持跳绳打卡，解锁隐藏章节！\n\n在跳绳王国里，有一个古老的传说——当勇士连续三天跳绳，跳绳之神就会出现。\n\n今天，当你跳完最后一个的时候，一道金色光芒笼罩了你。跳绳变成了闪耀的丝带，脚下出现了云朵。\n\n\"你就是跳绳小英雄！你的跳绳将拥有彩虹的力量！\"\n\n你高高地跳起来，在空中画出了完美的彩虹。所有朋友都在为你欢呼！"},
  spirit:{title:"🧜‍♀️ 水中精灵 · 觉醒篇",
    text:"🌊 太棒了！本周游泳课满两次，获得'水中精灵'称号！\n\n当你第二次从泳池出来时，水滴没有掉落——它们在你周围轻轻飘浮。\n\n\"是时候了，\"水之女神说，\"你就是水中精灵！\"\n\n你的故事里多了一个新角色——水之精灵。它会在你困难时化作泉水给你力量，开心时变成喷泉为你庆祝！\n\n✨ 水中精灵已加入你的故事伙伴团！"}
};

// ===== 游戏状态 =====
let G={
  date:new Date().toDateString(),jumpCount:0,swimDone:false,
  tasks:{sport:false,homework:false,study:false,outdoor:false},
  habits:{fast:false,tidy:false,polite:false},
  gems:[],streak:0,weekly:{},
  collected:[],myStories:[],
  ach:{jumpHero:false,waterSpirit:false,storyDirector:false,goodHabit:false},
  consJump:0,weekSwim:0,totalDays:0,dirUnlocked:false
};

function save(){
  if(!currentUser)return;
  const key=SYNC_STORAGE_PREFIX+currentUser;
  const data={...G, _user:currentUser, _avatar:selectedAvatar, _lastSync:Date.now()};
  localStorage.setItem(key,JSON.stringify(data));
  // 异步同步到云端
  cloudSave(data);
}

function load(){
  if(!currentUser)return;
  const key=SYNC_STORAGE_PREFIX+currentUser;
  const s=localStorage.getItem(key);
  if(s){
    try{const d=JSON.parse(s);G={...G,...d};}catch(e){}
  }
  const today=new Date().toDateString();
  if(G.date!==today){
    const allDone=Object.values(G.tasks).every(v=>v);
    if(allDone){G.streak++;G.totalDays++;G.weekly[G.date]=true}
    else{G.streak=0;G.weekly[G.date]=false}
    G.jumpCount=0;G.swimDone=false;
    G.tasks={sport:false,homework:false,study:false,outdoor:false};
    G.habits={fast:false,tidy:false,polite:false};
    G.gems=[];G.date=today;save();
  }
}

// ===== 云端存储（使用免费的 jsonblob.com） =====
async function cloudSave(data){
  try{
    updateSyncUI('syncing');
    const blobId=localStorage.getItem('storyGame_blobId_'+currentUser);
    if(blobId){
      // 更新已有的blob
      await fetch(JSONBLOB_API+'/'+blobId,{
        method:'PUT',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify(data)
      });
    }else{
      // 创建新的blob
      const resp=await fetch(JSONBLOB_API,{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify(data)
      });
      if(resp.ok){
        const loc=resp.headers.get('Location')||resp.headers.get('location');
        if(loc){
          const newId=loc.split('/').pop();
          localStorage.setItem('storyGame_blobId_'+currentUser,newId);
        }
      }
    }
    updateSyncUI('done');
  }catch(e){
    console.log('云端同步失败，使用本地存储',e);
    updateSyncUI('offline');
  }
}

async function cloudLoad(){
  try{
    updateSyncUI('syncing');
    const blobId=localStorage.getItem('storyGame_blobId_'+currentUser);
    if(!blobId){updateSyncUI('done');return false;}
    const resp=await fetch(JSONBLOB_API+'/'+blobId,{
      headers:{'Accept':'application/json'}
    });
    if(resp.ok){
      const data=await resp.json();
      if(data&&data._user===currentUser){
        const localKey=SYNC_STORAGE_PREFIX+currentUser;
        const localStr=localStorage.getItem(localKey);
        let localData=null;
        try{localData=localStr?JSON.parse(localStr):null;}catch(e){}
        // 用最新的数据（比较时间戳）
        if(!localData||!localData._lastSync||data._lastSync>localData._lastSync){
          G={...G,...data};
          localStorage.setItem(localKey,JSON.stringify(data));
          updateSyncUI('done');
          return true;
        }
      }
    }
    updateSyncUI('done');
    return false;
  }catch(e){
    console.log('云端加载失败，使用本地数据',e);
    updateSyncUI('offline');
    return false;
  }
}

function updateSyncUI(status){
  const dot=document.getElementById('syncDot');
  const loginSync=document.getElementById('syncStatus');
  if(status==='syncing'){
    if(dot)dot.textContent='🔄';
    if(loginSync)loginSync.textContent='🔄 正在同步...';
  }else if(status==='done'){
    if(dot)dot.textContent='☁️';
    if(loginSync)loginSync.textContent='✅ 云端已同步';
  }else{
    if(dot)dot.textContent='📴';
    if(loginSync)loginSync.textContent='📴 离线模式（数据存在本地）';
  }
}

// ===== 登录 =====
// 固定账号配置
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
    // 密码错误时抖动效果
    const card=document.querySelector('.login-card');
    card.style.animation='none';
    card.offsetHeight; // 触发 reflow
    card.style.animation='loginShake 0.5s ease';
    return;
  }
  
  currentUser=ACCOUNT_NAME;
  selectedAvatar=ACCOUNT_AVATAR;
  // 保存登录状态和版本标记
  localStorage.setItem('storyGame_currentUser',ACCOUNT_NAME);
  localStorage.setItem('storyGame_currentAvatar',ACCOUNT_AVATAR);
  localStorage.setItem('storyGame_loginVer','v2');
  
  // 先尝试从云端加载
  await cloudLoad();
  // 再从本地加载（如果云端更新了就用云端的）
  load();
  
  // 显示游戏界面
  document.getElementById('loginOverlay').style.display='none';
  document.getElementById('appContainer').style.display='';
  document.querySelector('.bottom-nav').style.display='';
  
  // 设置头像和名称
  document.querySelector('.avatar').textContent=ACCOUNT_AVATAR;
  const crown=document.getElementById('crownIcon');
  if(crown)document.querySelector('.avatar').innerHTML=ACCOUNT_AVATAR+'<span class="crown" id="crownIcon" '+(G.totalDays>=7?'':'style="display:none"')+'>👑</span>';
  document.getElementById('playerName').textContent=ACCOUNT_NAME;
  
  // 初始化界面
  initGame();
  
  // 开启自动同步（每30秒同步一次）
  if(syncTimer)clearInterval(syncTimer);
  syncTimer=setInterval(()=>{
    if(currentUser)cloudSave({...G,_user:currentUser,_avatar:selectedAvatar,_lastSync:Date.now()});
  },30000);
}

function doLogout(){
  if(confirm('确定要退出登录吗？')){
    // 先保存当前数据
    save();
    currentUser=null;
    localStorage.removeItem('storyGame_currentUser');
    if(syncTimer){clearInterval(syncTimer);syncTimer=null;}
    // 重置G
    G={
      date:new Date().toDateString(),jumpCount:0,swimDone:false,
      tasks:{sport:false,homework:false,study:false,outdoor:false},
      habits:{fast:false,tidy:false,polite:false},
      gems:[],streak:0,weekly:{},
      collected:[],myStories:[],
      ach:{jumpHero:false,waterSpirit:false,storyDirector:false,goodHabit:false},
      consJump:0,weekSwim:0,totalDays:0,dirUnlocked:false
    };
    // 显示登录页
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

// ===== 彩虹闪光粒子 🦄 =====
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
function switchPage(p){
  document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  const map={home:'homePage',achieve:'achievePage',treasure:'treasurePage'};
  document.getElementById(map[p]).classList.add('active');
  event.currentTarget.classList.add('active');
}

// ===== 日期导航 =====
function renderDateNav(){
  const nav=document.getElementById('dateNav');nav.innerHTML='';
  const today=new Date(),dow=today.getDay();
  for(let i=0;i<7;i++){
    const d=new Date(today);d.setDate(today.getDate()-dow+i);
    const isToday=d.toDateString()===today.toDateString();
    const dw=d.getDay(),isJ=JUMP.includes(dw),isS=SWIM.includes(dw);
    const done=G.weekly[d.toDateString()]===true;
    const div=document.createElement('div');
    div.className='day-item'+(isToday?' active':'')+(isJ?' jd':'')+(isS?' sd':'')+(done?' done':'');
    div.innerHTML=`<div class="dn">周${W[dw]}</div><div class="dd">${d.getDate()}</div>`;
    nav.appendChild(div);
  }
}

// ===== 运动卡片 =====
function renderSport(){
  const c=document.getElementById('sportCardContainer');
  const dw=new Date().getDay(),isJ=JUMP.includes(dw),isS=SWIM.includes(dw);
  let h='';
  if(isJ){
    const pct=Math.min(100,(G.jumpCount/1000)*100),done=G.jumpCount>=1000;
    h=`<div class="sport-card jc">
      <div class="sport-head"><div class="sport-icon">🏃‍♀️</div>
        <div class="sport-info"><h3>今日跳绳日 🎯</h3><p>目标：跳满 1000 个</p></div></div>
      <div class="progress-bg"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="progress-txt"><span>已跳 ${G.jumpCount} 个</span><span>${done?'✅ 已完成！':'还差 '+(1000-G.jumpCount)+' 个'}</span></div>
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
    {k:'sport',e:isJ?'🏃‍♀️':'🏊‍♀️',t:isJ?`跳绳 ${G.jumpCount}/1000`:'完成游泳课',d:isJ?'今天是跳绳日！加油！':'今天是游泳日！加油！',g:isJ?'🧡':'💙'},
    {k:'homework',e:'📝',t:'认真高效完成学校作业',d:'专注写作业，不拖拉不磨蹭',g:'💜'},
    {k:'study',e:'📖',t:'认真高效学习完成新概念',d:'每天30-60分钟，专注学习',g:'💛'},
    {k:'outdoor',e:'⭐',t:'今日行为习惯达标',d:'做事快速、自律、有礼貌',g:'💚'}
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
  if(done>=total){btn.disabled=false;btn.textContent='✨ 解锁今日故事！';tt.textContent='🌟 故事已就绪！';pv.textContent='所有宝石已集齐，点击解锁故事！'}
  else{btn.disabled=true;btn.textContent=`🔮 还需 ${total-done} 块宝石`;tt.textContent='等待宝石解锁...';pv.textContent=`已收集 ${done}/${total} 块宝石`}
}

// ===== 操作 =====
function addJump(n){
  if(G.tasks.sport)return;
  G.jumpCount=Math.max(0,G.jumpCount+n);
  if(G.jumpCount>=1000){G.jumpCount=1000;G.tasks.sport=true;G.consJump++;gemAnim('🧡');checkJumpHero()}
  renderSport();renderGems();renderTasks();renderStoryProg();save();
}
function completeJump(){G.jumpCount=1000;G.tasks.sport=true;G.consJump++;gemAnim('🧡');renderSport();renderGems();renderTasks();renderStoryProg();checkJumpHero();save()}
function completeSwim(){
  if(G.swimDone)return;G.swimDone=true;G.tasks.sport=true;G.weekSwim++;
  gemAnim('💙');renderSport();renderGems();renderTasks();renderStoryProg();checkWaterSpirit();save();
}
function toggleTask(k){
  if(k==='outdoor')return; // outdoor由行为习惯模块控制
  G.tasks[k]=!G.tasks[k];
  if(G.tasks[k]){const m={homework:'💜',study:'💛'};if(m[k])gemAnim(m[k]);if(!G.gems.includes(k))G.gems.push(k)}
  else G.gems=G.gems.filter(g=>g!==k);
  renderGems();renderTasks();renderStoryProg();save();
}

// ===== 动画 =====
function gemAnim(g){
  const el=document.createElement('div');el.className='gem-fly';el.textContent=g;
  el.style.left=(innerWidth/2-24)+'px';el.style.top=(innerHeight/2)+'px';
  document.body.appendChild(el);setTimeout(()=>el.remove(),1200);
  // 更多更大的掉落装饰
  for(let i=0;i<16;i++)setTimeout(()=>{
    const c=document.createElement('div');c.className='confetti';
    c.textContent=['✨','⭐','💫','🌈','🦄','🎀','💖','🔮','👑','🌟','💎','🎆'][~~(Math.random()*12)];
    c.style.left=Math.random()*innerWidth+'px';c.style.top='-30px';
    c.style.animationDelay=Math.random()*0.6+'s';
    c.style.fontSize=(28+Math.random()*20)+'px';
    document.body.appendChild(c);setTimeout(()=>c.remove(),3000);
  },i*60);
  // 放一朵烟花
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
  // 放3朵烟花
  for(let i=0;i<3;i++){
    setTimeout(()=>launchFirework(innerWidth*(0.2+Math.random()*0.6), innerHeight*(0.15+Math.random()*0.35)),400+i*500);
  }
}

// ===== 烟花效果 🎆 =====
function launchFirework(x,y){
  const colors=['#FF6FB7','#A855F7','#4A7CF7','#FFD700','#22D3EE','#FB7185','#34D399','#FBBF24','#DA77F2','#F43F5E'];
  const color1=colors[~~(Math.random()*colors.length)];
  const color2=colors[~~(Math.random()*colors.length)];
  // 扩散光环
  const ring=document.createElement('div');
  ring.className='firework-ring';
  ring.style.left=(x-5)+'px';ring.style.top=(y-5)+'px';
  ring.style.borderColor=color1;
  document.body.appendChild(ring);setTimeout(()=>ring.remove(),900);
  // 粒子爆炸
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
function unlockStory(){
  const dw=new Date().getDay(),isJ=JUMP.includes(dw);
  const pool=isJ?STORIES.jump:STORIES.swim;
  const story=pool[~~(Math.random()*pool.length)];
  if(!G.gems.includes('story'))G.gems.push('story');
  G.collected.push({...story,date:new Date().toLocaleDateString('zh-CN'),type:isJ?'jump':'swim'});
  renderGems();renderCollected();save();showStoryModal(story);bigConfetti();
}
function showStoryModal(s){
  document.getElementById('mStoryTitle').textContent=s.title;
  let b=`<div class="story-text">${s.text.replace(/\n/g,'<br>')}</div>`;
  if(s.choices&&s.choices.length){
    b+='<p style="margin-top:12px;color:var(--gold);font-size:13px">选择你想要的结局：</p><div class="story-choices">';
    s.choices.forEach(c=>{b+=`<button class="s-choice" onclick="selectEnd('${c.ending}')">${c.text}</button>`});
    b+='</div>';
  }
  document.getElementById('mStoryBody').innerHTML=b;
  document.getElementById('storyModal').classList.add('show');
}
function selectEnd(e){
  document.getElementById('mStoryBody').innerHTML+=`<div style="margin-top:16px;padding:14px;background:rgba(255,215,0,.1);border-radius:12px;border:1px solid rgba(255,215,0,.3)">
    <p style="color:var(--gold);font-size:14px">🎬 你选择了「${e}」</p><p style="color:var(--t2);font-size:12px;margin-top:6px">已保存到成长宝箱！</p></div>`;
  document.querySelectorAll('.s-choice').forEach(b=>b.style.display='none');
}
function closeModal(id){document.getElementById(id).classList.remove('show')}

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
  const achs=[
    {k:'jumpHero',i:'🦸‍♀️',t:'跳绳小英雄',d:'连续3天完成跳绳',p:`${Math.min(3,G.consJump)}/3天`},
    {k:'waterSpirit',i:'🧜‍♀️',t:'水中精灵',d:'本周完成两次游泳课',p:`${Math.min(2,G.weekSwim)}/2次`},
    {k:'goodHabit',i:'🌟',t:'好习惯之星',d:'行为习惯全部达标',p:Object.values(G.habits).filter(v=>v).length+'/3项'},
    {k:'storyDirector',i:'🎬',t:'故事导演权',d:'集满7天宝箱碎片',p:`${Math.min(7,G.totalDays)}/7天`}
  ];
  l.innerHTML=achs.map(a=>{
    const on=G.ach[a.k];
    return `<div class="ach-card ${on?'on':'off'}"><div class="ach-icon">${a.i}</div>
      <div class="ach-info"><h4>${a.t}</h4><p>${a.d}</p></div>
      <div class="ach-prog">${on?'✅ 已解锁':a.p}</div></div>`;
  }).join('');
}

// ===== 宝箱 =====
function renderTreasure(){
  const d=document.getElementById('treasureDays');d.innerHTML='';
  for(let i=0;i<7;i++){const div=document.createElement('div');div.className='t-day'+(i<G.totalDays?' on':'');div.textContent=i<G.totalDays?'💎':(i+1);d.appendChild(div)}
  const btn=document.getElementById('btnChest');
  if(G.totalDays>=7){btn.disabled=false;btn.textContent='🎉 开启成长宝箱！';document.getElementById('treasureChest').textContent='🎁'}
  else{btn.disabled=true;btn.textContent=`🔒 还需 ${7-G.totalDays} 天`}
  if(G.dirUnlocked)document.getElementById('directorMode').classList.add('show');
  renderMyStories();renderCollected();
}
function openChest(){
  G.dirUnlocked=true;G.ach.storyDirector=true;save();
  document.getElementById('directorMode').classList.add('show');
  document.getElementById('btnChest').style.display='none';
  showAchModal('🎬 故事导演权解锁！',{text:'🎉🎉🎉 恭喜恭喜！\n\n你坚持了整整7天！你是最棒的故事收集家！\n\n作为奖励，你现在拥有了「故事导演权」——可以自己编写故事加入游戏！\n\n快去写下你自己的故事吧！✨'});
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

// ===== 行为习惯 ⭐ =====
function renderHabits(){
  const l=document.getElementById('habitsList');
  if(!l)return;
  const habits=[
    {k:'fast',e:'⚡',t:'做事快速不拖拉',d:'行动力满满，说做就做！'},
    {k:'tidy',e:'🧹',t:'自己的事情自己做',d:'整理书包、收拾房间、自律自觉'},
    {k:'polite',e:'💝',t:'有礼貌、好态度',d:'对人友善，积极乐观，不发脾气'}
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
    setTimeout(()=>showAchModal('🌟 好习惯之星！',{text:'🎉 太棒了！\n\n你今天的行为习惯全部达标！\n\n做事快速不拖拉 ⚡\n自己的事情自己做 🧹\n有礼貌好态度 💝\n\n你就是最闪亮的好习惯之星！继续保持哦！✨'}),600);
    renderAch();
  } else if(allDone){
    G.tasks.outdoor=true;
    renderGems();renderTasks();renderStoryProg();
  } else {
    G.tasks.outdoor=false;
    G.gems=G.gems.filter(g=>g!=='outdoor');
    renderGems();renderTasks();renderStoryProg();
  }
  renderHabits();save();
}

// ===== 状态栏 =====
function updateStatus(){
  document.getElementById('streakCount').textContent=G.streak;
  const badges=document.getElementById('titleBadges');let bh='';
  if(G.ach.jumpHero)bh+='<span class="badge hero">🦸‍♀️ 跳绳小英雄</span>';
  if(G.ach.waterSpirit)bh+='<span class="badge water">🧜‍♀️ 水中精灵</span>';
  if(G.ach.storyDirector)bh+='<span class="badge dir">🎬 故事导演</span>';
  badges.innerHTML=bh;
  if(G.totalDays>=7){document.getElementById('crownIcon').style.display='';document.getElementById('playerTitle').textContent='传奇故事收集家'}
  else if(G.totalDays>=3)document.getElementById('playerTitle').textContent='资深冒险者';
  else if(G.streak>=1)document.getElementById('playerTitle').textContent='初级冒险者';
}

// ===== 初始化 =====
function initGame(){
  createStars();renderDateNav();renderSport();renderGems();renderTasks();renderStoryProg();renderHabits();renderAch();renderTreasure();updateStatus();
}

// 启动：检查是否已登录
(async function startup(){
  createStars(); // 先创建背景粒子
  // 版本标记：v2 表示密码登录版本，旧版本没有这个标记需要重新验证密码
  const loginVer=localStorage.getItem('storyGame_loginVer');
  if(!loginVer||loginVer<'v2'){
    // 旧版本登录状态，清除并要求重新输密码
    localStorage.removeItem('storyGame_currentUser');
    localStorage.removeItem('storyGame_currentAvatar');
  }
  const savedUser=localStorage.getItem('storyGame_currentUser');
  if(savedUser===ACCOUNT_NAME){
    // 自动登录（之前已验证过密码）
    currentUser=ACCOUNT_NAME;
    selectedAvatar=ACCOUNT_AVATAR;
    
    // 先尝试从云端加载
    await cloudLoad();
    load();
    
    // 显示游戏界面
    document.getElementById('loginOverlay').style.display='none';
    document.getElementById('appContainer').style.display='';
    document.querySelector('.bottom-nav').style.display='';
    
    // 设置头像和名称
    document.querySelector('.avatar').textContent=ACCOUNT_AVATAR;
    const crown=document.getElementById('crownIcon');
    if(crown)document.querySelector('.avatar').innerHTML=ACCOUNT_AVATAR+'<span class="crown" id="crownIcon" '+(G.totalDays>=7?'':'style="display:none"')+'>👑</span>';
    document.getElementById('playerName').textContent=ACCOUNT_NAME;
    
    initGame();
    
    // 开启自动同步
    if(syncTimer)clearInterval(syncTimer);
    syncTimer=setInterval(()=>{
      if(currentUser)cloudSave({...G,_user:currentUser,_avatar:selectedAvatar,_lastSync:Date.now()});
    },30000);
  }else{
    // 显示登录页，隐藏游戏
    document.getElementById('loginOverlay').style.display='';
    document.getElementById('appContainer').style.display='none';
    document.querySelector('.bottom-nav').style.display='none';
    document.getElementById('passwordInput').focus();
  }
  // 监听回车键
  document.getElementById('passwordInput').addEventListener('keypress',function(e){
    if(e.key==='Enter')doLogin();
  });
})();