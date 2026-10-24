
(function(){
  "use strict";
  /* ============ 工具函数 ============ */
  function _contacts(){
    var list=[];
    try{var ls=JSON.parse(localStorage.getItem("akini_contacts")||"[]");if(Array.isArray(ls))list=ls;}catch(e){}
    if(window.akiniContacts&&window.akiniContacts.getContacts){var api=window.akiniContacts.getContacts();if(api&&api.length){var seen=new Set(list.map(function(c){return c.id}));api.forEach(function(c){if(c&&c.id&&!seen.has(c.id)){seen.add(c.id);list.push(c)}});}}
    if(list.length)return list;
    return [];
  }
  function _it(t,e){
    e=e||"";
    if(!t||"string"!=typeof t)return __akiniAvOrLine(e);
    t=t.trim();
    if(!t||t==="null"||t==="undefined")return __akiniAvOrLine(e);
    if(0===t.indexOf("<img")){var n=t.match(/src="([^"]*)"/);if(!n||!n[1])return __akiniAvOrLine(e);t=n[1]}
    return 0===t.indexOf("data:")||0===t.indexOf("http")?'<img src="'+t.replace(/"/g,"&quot;")+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':__akiniAvOrLine(t);
  }
  function _myAvatar(){var n=localStorage.getItem("akini_my_avatar");if(n==="null"||n==="undefined")n="";return n?_it(n,"🐱"):window.__akiniLineAvatarImg();}
  function _swapped(){var t=localStorage.getItem("akini_swap_avatar_pos");return"true"===t||"1"===t;}
  var SEL_KEY="akini_preview_contact_id";
  function _getUserSel(){try{return localStorage.getItem(SEL_KEY)||""}catch(e){return""}}
  function _setUserSel(id){try{localStorage.setItem(SEL_KEY,id)}catch(e){}}
  function _validId(id){return _contacts().some(function(c){return c.id===id})?id:"";}

  /* ============ 聊天预览：选择项 + 头像 同步（无闪烁，类双人模块） ============ */
  function _applyPreview(){
    var sel=document.getElementById("selectChatPreviewContact");
    var id=_validId(_getUserSel());
    if(sel&&id&&sel.value!==id){try{sel.value=id}catch(e){}}
    var contact=null;var cs=_contacts();
    for(var i=0;i<cs.length;i++){if(cs[i].id===id){contact=cs[i];break;}}
    var contactAvatar;
        if (contact && contact.avatar && String(contact.avatar).trim() && contact.avatar !== "🐰" && contact.avatar !== "null" && contact.avatar !== "undefined") {
          contactAvatar = _it(contact.avatar, window.__akAvatarPH||"");
        } else {
          // 联系人头像丢失时优先从专用键（内存/IDB 权威）恢复，再回退对方头像
          var _av = "";
          try { if (window.akiniStore && window.akiniStore.memoryGet) _av = window.akiniStore.memoryGet("akini_contact_avatar_" + (contact ? contact.id : "")) || ""; } catch (e) {}
          if (!_av) _av = localStorage.getItem("akini_contact_avatar_" + (contact ? contact.id : "")) || "";
          if (_av === "null" || _av === "undefined") _av = "";
          var _taAv = localStorage.getItem("akini_ta_avatar") || "";
          if (_taAv === "null" || _taAv === "undefined") _taAv = "";
          contactAvatar = _it(_av || _taAv, window.__akAvatarPH||"");
        }
    var myAv=(window.getMyAvatar||_myAvatar)();var sw=_swapped();
    var leftA=document.getElementById("previewAvatarLeft");var rightA=document.getElementById("previewAvatarRight");
    var wantLeft=sw?contactAvatar:myAv;var wantRight=sw?myAv:contactAvatar;
    if(leftA&&leftA.innerHTML!==wantLeft)leftA.innerHTML=wantLeft;
    if(rightA&&rightA.innerHTML!==wantRight)rightA.innerHTML=wantRight;
  }
  window._akiniApplyPreview=_applyPreview;
  document.addEventListener("DOMContentLoaded",function(){
    var sel=document.getElementById("selectChatPreviewContact");
    if(sel){
      sel.addEventListener("change",function(){_setUserSel(sel.value);_applyPreview();});
      new MutationObserver(function(){_applyPreview();}).observe(sel,{childList:true,subtree:true});
    }
    ["previewAvatarLeft","previewAvatarRight"].forEach(function(eid){
      var el=document.getElementById(eid);
      if(el)new MutationObserver(function(){_applyPreview();}).observe(el,{childList:true,subtree:true});
    });
    _applyPreview();
  });
  setInterval(function(){
    if(document.hidden) return;
    var ba=document.getElementById("beautifyArea");
    if(!ba || ba.style.display==="none") return;
    _applyPreview();
  },3000);

  /* ============ 聊天：进入即滚到底部 + 清除残留输入状态 ============ */
  function _activeChatId(){return window.akiniContacts?window.akiniContacts.getActiveChatId():null;}
  function _chatVisible(){var c=document.getElementById("app-chat");return!!(c&&c.style.display!=="none");}
  function _scrollBottom(){var U=document.getElementById("chatBody");if(U){var nb=U.scrollHeight-U.scrollTop-U.clientHeight<120;if(nb)U.scrollTop=U.scrollHeight;}}
  // 多次延时滚动，覆盖异步恢复（IDB 读取）完成时机
  function _scrollBottomRobust(){
    _scrollBottom();
    setTimeout(_scrollBottom,50);setTimeout(_scrollBottom,150);setTimeout(_scrollBottom,350);setTimeout(_scrollBottom,700);setTimeout(_scrollBottom,1200);
  }
  function _clearStaleTyping(){
    var U=document.getElementById("chatBody");if(!U)return;
    var ac=_activeChatId();
    var typing=window.__akiniTypingMap&&ac?window.__akiniTypingMap[ac]:null;
    if(typing&&typing.timer)return; // 正在输入中，保留
    U.querySelectorAll('[id^="typingBubbleRow_"]').forEach(function(el){el.remove();});
    if(window.__akiniTypingMap&&ac){delete window.__akiniTypingMap[ac];}
  }
  if(window.openChat){
    var _origOpenChat=window.openChat;
    window.openChat=function(){var r=_origOpenChat.apply(this,arguments);_scrollBottomRobust();setTimeout(_clearStaleTyping,60);return r;};
  }
  // 进入聊天页（showPage('chat')）时也确保滚动
  if(window.showPage){
    var _origShowPage=window.showPage;
    window.showPage=function(t){var r=_origShowPage.apply(this,arguments);if(t==="chat"){_scrollBottomRobust();setTimeout(_clearStaleTyping,80);}return r;};
  }
  document.addEventListener("DOMContentLoaded",function(){
    var U=document.getElementById("chatBody");
    if(U){var t=null;new MutationObserver(function(){if(!_chatVisible())return;if(t)clearTimeout(t);t=setTimeout(_scrollBottom,80);}).observe(U,{childList:true,subtree:true});}
  });
  // 重渲染后（watchdog 触发）若在聊天页，重新滚到底部
  if(window.reRenderAll){
    var _origReRender=window.reRenderAll;
    window.reRenderAll=function(){var r=_origReRender.apply(this,arguments);if(_chatVisible())_scrollBottomRobust();return r;};
  }
  setInterval(function(){if(_chatVisible())_clearStaleTyping();},2000);

  /* ============ 强制保存：聊天记录（剔除输入气泡）/ icity ============ */
  function _stripTyping(html){var d=document.createElement("div");d.innerHTML=html;d.querySelectorAll('[id^="typingBubbleRow_"]').forEach(function(el){el.remove();});return d.innerHTML;}
  // 记录上次保存的聊天内容签名，避免无变化时重复做昂贵的序列化/写入
  var _lastChatSig="";
  var _saveChatTimer=null;
  function _scheduleSaveChat(delay){
    if(_saveChatTimer)return;
    _saveChatTimer=setTimeout(function(){
      _saveChatTimer=null;_saveChat();
    },delay||1500);
  }
  function _saveChat(){
    try{
      var U=document.getElementById("chatBody");var ac=_activeChatId();
      if(!U||!ac||window._restoringChatHistory||window._restoringData)return;
      var html=U.innerHTML||"";if(!html.trim())return;
      var d=U.getAttribute("data-rendered-chat-id");if(d!==ac)return;
      html=_stripTyping(html);
      // 防止把「恢复出的旧/较短快照」覆盖掉本地更长的真实数据：若已存数据明显更长则跳过本次保存
      try{
        var _existing=localStorage.getItem("akini_chat_history_"+ac)||"";
        if(_existing&&_existing.length>html.length+200)return;
        // 行数对比更可靠：已存记录的消息行数更多时绝不覆盖（防回信/切页时旧快照覆盖真实记录）
        if(_existing&&window.__akiniCountMsgRows){
          var _er=window.__akiniCountMsgRows(_existing),_nr=window.__akiniCountMsgRows(html);
          if(_er>_nr)return;
        }
      }catch(e){}
      // 变化检测：内容未变则跳过，避免高频定时器造成卡顿
      var sig=ac+"#"+html.length+"#"+(html.charCodeAt(html.length-1)||0);
      if(sig===_lastChatSig)return;
      _lastChatSig=sig;
      // DOM 是唯一数据源：直接持久化当前内容，禁止与旧快照拼接（拼接会导致消息重复）
      // 含 base64 图片的大内容只写 IndexedDB（异步、不阻塞主线程），避免 localStorage 同步写入卡顿/超限
      var hasBig=html.indexOf("data:image")>=0&&html.length>200000;
      if(!hasBig){
        try{localStorage.setItem("akini_chat_history_"+ac,html);localStorage.setItem("akini_chat_history_backup_"+ac,html);}catch(e){}
      }
      /* 防吞消息：备份键绝不只走 IDB 异步路径——IDB 事务若因切后台/闪退被系统回收，
         LS 主键已同步落盘但备份键缺失，重启时从备份恢复会拿到残缺记录。
         即便 hasBig 也至少把备份键同步写 LS（≤5MB 配额内尽力而为，失败静默）。
         不做行数缩减保护：备份是"最后防线"，优先保证内容完整存在 */
      try{
        if(!localStorage.getItem("akini_chat_history_backup_"+ac)){
          try{localStorage.setItem("akini_chat_history_backup_"+ac,html);}catch(e){}
        }
      }catch(e){}
      if(window._idbStore&&window._idbStore.set){window._idbStore.set("akini_chat_history_"+ac,html);window._idbStore.set("akini_chat_history_backup_"+ac,html);}
      if(window.akiniContacts&&window.akiniContacts.updateSession){window.akiniContacts.updateSession(ac,{messagesHTML:html});}
      // 同步写入快照（大内容时跳过 localStorage，仅写 IDB）
      try{
        var snap=localStorage.getItem("akini_localstorage_snapshot");
        var obj=snap?JSON.parse(snap):{};
        obj["akini_chat_history_"+ac]=html;obj["akini_chat_history_backup_"+ac]=html;
        var sjson=JSON.stringify(obj);
        if(!hasBig){try{localStorage.setItem("akini_localstorage_snapshot",sjson);}catch(e){}}
        if(window._idbStore&&window._idbStore.set)window._idbStore.set("akini_localstorage_snapshot",sjson);
      }catch(e){}
    }catch(e){console.warn("[patch] save chat",e);}
  }
  function _saveIcity(){
    try{
      // 合并内存中的 F 与 localStorage，避免旧数据覆盖新评论
      try{
        if(typeof F!=="undefined"&&F){
          var lsF=localStorage.getItem("akini_icity_diaries")||localStorage.getItem("akini_icity_diaries_backup")||"[]";
          var arrF=[];try{arrF=JSON.parse(lsF)}catch(e){arrF=[]}
          if(!Array.isArray(arrF))arrF=[];
          var map={};
          arrF.forEach(function(d){if(d&&d.id)map[d.id]=d;});
          F.forEach(function(d){if(d&&d.id){var old=map[d.id];if(old){var oc=old.comments||[];var nc=d.comments||[];var cm={};oc.forEach(function(c){var k=(c.ts||0)+"_"+(c.text||"")+"_"+(c.author||"");cm[k]=c;});nc.forEach(function(c){var k=(c.ts||0)+"_"+(c.text||"")+"_"+(c.author||"");if(!cm[k])cm[k]=c;});d.comments=Object.keys(cm).map(function(k){return cm[k];}).sort(function(a,b){return (a.ts||0)-(b.ts||0);});}map[d.id]=d;}});
          F=Object.keys(map).map(function(k){return map[k];});
          var fjson=JSON.stringify(F);
          localStorage.setItem("akini_icity_diaries",fjson);
          localStorage.setItem("akini_icity_diaries_backup",fjson);
          if(window._idbStore&&window._idbStore.set){
            window._idbStore.set("akini_icity_diaries",fjson);
            window._idbStore.set("akini_icity_diaries_backup",fjson);
          }
        }
      }catch(e){}
      var icityKeys=["akini_icity_diaries","akini_icity_diaries_backup","akini_icity_comments","akini_icity_comments_backup","akini_icity_my_nick","akini_icity_my_handle","akini_icity_my_bio","akini_icity_my_avatar","akini_icity_my_bg","akini_icity_ta_nick","akini_icity_ta_handle","akini_icity_ta_avatar","akini_icity_ta_bg"];
      for(var ki=0;ki<icityKeys.length;ki++){
        var k=icityKeys[ki];
        var val=localStorage.getItem(k);
        if(val){
          var bk=k+"_backup";
          try{localStorage.setItem(bk,val);}catch(e){}
          if(window._idbStore&&window._idbStore.set){
            window._idbStore.set(k,val);
            window._idbStore.set(bk,val);
          }
          try{var snap=localStorage.getItem("akini_localstorage_snapshot");if(snap){var o=JSON.parse(snap);o[k]=val;o[bk]=val;localStorage.setItem("akini_localstorage_snapshot",JSON.stringify(o));if(window._idbStore&&window._idbStore.set)window._idbStore.set("akini_localstorage_snapshot",JSON.stringify(o));}}catch(e){}
        }
      }
    }catch(e){}
  }
  // 低频兜底：仅在页面空闲时做一次防抖保存；切后台暂停
  function _ctTick(){ if(document.hidden) return; _scheduleSaveChat(1500); _saveIcity(); }
  var _ctIv = setInterval(_ctTick, 20000);
  function _flushAll(){_saveChat();_saveIcity();}
  document.addEventListener("visibilitychange",function(){
    if(document.hidden){
      try{ clearInterval(_ctIv); }catch(e){}
      setTimeout(_flushAll,0);
    } else {
      try{ clearInterval(_ctIv); }catch(e){}
      _ctIv = setInterval(_ctTick, 20000);
    }
  });
  window.addEventListener("beforeunload",function(){setTimeout(_flushAll,0);});
  window.addEventListener("pagehide",function(){setTimeout(_flushAll,0);});
})();
