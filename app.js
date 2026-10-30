'use strict';
var SELLER = 'https://seller.tadadelivery.com.ec/v2/pending-orders';
var LS = 'tadapocs_ios';
var S = { pocs: [], q: '', sup: '', ver: false, pin: '', notesOpen: {} };
var $ = function(id){ return document.getElementById(id); };
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function norm(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function keyName(s){ return norm(s).replace(/\b(poc|tada|nuevo)\b/g,' ').replace(/\s+/g,'').replace(/(.)\1+/g,'$1'); }
function cleanName(s){ s=String(s||'').replace(/^\s*(tada|poc)\s+/i,'').trim(); if(s===s.toUpperCase())s=s.toLowerCase().replace(/(^|\s)\S/g,function(m){return m.toUpperCase();}); return s; }

// obfuscación ligera (XOR+base64) para no guardar la clave en texto plano en el teléfono
function ob(t){ if(!t)return ''; var k='TaDaPOCs', o=''; for(var i=0;i<t.length;i++)o+=String.fromCharCode(t.charCodeAt(i)^k.charCodeAt(i%k.length)); try{return 'x:'+btoa(unescape(encodeURIComponent(o)));}catch(e){return '';} }
function unob(e){ if(!e)return ''; if(e.indexOf('x:')!==0)return e; try{ var o=decodeURIComponent(escape(atob(e.slice(2)))), k='TaDaPOCs', t=''; for(var i=0;i<o.length;i++)t+=String.fromCharCode(o.charCodeAt(i)^k.charCodeAt(i%k.length)); return t; }catch(e2){return '';} }

function load(){ try{ var d=JSON.parse(localStorage.getItem(LS)); if(d){ S.pocs=d.pocs||[]; S.sup=d.sup||''; S.ver=!!d.ver; S.pin=d.pin||''; } }catch(e){} }
function save(){ try{ localStorage.setItem(LS, JSON.stringify({pocs:S.pocs,sup:S.sup,ver:S.ver,pin:S.pin})); }catch(e){} }
function poc(n){ for(var i=0;i<S.pocs.length;i++) if(S.pocs[i].name===n) return S.pocs[i]; return null; }
function sups(){ var m={}; S.pocs.forEach(function(p){ m[p.sup]=1; }); return Object.keys(m).sort(); }
function toast(t){ var e=$('toast'); e.textContent=t; e.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(function(){ e.classList.remove('on'); },1700); }
function copy(t,msg){
  function fb(){ var a=document.createElement('textarea'); a.value=t; a.style.position='fixed'; a.style.opacity='0'; document.body.appendChild(a); a.focus(); a.setSelectionRange(0,a.value.length); a.select(); try{document.execCommand('copy');}catch(e){} a.remove(); }
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(function(){toast(msg||'Copiado');},fb); } else { fb(); toast(msg||'Copiado'); }
}

// ---------- bloqueo opcional con PIN ----------
function start(){
  load();
  if(S.pin){ renderLock(); } else { renderMain(); }
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(function(){}); }
}
function renderLock(){
  $('app').innerHTML='<div class="lock"><div class="logo">TaDa</div><p style="color:var(--mut)">Escribe tu PIN</p>'+
    '<input id="pk" type="tel" inputmode="numeric" maxlength="8" autofocus><div id="pe" style="color:var(--bad);font-weight:700;min-height:20px"></div></div>';
  var go=function(){ if($('pk').value===S.pin){ renderMain(); } else { $('pe').textContent='PIN incorrecto'; $('pk').value=''; } };
  $('pk').addEventListener('input',function(){ if($('pk').value.length>=S.pin.length) setTimeout(go,120); });
}

// ---------- principal ----------
function renderMain(){
  var ss=sups();
  $('app').innerHTML=
    '<div class="top"><h1>TaDa · POCs</h1><button id="bMenu">⋯</button></div>'+
    '<div class="wrap">'+
      (S.pocs.length?'<div class="tip">📱 El seller recuerda <b>una cuenta a la vez</b>. Para cambiar de POC: en el seller cierra sesión (o usa una pestaña privada), copia el usuario y la contraseña de la tarjeta y entra.</div>':'')+
      '<div class="bar"><input id="q" placeholder="Buscar POC, ciudad o dueño" value="'+esc(S.q)+'" autocapitalize="off"></div>'+
      (ss.length>1?'<div class="chips"><span class="chip '+(!S.sup?'on':'')+'" data-s="">Todos</span>'+ss.map(function(s){return '<span class="chip '+(S.sup===s?'on':'')+'" data-s="'+esc(s)+'">'+esc(s)+'</span>';}).join('')+'</div>':'')+
      '<div id="grid"></div>'+
    '</div>';
  $('bMenu').onclick=menu;
  $('q').oninput=function(){ S.q=this.value; drawCards(); };
  var cs=document.querySelectorAll('[data-s]'); for(var i=0;i<cs.length;i++) cs[i].onclick=function(){ S.sup=this.getAttribute('data-s'); save(); renderMain(); };
  drawCards();
}
function shown(){ var q=norm(S.q); return S.pocs.filter(function(p){ return (!S.sup||p.sup===S.sup)&&(!q||norm(p.name+' '+p.ciudad+' '+p.dueno).indexOf(q)>=0); }); }
function drawCards(){
  var list=shown(), g=$('grid'); if(!g) return;
  if(!S.pocs.length){ g.innerHTML='<div class="empty"><div class="big">Aún no hay POCs</div>Toca ⋯ arriba y elige <b>Importar Excel de POCs</b> para cargar tus POCs con su usuario y contraseña.</div>'; return; }
  if(!list.length){ g.innerHTML='<div class="empty">No hay POCs con ese filtro.</div>'; return; }
  g.innerHTML=list.map(function(p){ var i=S.pocs.indexOf(p), ver=S.ver, clave=unob(p.clave);
    return '<div class="card"><div class="ch"><b>'+esc(p.name)+'</b><div class="s">'+esc(p.sup||'')+(p.ciudad?' · '+esc(p.ciudad):'')+(p.dueno?' · Dueño: '+esc(p.dueno):'')+'</div></div>'+
      '<div class="pin"><div class="muted">📌 Recordatorio de acceso</div>'+
      '<div class="r"><span class="l">Usuario BEES</span><span class="val">'+(p.usuario?esc(p.usuario):'<i class="muted">sin usuario</i>')+'</span>'+(p.usuario?'<button class="mini" data-cu="'+i+'">Copiar</button>':'')+'</div>'+
      '<div class="r"><span class="l">Contraseña</span><span class="val">'+(clave?(ver?esc(clave):'••••••••'):'<i class="muted">sin contraseña</i>')+'</span>'+
      (clave?'<button class="mini" data-v="'+i+'">'+(ver?'Ocultar':'Ver')+'</button><button class="mini" data-ck="'+i+'">Copiar</button>':'')+'</div></div>'+
      '<div class="acts"><a class="btn p" href="'+esc(SELLER)+'" target="_blank" rel="noopener">Abrir Pedidos actuales</a><button class="btn" data-n="'+i+'">Notas</button><button class="btn" data-e="'+i+'">Editar</button></div>'+
      '<div class="notes'+(S.notesOpen[p.name]?' on':'')+'" id="n'+i+'"><textarea id="t'+i+'" placeholder="Notas de este POC">'+esc(p.notas||'')+'</textarea>'+
      '<div style="display:flex;gap:8px;margin-top:8px"><button class="btn p" data-g="'+i+'">Guardar notas</button></div></div></div>';
  }).join('');
  bind(g,'[data-cu]',function(p){ copy(p.usuario,'Usuario de '+p.name+' copiado'); });
  bind(g,'[data-ck]',function(p){ copy(unob(p.clave),'Contraseña de '+p.name+' copiada'); });
  bind(g,'[data-v]',function(p){ S.ver=!S.ver; save(); drawCards(); });
  bind(g,'[data-n]',function(p,el){ S.notesOpen[p.name]=!S.notesOpen[p.name]; var n=$('n'+S.pocs.indexOf(p)); if(n)n.classList.toggle('on'); });
  bind(g,'[data-g]',function(p,el){ var t=$('t'+S.pocs.indexOf(p)); p.notas=t.value; save(); toast('Notas guardadas'); });
  bind(g,'[data-e]',function(p){ editCred(p); });
}
function bind(root,sel,fn){ var es=root.querySelectorAll(sel); for(var i=0;i<es.length;i++){ (function(el){ var idx=+el.getAttribute(sel.replace(/[\[\]]/g,'')); el.onclick=function(){ fn(S.pocs[idx],el); }; })(es[i]); } }

// ---------- editar acceso ----------
function sheet(html){ $('sheetIn').innerHTML=html; $('sheet').classList.add('on'); }
function closeSheet(){ $('sheet').classList.remove('on'); }
$('sheet') && ($('sheet').onclick=function(e){ if(e.target.id==='sheet') closeSheet(); });
function editCred(p){
  sheet('<h3>Acceso de '+esc(p.name)+'</h3>'+
    '<label>Usuario (correo) BEES</label><input id="eu" value="'+esc(p.usuario||'')+'" autocapitalize="off">'+
    '<label>Contraseña BEES</label><input id="ek" value="'+esc(unob(p.clave))+'" autocapitalize="off">'+
    '<div class="row2"><button class="btn p" id="eg">Guardar</button><button class="btn" id="ex">Cancelar</button></div>');
  $('eg').onclick=function(){ p.usuario=$('eu').value.trim(); p.clave=ob($('ek').value); save(); closeSheet(); drawCards(); toast('Acceso guardado'); };
  $('ex').onclick=closeSheet;
}

// ---------- menú ----------
function menu(){
  sheet('<h3>Menú</h3>'+
    '<button class="btn p" id="mImp" style="width:100%;margin-bottom:8px">Importar Excel de POCs</button>'+
    '<button class="btn" id="mAdd" style="width:100%;margin-bottom:8px">Agregar POC</button>'+
    '<button class="btn" id="mPin" style="width:100%;margin-bottom:8px">'+(S.pin?'Quitar PIN':'Poner PIN de bloqueo')+'</button>'+
    '<button class="btn" id="mHelp" style="width:100%;margin-bottom:8px">Cómo se usa</button>'+
    '<button class="btn" id="mX" style="width:100%">Cerrar</button>'+
    '<input type="file" id="fx" accept=".xlsx,.xls" style="display:none">');
  $('mX').onclick=closeSheet;
  $('mImp').onclick=function(){ $('fx').click(); };
  $('fx').onchange=function(){ if(this.files[0]) readExcel(this.files[0]); };
  $('mAdd').onclick=addPoc;
  $('mPin').onclick=function(){ if(S.pin){ S.pin=''; save(); closeSheet(); toast('PIN quitado'); } else { var p=prompt('Escribe un PIN de 4 a 8 números:'); if(p&&/^[0-9]{4,8}$/.test(p)){ S.pin=p; save(); closeSheet(); toast('PIN activado'); } else if(p!=null){ alert('El PIN debe tener de 4 a 8 números.'); } } };
  $('mHelp').onclick=function(){ sheet('<h3>Cómo se usa</h3><p style="line-height:1.5">'+
    '• <b>Importar Excel</b>: carga tus POCs con usuario y contraseña BEES (columnas Title, Correo Bees, Contraseña Bees, Dueño Poc, Equipo).<br><br>'+
    '• Cada tarjeta tiene el <b>recordatorio</b> de usuario y contraseña, con Copiar y Ver.<br><br>'+
    '• <b>Abrir Pedidos actuales</b> abre el seller. En el iPhone es una sesión a la vez: para cambiar de POC, cierra sesión en el seller o usa una pestaña privada de Safari, y copia el usuario y la contraseña de la tarjeta.<br><br>'+
    '• Los datos se guardan <b>solo en este iPhone</b>.</p><button class="btn p" style="width:100%" onclick="document.getElementById(\'sheet\').classList.remove(\'on\')">Entendido</button>'); };
}
function addPoc(){
  sheet('<h3>Agregar POC</h3>'+
    '<label>Nombre del POC</label><input id="an">'+
    '<label>Supervisor</label><input id="as">'+
    '<label>Ciudad</label><input id="ac">'+
    '<div class="row2"><button class="btn p" id="ag">Agregar</button><button class="btn" id="ax">Cancelar</button></div>');
  $('ax').onclick=closeSheet;
  $('ag').onclick=function(){ var n=$('an').value.trim(); if(!n||poc(n)){ alert('Nombre vacío o repetido'); return; }
    S.pocs.push({name:n,sup:$('as').value.trim()||'Sin supervisor',ciudad:$('ac').value.trim(),dueno:'',usuario:'',clave:'',notas:''});
    S.pocs.sort(function(a,b){return norm(a.name).localeCompare(norm(b.name));}); save(); closeSheet(); renderMain(); toast('Agregué '+n); };
}

// ---------- importar Excel (en el teléfono) ----------
function col(h,re,not){ for(var i=0;i<h.length;i++) if(re.test(h[i])&&!(not&&not.test(h[i]))) return i; return -1; }
function mapSup(v){ v=String(v||'').trim(); if(!v||v.indexOf('@')>=0)return ''; var k=sups().filter(function(x){return x&&x!=='Sin supervisor'&&x.indexOf('@')<0;}); for(var i=0;i<k.length;i++) if(norm(k[i]).indexOf(norm(v))===0) return k[i]; return v; }
function matchPoc(raw){ var k=keyName(raw); if(!k)return null; for(var i=0;i<S.pocs.length;i++) if(keyName(S.pocs[i].name)===k) return S.pocs[i];
  if(k.length>=4){ var c=S.pocs.filter(function(x){ var a=keyName(x.name); return a.indexOf(k)>=0||(a.length>=4&&k.indexOf(a)>=0); }); if(c.length===1) return c[0]; } return null; }
function readExcel(file){
  toast('Leyendo Excel…');
  var fr=new FileReader();
  fr.onload=function(){
    try{
      var wb=XLSX.read(new Uint8Array(fr.result),{type:'array'}), done=0, nuevos=[];
      wb.SheetNames.forEach(function(n){
        var rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:'',raw:false});
        var hi=-1; for(var r=0;r<Math.min(10,rows.length);r++){ if(rows[r].some(function(c){return /contrasena|clave/.test(norm(c));})){ hi=r; break; } }
        if(hi<0)return;
        var h=rows[hi].map(norm);
        var cN=col(h,/^(title|titulo|poc|pocs|poc name|nombre poc|nombre del poc|punto|tienda)$/); if(cN<0)cN=col(h,/poc/,/dueno|propietario|correo|contrasena|clave|usuario|supervisor|codigo|id/);
        var cC=col(h,/correo.*bees|bees.*correo/); if(cC<0)cC=col(h,/^(correo|usuario|usuario bees|user)$/);
        var cK=col(h,/(contrasena|clave|password).*bees|bees.*(contrasena|clave|password)/); if(cK<0)cK=col(h,/^(contrasena|clave|password)$/);
        var cD=col(h,/dueno|propietario/), cS=col(h,/^(equipo|supervisor)$/), cCi=col(h,/^ciudad$/);
        if(cN<0||(cC<0&&cK<0))return;
        var g=function(x,i){ return i>=0&&i<x.length?String(x[i]||'').trim():''; };
        for(var r2=hi+1;r2<rows.length;r2++){
          var x=rows[r2], raw=g(x,cN); if(!raw||h.indexOf(norm(raw))>=0)continue;
          var usuario=g(x,cC), clave=cK>=0&&cK<x.length?String(x[cK]):'';
          if(!usuario&&!clave)continue;
          var sup=mapSup(g(x,cS)), dueno=g(x,cD), p=matchPoc(raw);
          if(!p){ p={name:cleanName(raw),sup:sup||'Sin supervisor',ciudad:g(x,cCi),dueno:'',usuario:'',clave:'',notas:''}; S.pocs.push(p); nuevos.push(p.name); }
          else { if(sup&&(!p.sup||p.sup==='Sin supervisor'))p.sup=sup; if(!p.ciudad)p.ciudad=g(x,cCi); }
          if(dueno)p.dueno=dueno; if(usuario)p.usuario=usuario; if(clave)p.clave=ob(clave);
          done++;
        }
      });
      S.pocs.sort(function(a,b){return norm(a.name).localeCompare(norm(b.name));}); save(); closeSheet(); renderMain();
      alert(done? ('Listo: cargué usuario y contraseña de '+done+' POCs.'+(nuevos.length?'\nNuevos: '+nuevos.join(', '):'')) : 'No encontré columnas de POC / Correo Bees / Contraseña Bees en ese archivo.');
    }catch(e){ alert('No pude leer el Excel: '+e.message); }
  };
  fr.readAsArrayBuffer(file);
}
start();
