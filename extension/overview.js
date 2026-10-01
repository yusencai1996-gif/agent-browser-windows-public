/* Trusted management page. Data stays in memory and is rendered as text. */
(() => {
  const $=id=>document.getElementById(id);
  const state={rows:[],selected:null,tab:null,generation:null,visible:false,busy:false,external:false};
  const pending=new Map(),images=new Map(),collapsedAgents=new Set(),collapsedTasks=new Set();let port,timer,seq=0,revision=0,confirmAction;
  const labels={running:'执行中',waiting:'等待指令',ended:'已结束',pending:'正在等待在途操作结束',human:'已接管 · ABW已暂停',unconfirmed:'停止未确认'};
  const text=(tag,value,className)=>{const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;return el;};
  const selected=()=>state.rows.find(r=>r.id===state.selected);
  const selectedTab=()=>selected()?.tabs.find(t=>t.id===state.tab);
  const imageKey=t=>state.generation+':'+t.id+':'+t.documentKey;
  function notice(value){$('notice').textContent=value;}
  function request(action,extra={}){
    if(!port)return Promise.reject(new Error('连接已断开'));
    const id=++seq;return new Promise((resolve,reject)=>{const deadline=setTimeout(()=>{pending.delete(id);reject(new Error('操作尚未确认，请查看当前状态'));},42000);pending.set(id,{resolve,reject,deadline});port.postMessage({id,action,...extra});});
  }
  function schedule(delay=5000){clearTimeout(timer);if(port&&state.visible)timer=setTimeout(refresh,delay);}
  function render(){
    const row=selected(),tab=selectedTab();
    const focus=document.activeElement?.dataset.focusKey;
    $('count').textContent=`${state.rows.reduce((n,r)=>n+r.tabs.length,0)} 页`;$('tasks').replaceChildren();
    if(!state.rows.length)$('tasks').append(text('p','暂无任务网页。Agent 创建任务后会在这里出现。','empty-pages'));
    const groups=new Map();
    for(const r of state.rows){const key=r.human?'human':r.agentName?'agent:'+r.agentName:'undeclared';if(!groups.has(key))groups.set(key,{key,name:r.human?'我的窗口与未分配':r.agentName||'未声明 Agent',rows:[]});groups.get(key).rows.push(r);}
    for(const group of groups.values()){
      const section=document.createElement('section');section.className='agent-group';
      const toggle=document.createElement('button');toggle.className='group-toggle';toggle.dataset.agent=group.key;toggle.dataset.focusKey='agent:'+group.key;toggle.setAttribute('aria-expanded',String(!collapsedAgents.has(group.key)));toggle.title=group.name;
      toggle.append(text('span',collapsedAgents.has(group.key)?'›':'⌄','chevron'),text('span',group.name,'group-name'),text('span',`${group.rows.length} 项 · ${group.rows.reduce((n,r)=>n+r.tabs.length,0)} 页`,'group-count'));section.append(toggle);
      if(!collapsedAgents.has(group.key))for(const r of group.rows){
        const task=document.createElement('div');task.className='task-group';
        const taskToggle=document.createElement('button');taskToggle.className='task-toggle';taskToggle.dataset.toggleTask=r.id;taskToggle.dataset.focusKey='task:'+r.id;taskToggle.setAttribute('aria-expanded',String(!collapsedTasks.has(r.id)));taskToggle.setAttribute('aria-current',String(r.id===state.selected));taskToggle.title=r.name===r.id?r.name:`${r.name} · ${r.id}`;
        const info=document.createElement('span');info.append(text('strong',r.name),text('small',`${r.human?(r.closable?'人类窗口':'ABW未认领'):labels[r.state]||'状态未知'}${r.name!==r.id&&!r.human?' · '+r.id:''}`));taskToggle.append(text('span',collapsedTasks.has(r.id)?'›':'⌄','chevron'),info);task.append(taskToggle);
        if(!collapsedTasks.has(r.id)){
          const pages=document.createElement('div');pages.className='page-list';
          if(!r.tabs.length)pages.append(text('p',r.revoked?'任务已结束 · 没有保留的网页':'暂无网页 · 等待任务创建','empty-pages'));
          for(const t of r.tabs){
            const page=document.createElement('button');page.className='page-row';page.dataset.row=r.id;page.dataset.page=String(t.id);page.dataset.focusKey=`page:${r.id}:${t.id}`;page.setAttribute('aria-current',String(r.id===state.selected&&t.id===state.tab));page.title=`${t.title||'未命名网页'} · ${t.origin}`;
            const mini=text('span','预览','mini'),detail=document.createElement('span');detail.className='page-info';detail.append(text('strong',t.title||'未命名网页'),text('small',`${t.status==='loading'?'加载中':t.status==='complete'?'已载入':'状态未知'} · ${t.origin}`));page.append(mini,detail);pages.append(page);
          }
          task.append(pages);
        }
        section.append(task);
      }
      $('tasks').append(section);
    }
    if(focus)for(const el of $('tasks').querySelectorAll('[data-focus-key]'))if(el.dataset.focusKey===focus){el.focus();break;}
    $('task-context').textContent=row?(row.human?row.name:`${row.agentName||'未声明 Agent'} / ${row.name}`):'在左侧选择任务网页';
    $('task-title').textContent=tab?.title|| (row?'暂无网页':'选择一个网页');$('task-title').title=tab?.title||'';$('task-status').textContent=row?(row.human?(row.closable?'人类窗口 · 未分配给ABW':'未分配给ABW · 不推断外部状态'):labels[row.state]||'状态未知'):'没有可显示的任务';
    $('takeover').hidden=!row||row.human||row.revoked;$('takeover').disabled=state.busy||!row||['pending','unconfirmed'].includes(row.state);
    $('takeover').textContent=row?.state==='human'?'交还此任务':'接管此任务';
    $('show').disabled=!tab||state.busy;$('close-human').hidden=!row?.closable;$('close-human').disabled=!tab||state.busy;
    $('show').textContent=row&&!row.human&&row.state==='human'?'进入网页操作 ↗':'查看实际网页 ↗';
    $('page-title').textContent=tab?`${tab.title} · ${tab.origin}`:'暂无标签';
    $('external-note').textContent=state.external?'OpenCLI状态未知；接管按钮只暂停ABW，请先结束OpenCLI操作。':'';
    paint();
  }
  function paint(){const tab=selectedTab(),cache=tab&&images.get(imageKey(tab));for(const button of document.querySelectorAll('.page-row')){const row=state.rows.find(r=>r.id===button.dataset.row),page=row?.tabs.find(t=>t.id===Number(button.dataset.page)),small=page&&images.get(imageKey(page));if(small?.image){const img=document.createElement('img');img.src=small.image;img.alt='最近页面预览';button.querySelector('.mini').replaceChildren(img);}} $('image').hidden=!cache?.image;$('placeholder').hidden=!!cache?.image;if(cache?.image)$('image').src=cache.image;else{$('image').removeAttribute('src');$('placeholder').textContent=cache?.error||'选择网页后加载最近截图预览';}
    $('freshness').textContent=cache?.updatedAt?`${cache.stale?'上次预览':'更新于'} ${new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Shanghai'}).format(cache.updatedAt)}${cache.error?' · '+cache.error:''}`:'只在总览可见且任务空闲时更新';
  }
  async function refresh(){
    clearTimeout(timer);if(!port||!state.visible)return;
    const version=revision;
    try{
      const data=await request('snapshot');if(version!==revision||!state.visible)return;
      if(state.generation!==data.generation){images.clear();state.generation=data.generation;state.selected=null;state.tab=null;}
      state.rows=data.tasks;state.external=data.externalBridge;
      if(!selected()){state.selected=(state.rows.find(r=>!r.human&&!r.revoked&&r.tabs.length)||state.rows.find(r=>!r.human&&!r.revoked)||state.rows[0])?.id||null;state.tab=null;}
      if(!selectedTab())state.tab=selected()?.current||selected()?.tabs[0]?.id;
      render();const tab=selectedTab();
      if(tab&&!state.busy){const target=tab.id,key=imageKey(tab);const result=await request('preview',{tabId:target});if(version===revision&&state.visible&&selectedTab()?.id===target&&imageKey(selectedTab())===key&&(!result.documentKey||result.documentKey===tab.documentKey)){images.set(key,result);while(images.size>8)images.delete(images.keys().next().value);paint();}}
    }catch(e){notice(e.message==='OVERVIEW_HIDDEN'?'总览隐藏，预览已暂停。':e.message);}
    finally{schedule();}
  }
  function connect(){
    if(port)return;
    const local=chrome.runtime.connect({name:'abw-overview'});port=local;$('connection').textContent='正在连接';
    local.onMessage.addListener(message=>{
      if(message.event==='visibility'){state.visible=message.visible;revision++;clearTimeout(timer);$('connection').textContent=state.visible?'已连接':'预览已暂停';if(state.visible)schedule(0);return;}
      const item=pending.get(message.id);if(!item)return;clearTimeout(item.deadline);pending.delete(message.id);message.ok?item.resolve(message.data):item.reject(new Error(message.error||'操作未完成'));
    });
    local.onDisconnect.addListener(()=>{if(port!==local)return;port=null;state.visible=false;revision++;clearTimeout(timer);for(const p of pending.values()){clearTimeout(p.deadline);p.reject(new Error('连接已断开'));}pending.clear();$('connection').textContent='连接已断开';});
  }
  async function act(action,extra={}){if(state.busy)return;state.busy=true;revision++;clearTimeout(timer);if(action==='takeover'&&selected())selected().state='pending';render();schedule();try{const result=await request(action,extra);notice(action==='takeover'?(result.confirmed?'ABW已暂停，网页自身活动不会回滚。':'停止未确认，请勿认为在途操作已结束。'):action==='return'?'已明确交还此任务。':'操作已完成。');if(action==='new-human'){state.selected='human:'+result.windowId;state.tab=result.tabId;}}catch(e){notice(e.message==='REVOKED'?'任务已结束，不会重新启动。':e.message);}finally{state.busy=false;render();if(state.visible)schedule(0);}}
  function confirm(title,description,action){$('confirm-title').textContent=title;$('confirm-text').textContent=description;confirmAction=action;$('confirm').showModal();}
  $('tasks').addEventListener('click',e=>{
    if(!e.isTrusted)return;const b=e.target.closest('button');if(!b)return;
    if(b.dataset.agent){const key=b.dataset.agent;collapsedAgents.has(key)?collapsedAgents.delete(key):collapsedAgents.add(key);render();return;}
    if(b.dataset.toggleTask){const id=b.dataset.toggleTask;if(state.selected!==id){state.selected=id;state.tab=selected()?.current||selected()?.tabs[0]?.id;}collapsedTasks.has(id)?collapsedTasks.delete(id):collapsedTasks.add(id);revision++;render();schedule(0);return;}
    if(b.dataset.page){state.selected=b.dataset.row;state.tab=Number(b.dataset.page);revision++;render();schedule(0);}
  });
  $('takeover').addEventListener('click',e=>{if(!e.isTrusted||state.busy)return;const row=selected();if(!row||row.human||row.revoked)return;const name=row.id;if(row.state==='human')confirm('交还此任务？','交还后，这个任务可以继续操作它持有的页面。',()=>act('return',{task:name}));else confirm('接管此任务？',state.external?'这只暂停ABW。OpenCLI仍可能操作页面，请先结束它的操作。':'会先停止新指令，等待已有操作确认后再显示已接管。',()=>act('takeover',{task:name}));});
  $('confirm-action').addEventListener('click',e=>{if(!e.isTrusted)return;const action=confirmAction;confirmAction=null;$('confirm').close();void action?.();});$('cancel').onclick=()=>{$('confirm').close();confirmAction=null;};
  $('add-human').addEventListener('click',e=>{if(e.isTrusted)void act('new-human');});
  $('show').addEventListener('click',e=>{if(e.isTrusted&&selectedTab())void act('show',{tabId:state.tab});});
  $('close-human').addEventListener('click',e=>{if(!e.isTrusted||!selected()?.closable||!selectedTab())return;const tabId=state.tab;confirm('关闭我的页面？','未保存的内容可能丢失。只关闭当前选择的页面。',()=>act('close-human',{tabId}));});
  $('reconnect').addEventListener('click',e=>{if(!e.isTrusted)return;if(port){port.disconnect();port=null;}connect();});
  window.addEventListener('focus',()=>{if(!port)connect();});window.addEventListener('pagehide',()=>{clearTimeout(timer);port?.disconnect();});connect();
})();
