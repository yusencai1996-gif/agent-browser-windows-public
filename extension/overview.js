/* Trusted management page. Data stays in memory and is rendered as text. */
(() => {
  const $=id=>document.getElementById(id);
  const state={rows:[],selected:null,tab:null,generation:null,visible:false,busy:false,external:false};
  const pending=new Map(),images=new Map();let port,timer,seq=0,revision=0,confirmAction;
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
    const focus=document.activeElement?.dataset.row;
    $('count').textContent=String(state.rows.length);$('tasks').replaceChildren();
    if(!state.rows.length)$('tasks').append(text('p','还没有工作窗口。可以创建自己的窗口。'));
    for(const r of state.rows){
      const button=document.createElement('button');button.className='task';button.dataset.row=r.id;button.setAttribute('aria-current',String(r.id===state.selected));
      const mini=text('span','选择后预览','mini');const current=r.tabs.find(t=>t.id===r.current)||r.tabs[0],cached=current&&images.get(imageKey(current));
      if(cached?.image){const img=document.createElement('img');img.src=cached.image;img.alt='最近页面预览';mini.replaceChildren(img);}
      const info=document.createElement('span');info.append(text('strong',r.name),text('small',`${r.human?(r.closable?'人类窗口':'ABW未认领'):labels[r.state]||'状态未知'} · ${r.tabs.length} 个标签`));button.append(mini,info);$('tasks').append(button);
      if(focus===r.id)button.focus();
    }
    $('task-title').textContent=row?.name||'选择一个窗口';$('task-status').textContent=row?(row.human?(row.closable?'人类窗口 · 未分配给ABW':'未分配给ABW · 不推断外部状态'):labels[row.state]||'状态未知'):'没有可显示的任务';
    $('takeover').hidden=!row||row.human||row.revoked;$('takeover').disabled=state.busy||!row||['pending','unconfirmed'].includes(row.state);
    $('takeover').textContent=row?.state==='human'?'交还此任务':'接管此任务';
    $('tabs').replaceChildren();for(const t of row?.tabs||[]){const b=text('button',t.title||'未命名页面');b.dataset.tab=String(t.id);b.setAttribute('aria-current',String(t.id===state.tab));$('tabs').append(b);}
    $('show').disabled=!tab||state.busy;$('close-human').hidden=!row?.closable;$('close-human').disabled=!tab||state.busy;
    $('page-title').textContent=tab?`${tab.title} · ${tab.origin}`:'暂无标签';
    $('external-note').textContent=state.external?'OpenCLI状态未知；接管按钮只暂停ABW，请先结束OpenCLI操作。':'';
    paint();
  }
  function paint(){const tab=selectedTab(),cache=tab&&images.get(imageKey(tab));for(const button of document.querySelectorAll('.task')){const row=state.rows.find(r=>r.id===button.dataset.row),current=row?.tabs.find(t=>t.id===row.current)||row?.tabs[0],small=current&&images.get(imageKey(current));if(small?.image){const img=document.createElement('img');img.src=small.image;img.alt='最近页面预览';button.querySelector('.mini').replaceChildren(img);}} $('image').hidden=!cache?.image;$('placeholder').hidden=!!cache?.image;if(cache?.image)$('image').src=cache.image;else{$('image').removeAttribute('src');$('placeholder').textContent=cache?.error||'选择页面后加载预览';}
    $('freshness').textContent=cache?.updatedAt?`${cache.stale?'上次预览':'更新于'} ${new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Shanghai'}).format(cache.updatedAt)}${cache.error?' · '+cache.error:''}`:'只在总览可见且任务空闲时更新';
  }
  async function refresh(){
    clearTimeout(timer);if(!port||!state.visible)return;
    const version=revision;
    try{
      const data=await request('snapshot');if(version!==revision||!state.visible)return;
      if(state.generation!==data.generation){images.clear();state.generation=data.generation;state.selected=null;state.tab=null;}
      state.rows=data.tasks;state.external=data.externalBridge;
      if(!selected()){state.selected=state.rows.find(r=>!r.human&&!r.revoked&&r.tabs.length)?.id||null;state.tab=null;}
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
  $('tasks').addEventListener('click',e=>{if(!e.isTrusted)return;const b=e.target.closest('[data-row]');if(!b)return;state.selected=b.dataset.row;state.tab=selected()?.current||selected()?.tabs[0]?.id;revision++;render();schedule(0);});
  $('tabs').addEventListener('click',e=>{if(!e.isTrusted||!e.target.dataset.tab)return;state.tab=Number(e.target.dataset.tab);revision++;render();schedule(0);});
  $('takeover').addEventListener('click',e=>{if(!e.isTrusted||state.busy)return;const row=selected();if(!row||row.human||row.revoked)return;const name=row.id;if(row.state==='human')confirm('交还此任务？','交还后，这个任务可以继续操作它持有的页面。',()=>act('return',{task:name}));else confirm('接管此任务？',state.external?'这只暂停ABW。OpenCLI仍可能操作页面，请先结束它的操作。':'会先停止新指令，等待已有操作确认后再显示已接管。',()=>act('takeover',{task:name}));});
  $('confirm-action').addEventListener('click',e=>{if(!e.isTrusted)return;const action=confirmAction;confirmAction=null;$('confirm').close();void action?.();});$('cancel').onclick=()=>{$('confirm').close();confirmAction=null;};
  $('add-human').addEventListener('click',e=>{if(e.isTrusted)void act('new-human');});
  $('show').addEventListener('click',e=>{if(e.isTrusted&&selectedTab())void act('show',{tabId:state.tab});});
  $('close-human').addEventListener('click',e=>{if(!e.isTrusted||!selected()?.closable||!selectedTab())return;const tabId=state.tab;confirm('关闭我的页面？','未保存的内容可能丢失。只关闭当前选择的页面。',()=>act('close-human',{tabId}));});
  $('reconnect').addEventListener('click',e=>{if(!e.isTrusted)return;if(port){port.disconnect();port=null;}connect();});
  window.addEventListener('focus',()=>{if(!port)connect();});window.addEventListener('pagehide',()=>{clearTimeout(timer);port?.disconnect();});connect();
})();
